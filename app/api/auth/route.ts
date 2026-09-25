import type { AuthMember, AuthResponse, LoginMember } from "@/lib/auth-types";
import {
    cookie,
    db,
    deviceCookie,
    deviceToken,
    digest,
    getSession,
    json,
    passwordHash,
    random,
    rateLimit,
    readBody,
    renewSessionHeaders,
    sameOrigin,
    token,
    validToken,
    verifyPassword,
} from "@/lib/server";

export const dynamic = "force-dynamic";
const selectionTtl = 15 * 60;

async function input(req: Request): Promise<Record<string, unknown> | null> {
    try {
        const body: unknown = await readBody(req);
        return body !== null && typeof body === "object" && !Array.isArray(body)
            ? body as Record<string, unknown>
            : null;
    } catch {
        return null;
    }
}

async function memberChoices(): Promise<LoginMember[]> {
    const result = await db().prepare(
        "SELECT id,name,number FROM players WHERE sort_order IS NOT NULL ORDER BY sort_order,id",
    ).all<LoginMember>();
    return result.results;
}

function sessionHeaders(req: Request, sessionValue: string, deviceValue: string, linked: boolean) {
    const headers = new Headers();
    headers.append("Set-Cookie", linked ? cookie(req, sessionValue) : cookie(req, sessionValue, selectionTtl));
    headers.append("Set-Cookie", deviceCookie(req, deviceValue));
    return headers;
}

function authResponse(member: AuthMember | null, members?: LoginMember[]): AuthResponse {
    return member
        ? { authenticated: true, member }
        : { authenticated: false, member: null, needsMemberSelection: true, members: members ?? [] };
}

export async function GET(req: Request) {
    try {
        const session = await getSession(req);
        if (!session) return json({ authenticated: false, member: null } satisfies AuthResponse);
        if (session.member) {
            return json(authResponse(session.member), 200, renewSessionHeaders(req));
        }
        // A password-authenticated but unlinked session can see member choices,
        // but cannot use team APIs until selection is complete.
        return json(authResponse(null, await memberChoices()));
    } catch (error) {
        console.error("[auth:GET]", error);
        return json({ error: "保存先に接続できません。時間をおいて再試行してください。" }, 503);
    }
}

export async function POST(req: Request) {
    if (!sameOrigin(req)) return json({ error: "リクエストを確認できません。" }, 403);
    try {
        const body = await input(req);
        if (!body || typeof body.password !== "string" || body.password.length === 0 || body.password.length > 128) {
            return json({ error: "パスワードを入力してください。" }, 400);
        }
        const limited = await rateLimit(req);
        if (limited.blocked) {
            return json({ error: "試行回数が多すぎます。15分後に再試行してください。" }, 429);
        }
        const proof = await verifyPassword(body.password);
        if (!proof) return json({ error: "パスワードが違います。" }, 401);

        const savedDevice = deviceToken(req);
        const deviceValue = validToken(savedDevice) ? savedDevice : random();
        const deviceHash = await digest(deviceValue);
        const device = validToken(savedDevice)
            ? await db().prepare(`
                SELECT d.hash,p.id,p.name,p.number,p.is_admin,p.can_edit_lineup,p.sort_order
                FROM member_devices d JOIN players p ON p.id=d.player_id WHERE d.hash=?
            `).bind(deviceHash).first<{
                hash: string;
                id: string;
                name: string;
                number: string;
                is_admin: number;
                can_edit_lineup: number;
                sort_order: number | null;
            }>()
            : null;
        if (device && device.sort_order === null) {
            return json({ error: "この端末に登録されたメンバーは現在の登録選手に含まれていません。管理者に確認してください。" }, 403);
        }
        const member: AuthMember | null = device ? {
            id: device.id,
            name: device.name,
            number: device.number,
            isAdmin: device.is_admin === 1,
            canEditLineup: device.can_edit_lineup === 1,
        } : null;
        const members = member ? undefined : await memberChoices();
        const sessionValue = random();
        const sessionHash = await digest(sessionValue);
        const now = Date.now();
        const results = await db().batch([
            // Reject a password that changed while PBKDF2 or member lookup ran.
            db().prepare(`
                INSERT INTO sessions(hash,expires,device_hash)
                SELECT ?,?,?
                WHERE (
                    (? IS NULL AND NOT EXISTS (SELECT 1 FROM auth_config WHERE id=1))
                    OR EXISTS (SELECT 1 FROM auth_config WHERE id=1 AND salt=? AND hash=?)
                ) AND (
                    ? IS NULL OR EXISTS (
                        SELECT 1 FROM member_devices d JOIN players p ON p.id=d.player_id
                        WHERE d.hash=? AND p.sort_order IS NOT NULL
                    )
                )
            `).bind(sessionHash, member ? 0 : now + selectionTtl * 1000, member ? deviceHash : null,
                proof.hash, proof.salt, proof.hash, member ? deviceHash : null, deviceHash),
            db().prepare("DELETE FROM sessions WHERE expires>0 AND expires<? AND EXISTS (SELECT 1 FROM sessions WHERE hash=?)")
                .bind(now, sessionHash),
            db().prepare("DELETE FROM sessions WHERE hash=? AND EXISTS (SELECT 1 FROM sessions WHERE hash=?)")
                .bind(await digest(token(req)), sessionHash),
            db().prepare("DELETE FROM login_attempts WHERE key=? AND EXISTS (SELECT 1 FROM sessions WHERE hash=?)")
                .bind(limited.key, sessionHash),
        ]);
        if (results[0].meta.changes !== 1) {
            return json({ error: "ログイン情報が変更されました。もう一度ログインしてください。" }, 401);
        }
        return json(authResponse(member, members), 200, sessionHeaders(req, sessionValue, deviceValue, !!member));
    } catch (error) {
        console.error("[auth:POST]", error);
        return json({ error: "ログインできませんでした。時間をおいて再試行してください。" }, 503);
    }
}

export async function PATCH(req: Request) {
    if (!sameOrigin(req)) return json({ error: "リクエストを確認できません。" }, 403);
    try {
        const session = await getSession(req);
        if (!session) return json({ error: "再ログインしてください。" }, 401);
        if (session.deviceHash || session.member) {
            return json({ error: "この端末に登録したメンバーは変更できません。" }, 403);
        }
        const body = await input(req);
        if (!body || typeof body.playerId !== "string" || body.playerId.length === 0 || body.playerId.length > 200) {
            return json({ error: "登録選手からあなたの名前を選んでください。" }, 400);
        }
        const member = await db().prepare(
            "SELECT id,name,number,is_admin,can_edit_lineup FROM players WHERE id=? AND sort_order IS NOT NULL",
        ).bind(body.playerId).first<{ id: string; name: string; number: string; is_admin: number; can_edit_lineup: number }>();
        if (!member) return json({ error: "選択したメンバーは現在の登録選手に含まれていません。" }, 400);

        const savedDevice = deviceToken(req);
        const deviceValue = validToken(savedDevice) ? savedDevice : random();
        const deviceHash = await digest(deviceValue);
        const now = Date.now();
        // Both statements are one transaction. Only the still-unlinked session
        // may create a device, and an existing device can never change owner.
        const results = await db().batch([
            db().prepare(`
                INSERT INTO member_devices(hash,player_id)
                SELECT ?,p.id FROM players p
                WHERE p.id=? AND p.sort_order IS NOT NULL
                    AND EXISTS (SELECT 1 FROM sessions s WHERE s.hash=? AND s.device_hash IS NULL AND (s.expires=0 OR s.expires>?))
                ON CONFLICT(hash) DO NOTHING
            `).bind(deviceHash, member.id, session.hash, now),
            db().prepare(`
                UPDATE sessions SET device_hash=?,expires=0
                WHERE hash=? AND device_hash IS NULL AND (expires=0 OR expires>?)
                    AND EXISTS (
                        SELECT 1 FROM member_devices d JOIN players p ON p.id=d.player_id
                        WHERE d.hash=? AND p.id=? AND p.sort_order IS NOT NULL
                    )
            `).bind(deviceHash, session.hash, now, deviceHash, member.id),
        ]);
        if (results[1].meta.changes !== 1) {
            return json({ error: "この端末のメンバーは既に登録済みか、選択の有効期限が切れています。再ログインしてください。" }, 409);
        }
        return json(authResponse({
            id: member.id,
            name: member.name,
            number: member.number,
            isAdmin: member.is_admin === 1,
            canEditLineup: member.can_edit_lineup === 1,
        }), 200, sessionHeaders(req, token(req), deviceValue, true));
    } catch (error) {
        console.error("[auth:PATCH]", error);
        return json({ error: "メンバーを登録できませんでした。時間をおいて再試行してください。" }, 503);
    }
}

export async function DELETE(req: Request) {
    if (!sameOrigin(req)) return json({ error: "リクエストを確認できません。" }, 403);
    try {
        if (validToken(token(req))) {
            await db().prepare("DELETE FROM sessions WHERE hash=?").bind(await digest(token(req))).run();
        }
        // Keep the separate device cookie so the next password login restores
        // the same member without allowing another name to be selected.
        return json({ ok: true }, 200, { "Set-Cookie": cookie(req, "", 0) });
    } catch (error) {
        console.error("[auth:DELETE]", error);
        return json({ error: "ログアウトできませんでした。" }, 503);
    }
}

export async function PUT(req: Request) {
    if (!sameOrigin(req)) return json({ error: "リクエストを確認できません。" }, 403);
    try {
        const session = await getSession(req);
        if (!session?.member) return json({ error: "再ログインしてください。" }, 401);
        if (!session.member.isAdmin) return json({ error: "パスワードを変更できるのは管理者だけです。" }, 403);
        const body = await input(req);
        if (!body || typeof body.current !== "string" || typeof body.password !== "string" ||
            body.current.length > 128 || body.password.length < 12 || body.password.length > 128) {
            return json({ error: "新しいパスワードは12〜128文字で入力してください。" }, 400);
        }
        const limited = await rateLimit(req);
        if (limited.blocked) return json({ error: "15分後に再試行してください。" }, 429);
        const proof = await verifyPassword(body.current);
        if (!proof) return json({ error: "現在のパスワードが違います。" }, 401);

        const salt = random();
        const hash = await passwordHash(body.password, salt);
        const sessionValue = random();
        // Password replacement, revocation, and the administrator's new session
        // commit together; device-to-member bindings are retained.
        const results = await db().batch([
            db().prepare(`
                INSERT INTO auth_config(id,salt,hash)
                SELECT 1,?,?
                WHERE EXISTS (
                    SELECT 1 FROM sessions s
                    JOIN member_devices d ON d.hash=s.device_hash
                    JOIN players p ON p.id=d.player_id
                    WHERE s.hash=? AND s.device_hash=? AND (s.expires=0 OR s.expires>?)
                        AND p.sort_order IS NOT NULL AND p.is_admin=1
                ) AND (
                    (? IS NULL AND NOT EXISTS (SELECT 1 FROM auth_config WHERE id=1))
                    OR EXISTS (SELECT 1 FROM auth_config WHERE id=1 AND salt=? AND hash=?)
                )
                ON CONFLICT(id) DO UPDATE SET salt=excluded.salt,hash=excluded.hash
            `).bind(salt, hash, session.hash, session.deviceHash, Date.now(), proof.hash, proof.salt, proof.hash),
            db().prepare("DELETE FROM sessions WHERE EXISTS (SELECT 1 FROM auth_config WHERE id=1 AND salt=? AND hash=?)")
                .bind(salt, hash),
            db().prepare("INSERT INTO sessions(hash,expires,device_hash) SELECT ?,0,? WHERE EXISTS (SELECT 1 FROM auth_config WHERE id=1 AND salt=? AND hash=?)")
                .bind(await digest(sessionValue), session.deviceHash, salt, hash),
            db().prepare("DELETE FROM login_attempts WHERE key=? AND EXISTS (SELECT 1 FROM auth_config WHERE id=1 AND salt=? AND hash=?)")
                .bind(limited.key, salt, hash),
        ]);
        if (results[0].meta.changes !== 1) {
            return json({ error: "ログイン情報または管理者権限が変更されました。再ログインしてください。" }, 401);
        }
        const headers = new Headers();
        headers.append("Set-Cookie", cookie(req, sessionValue));
        if (validToken(deviceToken(req))) headers.append("Set-Cookie", deviceCookie(req, deviceToken(req)));
        return json({ ok: true }, 200, headers);
    } catch (error) {
        console.error("[auth:PUT]", error);
        return json({ error: "パスワードを変更できませんでした。" }, 503);
    }
}
