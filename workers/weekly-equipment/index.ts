interface Env {
    DB: D1Database;
    LINE_CHANNEL_ACCESS_TOKEN: string;
    LINE_GROUP_ID: string;
}

type EquipmentItem = {
    id: string;
    name: string;
    holderId: string | null;
    note: string;
};

type EquipmentData = {
    items: EquipmentItem[];
};

type Player = {
    id: string;
    name: string;
};

type TeamData = {
    players: Player[];
};

export default {
    async scheduled(
        _controller: ScheduledController,
        env: Env,
        _ctx: ExecutionContext,
    ) {
        const [equipmentRow, teamRow] = await Promise.all([
            env.DB.prepare(
                "SELECT data FROM equipment_state WHERE id = 1",
            ).first<{ data: string }>(),

            env.DB.prepare("SELECT data FROM team_state WHERE id = 1").first<{
                data: string;
            }>(),
        ]);

        if (!equipmentRow || !teamRow) {
            console.error("equipment_state または team_state が見つかりません");
            return;
        }

        const equipmentData = JSON.parse(equipmentRow.data) as EquipmentData;
        const teamData = JSON.parse(teamRow.data) as TeamData;

        const playerMap = new Map(
            teamData.players.map((player) => [player.id, player.name]),
        );

        const lines = equipmentData.items
            .filter((item) => item.holderId)
            .map((item) => {
                const playerName =
                    playerMap.get(item.holderId!) ?? "不明な選手";

                return `${playerName} ： ${item.name}`;
            });

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
