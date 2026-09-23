import { env } from "cloudflare:workers";
import type { AuthMember } from "@/lib/auth-types";
const encoder = new TextEncoder();
export function db() {
    if (!env.DB) throw new Error("保存先に接続できません。");
    return env.DB;
}
export function json(value: unknown, status = 200, headers: HeadersInit = {}) {
    const responseHeaders = new Headers(headers);
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    return Response.json(value, {
        status,
        headers: responseHeaders,
    });
}
export function sameOrigin(req: Request) {
    const origin = req.headers.get("Origin");
    return !!origin && origin === new URL(req.url).origin;
}
export async function digest(value: string) {
    const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
    return Array.from(new Uint8Array(bytes), (v) =>
        v.toString(16).padStart(2, "0"),
    ).join("");
}
export function random() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
        v.toString(16).padStart(2, "0"),
    ).join("");
}
export function equal(a: string, b: string) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}
export async function passwordHash(password: string, salt: string) {
    if (!env.AUTH_PEPPER) throw new Error("ログイン設定を準備中です。");
    const material = await digest(password + env.AUTH_PEPPER);
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(material),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const bytes = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: "SHA-256",
        },
        key,
        256,
    );
    return Array.from(new Uint8Array(bytes), (v) =>
        v.toString(16).padStart(2, "0"),
    ).join("");
}
export type PasswordProof = { salt: string | null; hash: string | null };
export async function verifyPassword(password: string): Promise<PasswordProof | null> {
    const config = await db()
        .prepare("SELECT salt,hash FROM auth_config WHERE id=1")
        .first<{ salt: string; hash: string }>();
    if (config)
        return equal(await passwordHash(password, config.salt), config.hash) ? config : null;
    if (!env.TEAM_BOOTSTRAP_PASSWORD)
        throw new Error("ログイン設定を準備中です。");
    return equal(
        await digest(password),
        await digest(env.TEAM_BOOTSTRAP_PASSWORD),
    ) ? { salt: null, hash: null } : null;
}
export async function checkPassword(password: string) {
    return !!(await verifyPassword(password));
}
// Browsers cap persistent cookies. Renew on authenticated responses without
// writing an expiry extension to D1; linked sessions have expires=0.
const ttl = 60 * 60 * 24 * 400;
export function cookieName(req: Request) {
    return new URL(req.url).protocol === "https:"
        ? "__Host-team_session"
        : "team_session";
}
export function cookie(req: Request, token: string, age = ttl) {
    return `${cookieName(req)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
function deviceCookieName(req: Request) {
    return new URL(req.url).protocol === "https:"
        ? "__Host-team_device"
        : "team_device";
}
export function deviceCookie(req: Request, value: string) {
    return `${deviceCookieName(req)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttl}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
function readCookie(req: Request, name: string) {
    return (
        (req.headers.get("Cookie") ?? "")
            .split(";")
            .map((v) => v.trim())
            .find((v) => v.startsWith(name + "="))
            ?.split("=")[1] ?? ""
    );
}
export function token(req: Request) {
    return readCookie(req, cookieName(req));
}
export function deviceToken(req: Request) {
    return readCookie(req, deviceCookieName(req));
}
export function validToken(value: string) {
    return /^[a-f0-9]{64}$/.test(value);
}
export type AuthSession = {
    hash: string;
    deviceHash: string | null;
    member: AuthMember | null;
};
export async function getSession(req: Request): Promise<AuthSession | null> {
    const value = token(req);
    if (!validToken(value)) return null;
    const row = await db()
        .prepare(`
            SELECT s.hash, s.device_hash, p.id, p.name, p.number, p.is_admin
            FROM sessions s
            LEFT JOIN member_devices d ON d.hash=s.device_hash
            LEFT JOIN players p ON p.id=d.player_id AND p.sort_order IS NOT NULL
            WHERE s.hash=? AND (s.expires=0 OR s.expires>?)
                AND (s.device_hash IS NULL OR p.id IS NOT NULL)
        `)
        .bind(await digest(value), Date.now())
        .first<{
            hash: string;
            device_hash: string | null;
            id: string | null;
            name: string | null;
            number: string | null;
            is_admin: number | null;
        }>();
    if (!row) return null;
    return {
        hash: row.hash,
        deviceHash: row.device_hash,
        member: row.id === null ? null : {
            id: row.id,
            name: row.name ?? "",
            number: row.number ?? "",
            isAdmin: row.is_admin === 1,
        },
    };
}
export async function authorized(req: Request) {
    return !!(await getSession(req))?.member;
}
// Call only after validating a linked session (including readSnapshot's auth).
export function renewSessionHeaders(req: Request) {
    const headers = new Headers();
    if (validToken(token(req))) headers.append("Set-Cookie", cookie(req, token(req)));
    if (validToken(deviceToken(req))) headers.append("Set-Cookie", deviceCookie(req, deviceToken(req)));
    return headers;
}
export async function rateLimit(req: Request) {
    const key = await digest(
        (req.headers.get("cf-connecting-ip") ?? "local") +
            (env.AUTH_PEPPER ?? ""),
    );
    const now = Date.now();
    const row = await db()
        .prepare(
            "INSERT INTO login_attempts(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END, until=CASE WHEN until<? THEN ? ELSE until END RETURNING count",
        )
        .bind(key, now + 900000, now, now, now + 900000)
        .first<{ count: number }>();
    return { key, blocked: !row || row.count > 8 };
}
export async function readBody(req: Request) {
    const text = await req.text();
    if (text.length > 50000) throw new Error("入力が長すぎます。");
    return JSON.parse(text);
}
