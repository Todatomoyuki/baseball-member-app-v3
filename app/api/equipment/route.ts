import {
  initialEquipmentData,
  normalizeEquipmentData,
  validateEquipmentData,
  type EquipmentData,
} from "@/lib/equipment";

import {
  authorized,
  db,
  json,
  readBody,
  sameOrigin,
} from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!(await authorized(req))) {
      return json({ error: "ログインしてください。" }, 401);
    }

    let row = await db()
      .prepare(
        "SELECT data,revision FROM equipment_state WHERE id=1",
      )
      .first<{ data: string; revision: number }>();

    if (!row) {
      await db()
        .prepare(
          "INSERT OR IGNORE INTO equipment_state(id,data,revision) VALUES(1,?,0)",
        )
        .bind(JSON.stringify(initialEquipmentData()))
        .run();

      row = await db()
        .prepare(
          "SELECT data,revision FROM equipment_state WHERE id=1",
        )
        .first<{ data: string; revision: number }>();
    }

    return json({
      data: normalizeEquipmentData(
        JSON.parse(row!.data) as EquipmentData,
      ),
      revision: row!.revision,
    });
  } catch {
    return json(
      {
        error:
          "道具データを読み込めませんでした。再試行してください。",
      },
      503,
    );
  }
}

export async function PUT(req: Request) {
  if (!sameOrigin(req)) {
    return json(
      { error: "リクエストを確認できません。" },
      403,
    );
  }

  try {
    if (!(await authorized(req))) {
      return json(
        { error: "再ログインしてください。" },
        401,
      );
    }

    const input = await readBody(req);

    let data: EquipmentData;

    try {
      data = validateEquipmentData(input.data);
    } catch {
      return json(
        {
          error: "道具の入力内容を確認してください。",
        },
        400,
      );
    }

    if (
      !Number.isSafeInteger(input.revision) ||
      input.revision < 0
    ) {
      return json(
        { error: "保存情報が不正です。" },
        400,
      );
    }

    const result = await db()
      .prepare(
        `
        UPDATE equipment_state
        SET data=?, revision=revision+1
        WHERE id=1 AND revision=?
        RETURNING revision
        `,
      )
      .bind(
        JSON.stringify(data),
        input.revision,
      )
      .first<{ revision: number }>();

    if (!result) {
      return json(
        {
          error:
            "別の端末で更新されています。最新データを読み込んでください。",
        },
        409,
      );
    }

    return json({
      revision: result.revision,
    });
  } catch {
    return json(
      {
        error:
          "道具データを保存できませんでした。",
      },
      503,
    );
  }
}