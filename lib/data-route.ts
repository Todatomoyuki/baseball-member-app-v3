import { validateData } from "./model";
import { validateEquipmentData } from "./equipment";
import { gameKey, parseGameKey, validateStatsData, type StatsData } from "./stats";
import { validateScheduleData } from "./schedule";
import { json, readBody, renewSessionHeaders, sameOrigin } from "./server";
import { decodeData, encodeData, readSnapshot, writeChanges, synchronizeTeamSnapshot, teamScheduleMetadata, StatsPermissionError, LineupPermissionError, SchedulePermissionError, type DataScope, type ScopeData } from "./normalized-store";

const validators = { team: validateData, equipment: validateEquipmentData, stats: validateStatsData, schedule: validateScheduleData };
const labels = { team: "チーム", equipment: "道具", stats: "成績", schedule: "スケジュール" };
const conflict = () => json({ error: "別の端末で更新されています。編集中の内容を確認して、最新データを読み込んでください。" }, 409);

export function dataRoute(scope: DataScope) {
  return {
    async GET(req: Request) {
      try {
        const params = new URL(req.url).searchParams;
        const revisionParam = params.get("revision");
        const revision = revisionParam === null ? null : Number(revisionParam);
        const scheduleRevision = params.has("scheduleRevision") ? Number(params.get("scheduleRevision")) : undefined;
        if (scheduleRevision !== undefined && (!Number.isSafeInteger(scheduleRevision) || scheduleRevision < 0)) return json({ error: "更新番号が不正です。" }, 400);
        if (revision !== null && (!Number.isSafeInteger(revision) || revision < 0)) {
          return json({ error: "更新番号が不正です。" }, 400);
        }
        let snapshot = await readSnapshot(req, scope, revision === null ? undefined : { revision, mode: "changed", scheduleRevision });
        if (!snapshot) return json({ error: "ログインしてください。" }, 401);
        if (scope === "team" && snapshot.tables) {
          // Successful projections update the in-memory snapshot, avoiding a second SELECT.
          const outcome = await synchronizeTeamSnapshot(snapshot);
          if (outcome === "conflict") {
            snapshot = await readSnapshot(req, scope);
            if (!snapshot) return json({ error: "ログインしてください。" }, 401);
            if (await synchronizeTeamSnapshot(snapshot) === "conflict") return conflict();
          }
        }
        const headers = renewSessionHeaders(req);
        if (!snapshot.tables) return json({ revision: snapshot.revision, unchanged: true, member: snapshot.member }, 200, headers);
        return json({ data: decodeData(scope, snapshot.tables), revision: snapshot.revision, member: snapshot.member,
          ...(scope === "team" ? teamScheduleMetadata(snapshot) : {}) }, 200, headers);
      } catch {
        return json({ error: `${labels[scope]}データを読み込めませんでした。再試行してください。` }, 503);
      }
    },
    async PUT(req: Request) {
      if (!sameOrigin(req)) return json({ error: "リクエストを確認できません。" }, 403);
      try {
        let data: ScopeData[DataScope];
        let revision: number;
        let gameKeys: string[] | undefined;
        try {
          const input = await readBody(req);
          if (!input || !Number.isSafeInteger(input.revision) || input.revision < 0) throw new Error("Invalid revision");
          revision = input.revision;
          data = validators[scope](input.data);
          if (scope === "stats" && input.partial === true) {
            if (!Array.isArray(input.removedGames) || input.removedGames.some((key: unknown) => {
              if (typeof key !== "string") return true;
              const parsed = parseGameKey(key);
              return !parsed || gameKey(parsed.date, parsed.number) !== key;
            })) throw new Error("Invalid removed games");
            const changed = Object.keys((data as StatsData).games);
            if (input.removedGames.some((key: string) => changed.includes(key))) throw new Error("Conflicting game changes");
            gameKeys = [...new Set<string>([...changed, ...input.removedGames])];
          }
        } catch {
          return json({ error: `${labels[scope]}の入力内容・保存情報を確認してください。` }, 400);
        }
        // Authentication and the baseline read share a single SELECT. A stale
        // revision returns without scanning the domain's child tables.
        const snapshot = await readSnapshot(req, scope, { revision, mode: "matching" }, gameKeys);
        if (!snapshot) return json({ error: "再ログインしてください。" }, 401);
        if (snapshot.revision !== revision) return conflict();
        const result = await writeChanges(scope, snapshot, encodeData(scope, data));
        if (result === null) return conflict();
        if (scope === "team" && result.data) {
          snapshot.tables = encodeData("team", result.data);
          return json({ ...result, member: snapshot.member, ...teamScheduleMetadata(snapshot) }, 200, renewSessionHeaders(req));
        }
        return json(result, 200, renewSessionHeaders(req));
      } catch (error) {
        if (error instanceof StatsPermissionError || error instanceof LineupPermissionError || error instanceof SchedulePermissionError) return json({ error: error.message }, 403);
        if (error instanceof Error && /FOREIGN KEY constraint failed/i.test(error.message)) {
          return json({ error: "参照先の選手・試合がありません。最新データを読み込んでください。" }, 400);
        }
        return json({ error: `${labels[scope]}データを保存できませんでした。入力内容は画面に残っています。` }, 503);
      }
    },
  };
}
