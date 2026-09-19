import { env } from "cloudflare:workers";
const encoder = new TextEncoder();
export function db() {
    if (!env.DB) throw new Error("保存先に接続できません。");
    return env.DB;
}
export function json(value: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(value, {
        status,
        headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            ...headers,
        },
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
export async function checkPassword(password: string) {
    const config = await db()
        .prepare("SELECT salt,hash FROM auth_config WHERE id=1")
        .first<{ salt: string; hash: string }>();
    if (config)
        return equal(await passwordHash(password, config.salt), config.hash);
    if (!env.TEAM_BOOTSTRAP_PASSWORD)
        throw new Error("ログイン設定を準備中です。");
    return equal(
        await digest(password),
        await digest(env.TEAM_BOOTSTRAP_PASSWORD),
    );
}
const ttl = 60 * 60 * 24 * 180;
export function cookieName(req: Request) {
    return new URL(req.url).protocol === "https:"
        ? "__Host-team_session"
        : "team_session";
}
export function cookie(req: Request, token: string, age = ttl) {
    return `${cookieName(req)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function token(req: Request) {
    return (
        (req.headers.get("Cookie") ?? "")
            .split(";")
            .map((v) => v.trim())
            .find((v) => v.startsWith(cookieName(req) + "="))
            ?.split("=")[1] ?? ""
    );
}
export async function authorized(req: Request) {
    const value = token(req);
    if (!/^[a-f0-9]{64}$/.test(value)) return false;
    return !!(await db()
        .prepare("SELECT hash FROM sessions WHERE hash=? AND expires>?")
        .bind(await digest(value), Date.now())
        .first());
}
export async function newSession(req: Request) {
    const value = random();
    await db().batch([
        db().prepare("DELETE FROM sessions WHERE expires<?").bind(Date.now()),
        db()
            .prepare("INSERT INTO sessions(hash,expires) VALUES(?,?)")
            .bind(await digest(value), Date.now() + ttl * 1000),
    ]);
    return cookie(req, value);
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
