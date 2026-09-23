import { type TeamData } from "./model";
import { type EquipmentData } from "./equipment";
import { emptyPlayerStats, gameKey, parseGameKey, type StatsData, type PlateAppearanceResult } from "./stats";
import { db, digest, random, token } from "./server";
import type { AuthMember } from "./auth-types";

export type DataScope = "team" | "equipment" | "stats";
export type ScopeData = { team: TeamData; equipment: EquipmentData; stats: StatsData };
type Cell = string | number | null;
type Row = Cell[];
type Tables = Record<string, Row[]>;
type Table = {
  name: string;
  columns: string[];
  keys: string[];
  order: string;
  filter?: string;
  retire?: boolean;
};

// SQL identifiers come only from this allowlist, never from request data.
// Parent tables precede children; removals run in the reverse order.
const tables: Record<DataScope, Table[]> = {
  team: [
    { name: "players", columns: ["id", "name", "number", "kana", "sort_order", "bench_order", "absent_order"], keys: ["id"], order: "sort_order", filter: "sort_order IS NOT NULL", retire: true },
    { name: "team_settings", columns: ["id", "team_name", "manager", "tournament", "game_date", "opponent", "mode", "pitcher_id"], keys: ["id"], order: "id" },
    { name: "name_options", columns: ["kind", "name", "sort_order"], keys: ["kind", "name"], order: "kind, sort_order" },
    { name: "lineup_slots", columns: ["batting_order", "position", "player_id"], keys: ["batting_order"], order: "batting_order" },
  ],
  equipment: [
    { name: "equipment_items", columns: ["id", "name", "holder_id", "note", "sort_order"], keys: ["id"], order: "sort_order" },
  ],
  stats: [
    { name: "stats_games", columns: ["game_date", "game_number"], keys: ["game_date", "game_number"], order: "game_date, game_number" },
    { name: "player_game_stats", columns: ["game_date", "game_number", "player_id", "rbis", "runs", "stolen_bases", "caught_stealing_attempts", "errors", "caught_stealing"], keys: ["game_date", "game_number", "player_id"], order: "game_date, game_number, player_id" },
    { name: "plate_appearances", columns: ["game_date", "game_number", "player_id", "appearance_order", "result", "scoring_position"], keys: ["game_date", "game_number", "player_id", "appearance_order"], order: "game_date, game_number, player_id, appearance_order" },
  ],
};

function snapshotSql(scope: DataScope, partitioned: boolean) {
  return `json_object(${tables[scope].map((table) =>
    `'${table.name}', (SELECT json_group_array(json_array(${table.columns.join(",")}))
      FROM (SELECT ${table.columns.join(",")} FROM ${table.name}
        ${partitioned ? "WHERE (game_date,game_number) IN (SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]') FROM json_each(?))" : table.filter ? `WHERE ${table.filter}` : ""}
        ORDER BY ${table.order}))`,
  ).join(",")})`;
}

type Snapshot = { revision: number; tables: Tables | null; sessionHash: string; member: AuthMember };

export class StatsPermissionError extends Error {
  constructor() {
    super("自分以外の選手の成績を変更できるのは管理者だけです。");
  }
}

/** One SELECT includes authentication, revision and all requested tables.
 * CASE avoids scanning child tables for unchanged polls / stale writes.
 */
export async function readSnapshot(
  req: Request,
  scope: DataScope,
  condition?: { revision: number; mode: "changed" | "matching" },
  gameKeys?: string[],
): Promise<Snapshot | null> {
  const session = token(req);
  if (!/^[a-f0-9]{64}$/.test(session)) return null;
  const predicate = condition
    ? `r.revision ${condition.mode === "changed" ? "<>" : "="} ?`
    : "1";
  const partition = scope === "stats" && gameKeys !== undefined
    ? JSON.stringify(gameKeys.map((key) => {
      const game = parseGameKey(key);
      if (!game) throw new Error("Invalid game key");
      return [game.date, game.number];
    })) : null;
  const sessionHash = await digest(session);
  const result = await db().prepare(`
    SELECT r.revision, p.id, p.name, p.number, p.is_admin,
      CASE WHEN ${predicate} THEN ${snapshotSql(scope, partition !== null)} END AS data
    FROM sessions AS s
    JOIN member_devices AS d ON d.hash=s.device_hash
    JOIN players AS p ON p.id=d.player_id AND p.sort_order IS NOT NULL
    JOIN app_revisions AS r ON r.scope=?
    WHERE s.hash=? AND (s.expires=0 OR s.expires>?)
  `).bind(
    ...(condition ? [condition.revision] : []),
    ...(partition === null ? [] : tables[scope].map(() => partition)),
    scope, sessionHash, Date.now(),
  ).first<{ revision: number; data: string | null; id: string; name: string; number: string; is_admin: number }>();
  if (!result) return null;
  return {
    revision: result.revision,
    tables: result.data === null ? null : JSON.parse(result.data) as Tables,
    sessionHash,
    member: { id: result.id, name: result.name, number: result.number, isAdmin: result.is_admin === 1 },
  };
}

export function decodeData(scope: DataScope, rows: Tables): ScopeData[DataScope] {
  if (scope === "team") {
    const settings = rows.team_settings[0];
    if (!settings) throw new Error("Team migration is incomplete");
    const players = rows.players;
    return {
      teamName: settings[1] as string,
      manager: settings[2] as string,
      tournament: settings[3] as string,
      date: settings[4] as string,
      opponent: settings[5] as string,
      mode: settings[6] as TeamData["mode"],
      pitcher: settings[7] as string | null,
      count: 9,
      tournaments: rows.name_options.filter((row) => row[0] === "tournament").map((row) => row[1] as string),
      opponents: rows.name_options.filter((row) => row[0] === "opponent").map((row) => row[1] as string),
      players: players.map((row) => ({ id: row[0] as string, name: row[1] as string, number: row[2] as string, kana: row[3] as string })),
      slots: rows.lineup_slots.map((row) => ({ position: row[1] as TeamData["slots"][number]["position"], playerId: row[2] as string | null })),
      benchOrder: players.filter((row) => row[5] !== null).sort((a, b) => Number(a[5]) - Number(b[5])).map((row) => row[0] as string),
      absentIds: players.filter((row) => row[6] !== null).sort((a, b) => Number(a[6]) - Number(b[6])).map((row) => row[0] as string),
    } satisfies TeamData;
  }
  if (scope === "equipment") {
    return {
      items: rows.equipment_items.map((row) => ({ id: row[0] as string, name: row[1] as string, holderId: row[2] as string | null, note: row[3] as string })),
    } satisfies EquipmentData;
  }
  const data: StatsData = { games: {} };
  for (const row of rows.stats_games) data.games[gameKey(row[0] as string, row[1] as number)] = {};
  for (const row of rows.player_game_stats) {
    const stats = emptyPlayerStats();
    [stats.rbis, stats.runs, stats.stolenBases, stats.caughtStealingAttempts, stats.errors, stats.caughtStealing] = row.slice(3) as number[];
    data.games[gameKey(row[0] as string, row[1] as number)][row[2] as string] = stats;
  }
  for (const row of rows.plate_appearances) {
    const stats = data.games[gameKey(row[0] as string, row[1] as number)][row[2] as string];
    stats.plateAppearances[row[3] as number] = row[4] as PlateAppearanceResult | null;
    stats.scoringPosition[row[3] as number] = row[5] === 1;
  }
  return data;
}

function encodeTeam(data: TeamData): Tables {
  const order = (ids: string[], id: string) => {
    const index = ids.indexOf(id);
    return index < 0 ? null : index;
  };
  return {
    players: data.players.map((player, index) => [player.id, player.name, player.number, player.kana, index, order(data.benchOrder, player.id), order(data.absentIds, player.id)]),
    team_settings: [[1, data.teamName, data.manager, data.tournament, data.date, data.opponent, data.mode, data.pitcher]],
    name_options: [
      ...Array.from(new Set(data.tournaments), (name, index) => ["tournament", name, index]),
      ...Array.from(new Set(data.opponents), (name, index) => ["opponent", name, index]),
    ] as Row[],
    lineup_slots: data.slots.map((slot, index) => [index, slot.position, slot.playerId]),
  };
}

function encodeStats(data: StatsData): Tables {
  const rows: Tables = { stats_games: [], player_game_stats: [], plate_appearances: [] };
  for (const [key, game] of Object.entries(data.games)) {
    const parsed = parseGameKey(key);
    if (!parsed) throw new Error("Invalid game key");
    const { date, number } = parsed;
    rows.stats_games.push([date, number]);
    for (const [playerId, stats] of Object.entries(game)) {
      rows.player_game_stats.push([date, number, playerId, stats.rbis, stats.runs, stats.stolenBases, stats.caughtStealingAttempts, stats.errors, stats.caughtStealing]);
      stats.plateAppearances.forEach((result, index) => {
        rows.plate_appearances.push([date, number, playerId, index, result, stats.scoringPosition[index] ? 1 : 0]);
      });
    }
  }
  return rows;
}

export function encodeData(scope: DataScope, data: ScopeData[DataScope]): Tables {
  if (scope === "team") return encodeTeam(data as TeamData);
  if (scope === "stats") return encodeStats(data as StatsData);
  return { equipment_items: (data as EquipmentData).items.map((item, index) => [item.id, item.name, item.holderId, item.note, index]) };
}

/** Diff on the server against its authenticated snapshot, never a client-claimed baseline. */
export async function writeChanges(scope: DataScope, snapshot: Snapshot, next: Tables): Promise<number | null> {
  if (!snapshot.tables) return null;
  const previous = snapshot.tables;
  const changes = tables[scope].map((table) => {
    const key = (row: Row) => JSON.stringify(table.keys.map((column) => row[table.columns.indexOf(column)]));
    const oldRows = new Map(previous[table.name].map((row) => [key(row), row]));
    const newRows = new Map(next[table.name].map((row) => [key(row), row]));
    return {
      table,
      upsert: [...newRows].filter(([id, row]) => JSON.stringify(oldRows.get(id)) !== JSON.stringify(row)).map(([, row]) => row),
      remove: [...oldRows].filter(([id]) => !newRows.has(id)).map(([, row]) => table.keys.map((column) => row[table.columns.indexOf(column)])),
    };
  });
  if (scope === "stats") {
    if (!snapshot.member.isAdmin) {
      // Check every changed row before pruning cascading deletes. A removed
      // game must not silently delete another member's records.
      const playerId = snapshot.member.id;
      if (changes.slice(1).some((change) =>
        [...change.upsert, ...change.remove].some((row) => row[2] !== playerId),
      )) throw new StatsPermissionError();
      const ownGames = new Set(
        [...previous.player_game_stats, ...next.player_game_stats]
          .filter((row) => row[2] === playerId)
          .map((row) => JSON.stringify(row.slice(0, 2))),
      );
      if ([...changes[0].upsert, ...changes[0].remove].some((row) => !ownGames.has(JSON.stringify(row)))) {
        throw new StatsPermissionError();
      }
    }
    // Parent deletes already cascade through the composite foreign keys.
    // Avoid issuing separate deletes for every descendant table in that case.
    const removedGames = new Set(changes[0].remove.map((key) => JSON.stringify(key)));
    const removedPlayers = new Set(changes[1].remove.map((key) => JSON.stringify(key)));
    changes[2].remove = changes[2].remove.filter((key) =>
      !removedGames.has(JSON.stringify(key.slice(0, 2))) &&
      !removedPlayers.has(JSON.stringify(key.slice(0, 3))),
    );
    changes[1].remove = changes[1].remove.filter((key) => !removedGames.has(JSON.stringify(key.slice(0, 2))));
  }
  if (changes.every((change) => change.upsert.length === 0 && change.remove.length === 0)) return snapshot.revision;

  const database = db();
  const writeToken = random();
  // Every mutation is gated by this unique token. Checking revision+1 alone
  // would allow a failed CAS to overwrite the other writer's successful save.
  const guard = "EXISTS (SELECT 1 FROM app_revisions WHERE scope=? AND write_token=?)";
  const statements = [database.prepare(`
    UPDATE app_revisions SET revision=revision+1, write_token=?
    WHERE scope=? AND revision=? AND EXISTS (
      SELECT 1 FROM sessions AS s
      JOIN member_devices AS d ON d.hash=s.device_hash
      JOIN players AS p ON p.id=d.player_id
      WHERE s.hash=? AND (s.expires=0 OR s.expires>?)
        AND p.id=? AND p.sort_order IS NOT NULL AND (p.is_admin=1)=?
    ) RETURNING revision
  `).bind(writeToken, scope, snapshot.revision, snapshot.sessionHash, Date.now(), snapshot.member.id, snapshot.member.isAdmin ? 1 : 0)];

  for (const { table, upsert } of changes) {
    if (!upsert.length) continue;
    const mutable = table.columns.filter((column) => !table.keys.includes(column));
    statements.push(database.prepare(`
      INSERT INTO ${table.name} (${table.columns.join(",")})
      SELECT ${table.columns.map((_, index) => `json_extract(value,'$[${index}]')`).join(",")}
      FROM json_each(?) WHERE ${guard}
      ON CONFLICT (${table.keys.join(",")}) DO ${mutable.length ? `UPDATE SET
        ${mutable.map((column) => `${column}=excluded.${column}`).join(",")}
        WHERE ${mutable.map((column) => `${table.name}.${column} IS NOT excluded.${column}`).join(" OR ")}` : "NOTHING"}
    `).bind(JSON.stringify(upsert), scope, writeToken));
  }

  for (const { table, remove } of [...changes].reverse()) {
    if (!remove.length) continue;
    // JSON binds keep the statement count independent of the number of rows
    // and avoid D1's per-statement bound-parameter limit.
    const keys = `(${table.keys.join(",")}) IN (
      SELECT ${table.keys.map((_, index) => `json_extract(value,'$[${index}]')`).join(",")} FROM json_each(?)
    )`;
    statements.push(database.prepare(`
      ${table.retire
        ? `UPDATE ${table.name} SET sort_order=NULL, bench_order=NULL, absent_order=NULL`
        : `DELETE FROM ${table.name}`}
      WHERE ${keys} AND ${guard}
    `).bind(JSON.stringify(remove), scope, writeToken));
  }

  // D1 batch is transactional: FK failures also roll back the revision change.
  const results = await database.batch<{ revision: number }>(statements);
  return results[0].results[0]?.revision ?? null;
}
