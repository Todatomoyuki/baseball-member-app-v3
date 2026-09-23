import { initialStatsData, normalizeStatsData, validateStatsData, type StatsData } from "@/lib/stats";
import { authorized, db, json, readBody, sameOrigin } from "@/lib/server";

export const dynamic = "force-dynamic";

async function ensureStatsTable() {
  await db().prepare(`
    CREATE TABLE IF NOT EXISTS stats_state (
      id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 0
    )
  `).run();
}

export async function GET(req: Request) {
  try {
    if (!(await authorized(req))) return json({ error: "ログインしてください。" }, 401);
    await ensureStatsTable();
    let row = await db().prepare("SELECT data,revision FROM stats_state WHERE id=1").first<{ data: string; revision: number }>();
    if (!row) {
      await db().prepare("INSERT OR IGNORE INTO stats_state(id,data,revision) VALUES(1,?,0)").bind(JSON.stringify(initialStatsData())).run();
      row = await db().prepare("SELECT data,revision FROM stats_state WHERE id=1").first<{ data: string; revision: number }>();
    }
    return json({ data: normalizeStatsData(JSON.parse(row!.data) as StatsData), revision: row!.revision });
  } catch { return json({ error: "成績データを読み込めませんでした。再試行してください。" }, 503); }
}

export async function PUT(req: Request) {
  if (!sameOrigin(req)) return json({ error: "リクエストを確認できません。" }, 403);
  try {
    if (!(await authorized(req))) return json({ error: "再ログインしてください。" }, 401);
    await ensureStatsTable();
    const input = await readBody(req);
    let data: StatsData;
    try { data = validateStatsData(input.data); }
    catch { return json({ error: "成績の入力内容を確認してください。" }, 400); }
    if (!Number.isSafeInteger(input.revision) || input.revision < 0) return json({ error: "保存情報が不正です。" }, 400);
    const result = await db().prepare("UPDATE stats_state SET data=?, revision=revision+1 WHERE id=1 AND revision=? RETURNING revision").bind(JSON.stringify(data), input.revision).first<{ revision: number }>();
    if (!result) return json({ error: "別の端末で更新されています。最新データを読み込んでください。" }, 409);
    return json({ revision: result.revision });
  } catch { return json({ error: "成績データを保存できませんでした。" }, 503); }
}