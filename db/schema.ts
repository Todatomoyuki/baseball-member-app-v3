import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const teamState = sqliteTable("team_state", {
    id: integer("id").primaryKey(),
    data: text("data").notNull(),
    revision: integer("revision").notNull().default(0),
});
export const authConfig = sqliteTable("auth_config", {
    id: integer("id").primaryKey(),
    salt: text("salt").notNull(),
    hash: text("hash").notNull(),
});
export const sessions = sqliteTable("sessions", {
    hash: text("hash").primaryKey(),
    expires: integer("expires").notNull(),
});
export const loginAttempts = sqliteTable("login_attempts", {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    until: integer("until").notNull(),
});
