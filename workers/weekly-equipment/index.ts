interface Env {
    DB: D1Database;
    LINE_CHANNEL_ACCESS_TOKEN: string;
    LINE_GROUP_ID: string;
}

type EquipmentAssignment = {
    equipment_name: string;
    player_name: string | null;
};

export default {
    async scheduled(
        _controller: ScheduledController,
        env: Env,
    ) {
        // Match the app's active roster while retaining equipment assigned to
        // former members as "unknown", rather than silently omitting it.
        const { results: assignments } = await env.DB.prepare(`
            SELECT e.name AS equipment_name, p.name AS player_name
            FROM equipment_items AS e
            LEFT JOIN players AS p
                ON p.id = e.holder_id AND p.sort_order IS NOT NULL
            WHERE e.notify_line = 1 AND e.holder_id IS NOT NULL
            ORDER BY e.sort_order, e.id
        `).all<EquipmentAssignment>();

        if (assignments.length === 0) return;

        const lines = assignments.map(
            ({ player_name, equipment_name }) =>
                `${player_name ?? "不明な選手"} ： ${equipment_name}`,
        );

        const message = [
            "⚾️ 今週の道具担当者一覧:（試合が無い週も毎週金曜日に送信されます）",
            "",
            ...lines,
            "",
            "担当者や道具に変更があれば「YG TEAM TOOLS」の道具管理から修正できます。",
            "",
            "※試合後に変更がある場合、修正をお願いします！",
        ].join("\n");

        const response = await fetch(
            "https://api.line.me/v2/bot/message/push",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
                },
                body: JSON.stringify({
                    to: env.LINE_GROUP_ID,
                    messages: [
                        {
                            type: "text",
                            text: message,
                        },
                    ],
                }),
            },
        );

        if (!response.ok) {
            console.error(
                "LINE送信失敗:",
                response.status,
                await response.text(),
            );
            return;
        }

        console.log("LINE送信成功！");
    },
} satisfies ExportedHandler<Env>;
