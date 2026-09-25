import { z } from "zod";
import { SCHEDULE_LIMITS, upcomingSaturday } from "./schedule";
export const POSITIONS = [
    "投",
    "捕",
    "一",
    "二",
    "三",
    "遊",
    "左",
    "中",
    "右",
    "DH",
] as const;
export type Position = (typeof POSITIONS)[number];
export type LineupMode = "normal" | "dh" | "all";
export type Player = { id: string; name: string; number: string; kana: string };
export type Slot = { playerId: string | null; position: Position };
export type TeamData = {
    teamName: string;
    manager: string;
    tournament: string;
    tournaments: string[];
    date: string;
    scheduleId: string | null;
    startTime: string;
    location: string;
    mapUrl: string;
    opponent: string;
    opponents: string[];
    locations: string[];
    mode: LineupMode;
    count: number;
    players: Player[];
    slots: Slot[];
    pitcher: string | null;
    benchOrder: string[];
    absentIds: string[];
};
export const MIN_BATTING_SLOTS = 9;
export const MAX_LINEUP_PLAYERS = 30;
export const MAX_PDF_LINEUP_PLAYERS = 10;

export function lineupCapacity(data: TeamData): number {
    return data.slots.length + (data.mode === "dh" ? 1 : 0);
}

export function canExportLineupPdf(data: TeamData): boolean {
    if (data.mode === "all") return false;
    return lineupCapacity(data) <= MAX_PDF_LINEUP_PLAYERS;
}
export function nextSaturday(now = new Date()) {
    return upcomingSaturday(now);
}
export function initialData(): TeamData {
    return {
        teamName: "YGファイヤーズ",
        manager: "池原　海斗",
        tournament: "",
        tournaments: [],
        date: nextSaturday(),
        scheduleId: null,
        startTime: "",
        location: "",
        mapUrl: "",
        opponent: "",
        opponents: [],
        locations: [],
        mode: "normal",
        count: 9,
        players: [],
        slots: POSITIONS.slice(0, 9).map((position) => ({
            playerId: null,
            position,
        })),
        pitcher: null,
        benchOrder: [],
        absentIds: [],
    };
}
export function normalizeData(data: TeamData): TeamData {
    return {
        ...data,
        manager: data.manager?.trim() ? data.manager : "池原　海斗",
        tournaments: data.tournaments ?? [],
        absentIds: data.absentIds ?? [],
    };
}
export function benchPlayers(data: TeamData) {
    const active = new Set([
        ...data.slots.map((s) => s.playerId),
        data.pitcher,
        ...(data.absentIds ?? []),
    ]);
    return data.players
        .filter((p) => !active.has(p.id))
        .sort((a, b) => {
            const ai = data.benchOrder.indexOf(a.id),
                bi = data.benchOrder.indexOf(b.id);
            return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
        });
}
export function absentPlayers(data: TeamData) {
    const absent = new Set(data.absentIds ?? []);
    return data.players.filter((p) => absent.has(p.id));
}
export function changeMode(
    data: TeamData,
    mode: LineupMode,
    count = 10,
): TeamData {
    let slots = data.slots.map((slot) => ({ ...slot }));
    let pitcher = data.pitcher;

    /*
     * =========================
     * 9人制
     * =========================
     */
    if (mode === "normal") {
        if (data.mode === "dh") {
            // DH制の別枠投手を打順へ戻す
            const dhIndex = slots.findIndex((slot) => slot.position === "DH");

            if (dhIndex >= 0) {
                slots[dhIndex] = {
                    playerId: pitcher,
                    position: "投",
                };
            }

            pitcher = null;
        }

        // 全員打ちの余分なDHを削除
        slots = slots.filter((slot) => slot.position !== "DH");

        return {
            ...data,
            mode: "normal",
            count: MIN_BATTING_SLOTS,
            slots,
            pitcher: null,
        };
    }

    /*
     * =========================
     * DH制
     * 打者9人 + 投手1人 = 10人固定
     * =========================
     */
    if (mode === "dh") {
        if (data.mode === "normal") {
            const pitcherIndex = slots.findIndex(
                (slot) => slot.position === "投",
            );

            if (pitcherIndex >= 0) {
                pitcher = slots[pitcherIndex].playerId;

                slots[pitcherIndex] = {
                    playerId: null,
                    position: "DH",
                };
            }
        }

        if (data.mode === "all") {
            const pitcherIndex = slots.findIndex(
                (slot) => slot.position === "投",
            );

            if (pitcherIndex >= 0) {
                pitcher = slots[pitcherIndex].playerId;

                // 全員打ちでは投手も打順にいるので、
                // DH制へ変更すると投手を打順から外す
                slots.splice(pitcherIndex, 1);
            }
        }

        // DH制は打順9人固定
        while (slots.length > MIN_BATTING_SLOTS) {
            const index = slots.findLastIndex((slot) => slot.position === "DH");

            if (index < 0) break;

            slots.splice(index, 1);
        }

        while (slots.length < MIN_BATTING_SLOTS) {
            slots.push({
                playerId: null,
                position: "DH",
            });
        }

        return {
            ...data,
            mode: "dh",
            count: MIN_BATTING_SLOTS,
            slots,
            pitcher,
        };
    }

    /*
     * =========================
     * 全員打ち
     * 10〜30人
     * =========================
     */

    const allCount = Math.min(MAX_LINEUP_PLAYERS, Math.max(10, count));

    if (data.mode === "dh") {
        // DH制では投手が打順外なので、
        // 全員打ちにすると打順へ追加する
        slots.push({
            playerId: pitcher,
            position: "投",
        });

        pitcher = null;
    }

    // 人数を減らす場合はDHから削る
    while (slots.length > allCount) {
        const index = slots.findLastIndex((slot) => slot.position === "DH");

        if (index < 0) break;

        slots.splice(index, 1);
    }

    // 人数を増やす場合はDH枠を追加
    while (slots.length < allCount) {
        slots.push({
            playerId: null,
            position: "DH",
        });
    }

    return {
        ...data,
        mode: "all",
        count: allCount,
        slots,
        pitcher: null,
    };
}
export function swapPlayer(data: TeamData, from: string, to: string): TeamData {
    const d = structuredClone(normalizeData(data));
    const get = (key: string): string | null =>
        key === "pitcher"
            ? d.pitcher
            : key.startsWith("slot:")
              ? d.slots[Number(key.slice(5))]?.playerId
              : key.startsWith("bench:")
                ? key.slice(6)
                : key.startsWith("absent:")
                  ? key.slice(7)
                  : null;
    const a = get(from),
        b = get(to);
    if (from === to) return d;
    const put = (key: string, id: string | null) => {
        if (key === "pitcher") d.pitcher = id;
        else if (key.startsWith("slot:"))
            d.slots[Number(key.slice(5))].playerId = id;
    };
    if (from.startsWith("bench:") && to.startsWith("bench:")) {
        const list = benchPlayers(d).map((p) => p.id),
            i = list.indexOf(a!),
            j = list.indexOf(b!);
        [list[i], list[j]] = [list[j], list[i]];
        d.benchOrder = list;
        return d;
    }
    put(from, b);
    put(to, a);
    if (from.startsWith("absent:"))
        d.absentIds = d.absentIds.filter((id) => id !== a);
    if (to.startsWith("absent:"))
        d.absentIds = d.absentIds.filter((id) => id !== b);
    if (to.startsWith("absent:") && a) d.absentIds.push(a);
    if (from.startsWith("absent:") && b) d.absentIds.push(b);
    return d;
}
const short = z.string().trim().max(80);
const mapUrl = z.string().trim().max(SCHEDULE_LIMITS.mapUrl).refine((value) => {
    if (!value) return true;
    try {
        const url = new URL(value);
        return /^https?:\/\//i.test(value) && ["http:", "https:"].includes(url.protocol)
            && Boolean(url.hostname) && !url.username && !url.password;
    } catch {
        return false;
    }
}, "地図URLは http:// または https:// で始まるURLを入力してください。");
const schema = z.object({
    teamName: short.min(1),
    manager: short,
    tournament: short,
    tournaments: z.array(short.min(1)).max(200).default([]),
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine(
            (v) =>
                !isNaN(Date.parse(v)) &&
                new Date(v).toISOString().slice(0, 10) === v,
        ),
    // Required on writes so stale clients cannot clear a schedule association.
    scheduleId: z.string().trim().min(1).max(SCHEDULE_LIMITS.id).nullable(),
    startTime: z.string().trim().regex(/^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/),
    location: z.string().trim().max(SCHEDULE_LIMITS.location),
    mapUrl,
    opponent: short,
    opponents: z.array(short.min(1)).max(200),
    locations: z.array(z.string().trim().min(1).max(SCHEDULE_LIMITS.location)).max(200),
    mode: z.enum(["normal", "dh", "all"]),
    count: z
        .number()
        .int()
        .min(MIN_BATTING_SLOTS)
        .max(MAX_LINEUP_PLAYERS),
    players: z
        .array(
            z.object({
                id: z.string().uuid(),
                name: z.string().trim().min(1).max(30),
                number: z.string().regex(/^\d{1,3}$/),
                kana: z.string().trim().max(50),
            }),
        )
        .max(30),
    slots: z
        .array(
            z.object({
                playerId: z.string().uuid().nullable(),
                position: z.enum(POSITIONS),
            }),
        )
        .min(MIN_BATTING_SLOTS)
        .max(MAX_LINEUP_PLAYERS),
    pitcher: z.string().uuid().nullable(),
    benchOrder: z.array(z.string().uuid()).max(30),
    absentIds: z.array(z.string().uuid()).max(30).default([]),
});
export function validateData(input: unknown): TeamData {
    const d = schema.parse(input);
    const ids = d.players.map((p) => p.id),
        used = [
            ...d.slots.map((s) => s.playerId),
            d.pitcher,
            ...d.absentIds,
        ].filter(Boolean);
    if (
        new Set(ids).size !== ids.length ||
        new Set(used).size !== used.length ||
        used.some((id) => !ids.includes(id!))
    )
        throw new Error("選手が重複しているか、未登録です。");
   if (
  d.slots.length !== d.count ||
  (d.mode === "normal" &&
    (d.count !== 9 || d.pitcher !== null)) ||
  (d.mode === "dh" &&
    d.count !== 9) ||
  (d.mode === "all" &&
    (d.count < 10 ||
      d.count > MAX_LINEUP_PLAYERS ||
      d.pitcher !== null))
) {
  throw new Error("人数設定が一致しません。");
}
const required =
  d.mode === "dh"
    ? POSITIONS.slice(1, 9)
    : POSITIONS.slice(0, 9);    const expectedDhCount =
  d.mode === "normal"
    ? 0
    : d.mode === "dh"
      ? 1
      : d.count - 9;

if (
  required.some(
    (position) =>
      d.slots.filter((slot) => slot.position === position).length !== 1,
  ) ||
  d.slots.filter((slot) => slot.position === "DH").length !==
    expectedDhCount
) {
  throw new Error("守備位置が重複しています。");
}
    return normalizeData(d);
}
export function lineupWarnings(d: TeamData) {
    const issues: string[] = [];
    if (d.slots.some((s) => !s.playerId) || (d.mode === "dh" && !d.pitcher))
        issues.push("スターティングオーダーに未選択の選手がいます。");
    if (!d.tournament.trim()) issues.push("大会名を入力してください。");
    if (!d.opponent.trim()) issues.push("相手チーム名を入力してください。");
    if (!d.manager.trim()) issues.push("監督名を入力してください。");
    return issues;
}
