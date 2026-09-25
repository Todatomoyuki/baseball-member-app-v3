import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey, foreignKey, index, check } from "drizzle-orm/sqlite-core";

// Legacy JSON backups retained by 0003_normalize_data; application reads/writes
// use the normalized tables below. Do not drop these until backups are archived.
export const teamState = sqliteTable("team_state", {
    id: integer("id").primaryKey(),
    data: text("data").notNull(),
    revision: integer("revision").notNull().default(0),
});
export const equipmentState = sqliteTable("equipment_state", {
    id: integer("id").primaryKey(),
    data: text("data").notNull(),
    revision: integer("revision").notNull().default(0),
});
export const statsState = sqliteTable("stats_state", {
    id: integer("id").primaryKey(),
    data: text("data").notNull(),
    revision: integer("revision").notNull().default(0),
});

export const appRevisions = sqliteTable("app_revisions", {
    scope: text("scope").primaryKey(),
    revision: integer("revision").notNull().default(0),
    writeToken: text("write_token").notNull().default(""),
});

export const players = sqliteTable("players", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    number: text("number").notNull(),
    kana: text("kana").notNull(),
    // Authorization belongs to the stable member ID, not the editable name.
    isAdmin: integer("is_admin").notNull().default(0),
    canEditLineup: integer("can_edit_lineup").notNull().default(0),
    // NULL retains a former member for equipment/statistics references.
    sortOrder: integer("sort_order"),
    benchOrder: integer("bench_order"),
    absentOrder: integer("absent_order"),
}, (table) => [index("players_active_sort_order_idx").on(table.sortOrder).where(sql`sort_order IS NOT NULL`)]);

export const teamSettings = sqliteTable("team_settings", {
    id: integer("id").primaryKey(),
    teamName: text("team_name").notNull(),
    manager: text("manager").notNull(),
    tournament: text("tournament").notNull(),
    gameDate: text("game_date").notNull(),
    opponent: text("opponent").notNull(),
    mode: text("mode").notNull(),
    pitcherId: text("pitcher_id").references(() => players.id),
});

export const nameOptions = sqliteTable("name_options", {
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
}, (table) => [primaryKey({ columns: [table.kind, table.name] })]);

export const lineupSlots = sqliteTable("lineup_slots", {
    battingOrder: integer("batting_order").primaryKey(),
    position: text("position").notNull(),
    playerId: text("player_id").references(() => players.id),
});

export const equipmentItems = sqliteTable("equipment_items", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    holderId: text("holder_id").references(() => players.id),
    note: text("note").notNull(),
    sortOrder: integer("sort_order").notNull(),
    notifyLine: integer("notify_line").notNull().default(1),
}, (table) => [check("equipment_items_notify_line_check", sql`${table.notifyLine} IN (0, 1)`)]);

export const statsGames = sqliteTable("stats_games", {
    gameDate: text("game_date").notNull(),
    gameNumber: integer("game_number").notNull(),
}, (table) => [primaryKey({ columns: [table.gameDate, table.gameNumber] })]);

export const playerGameStats = sqliteTable("player_game_stats", {
    gameDate: text("game_date").notNull(),
    gameNumber: integer("game_number").notNull(),
    playerId: text("player_id").notNull().references(() => players.id),
    rbis: integer("rbis").notNull().default(0),
    runs: integer("runs").notNull().default(0),
    stolenBases: integer("stolen_bases").notNull().default(0),
    caughtStealingAttempts: integer("caught_stealing_attempts").notNull().default(0),
    errors: integer("errors").notNull().default(0),
    caughtStealing: integer("caught_stealing").notNull().default(0),
}, (table) => [
    primaryKey({ columns: [table.gameDate, table.gameNumber, table.playerId] }),
    foreignKey({
        columns: [table.gameDate, table.gameNumber],
        foreignColumns: [statsGames.gameDate, statsGames.gameNumber],
    }).onDelete("cascade"),
]);

export const plateAppearances = sqliteTable("plate_appearances", {
    gameDate: text("game_date").notNull(),
    gameNumber: integer("game_number").notNull(),
    playerId: text("player_id").notNull(),
    appearanceOrder: integer("appearance_order").notNull(),
    result: text("result"),
    scoringPosition: integer("scoring_position").notNull().default(0),
}, (table) => [
    primaryKey({ columns: [table.gameDate, table.gameNumber, table.playerId, table.appearanceOrder] }),
    foreignKey({
        columns: [table.gameDate, table.gameNumber, table.playerId],
        foreignColumns: [playerGameStats.gameDate, playerGameStats.gameNumber, playerGameStats.playerId],
    }).onDelete("cascade"),
]);

export const authConfig = sqliteTable("auth_config", {
    id: integer("id").primaryKey(),
    salt: text("salt").notNull(),
    hash: text("hash").notNull(),
});
export const memberDevices = sqliteTable("member_devices", {
    hash: text("hash").primaryKey(),
    playerId: text("player_id").notNull().references(() => players.id),
});
export const sessions = sqliteTable("sessions", {
    hash: text("hash").primaryKey(),
    // 0 means no server-side expiry; existing finite sessions retain their expiry.
    expires: integer("expires").notNull(),
    deviceHash: text("device_hash").references(() => memberDevices.hash),
});
export const loginAttempts = sqliteTable("login_attempts", {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    until: integer("until").notNull(),
});
