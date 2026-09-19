import { jsPDF } from "jspdf";
import { benchPlayers, type TeamData, type Player } from "./model";
export async function generateMemberPdf(data: TeamData) {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    const scale = 3;
    canvas.width = 842 * scale;
    canvas.height = 595 * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("PDF描画を開始できません。");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 842, 595);
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 0.55;
    const text = (
        s: string,
        x: number,
        y: number,
        w: number,
        size = 8,
        align: CanvasTextAlign = "center",
    ) => {
        ctx.font = `${size}px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif`;
        while (ctx.measureText(s).width > w - 4 && size > 4.5) {
            size -= 0.25;
            ctx.font = `${size}px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif`;
        }
        ctx.textAlign = align;
        ctx.textBaseline = "middle";
        ctx.fillText(s, align === "center" ? x + w / 2 : x + 3, y);
    };
    const line = (
        x: number,
        y: number,
        x2: number,
        y2: number,
        dashed = false,
    ) => {
        ctx.setLineDash(dashed ? [1, 1.4] : []);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
    };
    const box = (x: number, y: number, w: number, h: number) =>
        ctx.strokeRect(x, y, w, h);
    const bench = benchPlayers(data);
    const lookup = (id: string | null) => data.players.find((p) => p.id === id);
    for (let copy = 0; copy < 3; copy++) {
        const x = [17, 298, 579][copy],
            w = 246,
            blank = copy === 2;
        ctx.lineWidth = 0.8;
        box(x, 52, w, 46);
        ctx.lineWidth = 0.5;
        line(x, 68, x + w, 68);
        line(x, 83, x + w, 83);
        text("メンバー表", x, 60, w, 10);
        const meta = (
            y: number,
            leftLabel: string,
            leftValue: string,
            rightLabel: string,
            rightValue: string,
        ) => {
            line(x + 30, y - 7.5, x + 30, y + 7.5);
            line(x + 112, y - 7.5, x + 112, y + 7.5);
            line(x + 163, y - 7.5, x + 163, y + 7.5);
            text(leftLabel, x, y, 30, 7);
            text(leftValue, x + 30, y, 82, 7.5);
            text(rightLabel, x + 112, y, 51, 7);
            text(rightValue, x + 163, y, 83, 7);
        };
        meta(
            75.5,
            "日付",
            blank ? "" : data.date.replaceAll("-", "/"),
            "大会名",
            blank ? "" : data.tournament,
        );
        meta(
            90.5,
            "チーム名",
            data.teamName,
            "相手チーム名",
            blank ? "" : data.opponent,
        );
        const top = 108,
            header = 26,
            rowH = 25,
            columns = [0, 29.5, 68.5, 113, 220, 246],
            bottom = top + header + 12 * rowH;
        ctx.lineWidth = 0.8;
        box(x, top, w, bottom - top);
        ctx.lineWidth = 0.5;
        columns.slice(1, -1).forEach((c) => line(x + c, top, x + c, bottom));
        line(x, top + header, x + w, top + header);
        text("打順", x, top + 13, 29.5, 7);
        text("位置", x + 29.5, top + 13, 39, 7);
        text("コード", x + 68.5, top + 13, 44.5, 7);
        text("ふりがな", x + 113, top + 6, 107, 6);
        text("氏名", x + 113, top + 19, 107, 7);
        line(x + 113, top + 12, x + 220, top + 12, true);
        text("背番号", x + 220, top + 13, 26, 7);
        for (let i = 0; i < 12; i++) {
            const y = top + header + i * rowH;
            line(x, y + rowH, x + w, y + rowH);
            line(x + 113, y + 9, x + 220, y + 9, true);
            text(
                i === 11 ? "−" : i > 8 ? `(${i + 1})` : String(i + 1),
                x,
                y + 13,
                29.5,
                10,
            );
            const player: Player | undefined = blank
                ? undefined
                : i < 9
                  ? lookup(data.slots[i].playerId)
                  : i === 11 && data.mode === "dh"
                    ? lookup(data.pitcher)
                    : undefined;
            const pos = blank
                ? ""
                : i < 9
                  ? data.slots[i].position
                  : i === 11 && data.mode === "dh"
                    ? "投"
                    : "";
            text(pos, x + 29.5, y + 13, 39, 10);
            if (player) {
                text(player.kana, x + 113, y + 4.5, 107, 6.5);
                text(player.name, x + 113, y + 17, 107, 10);
                text(player.number, x + 220, y + 13, 26, 9);
            }
        }
        const by = 446,
            bh = 96,
            rows = Math.max(6, Math.ceil(bench.length / 2)),
            rh = (bh - 25) / rows;
        ctx.lineWidth = 0.8;
        box(x, by, w, bh + 24);
        ctx.lineWidth = 0.5;
        line(x, by + 12, x + w, by + 12);
        text("控え選手", x, by + 6, w, 7);
        line(x, by + 25, x + w, by + 25);
        line(x + 68, by + 12, x + 68, by + bh);
        line(x + 113, by + 12, x + 113, by + bh + 24);
        line(x + 193, by + 12, x + 193, by + bh);
        text("名前", x, by + 18.5, 68, 7, "left");
        text("背番号", x + 68, by + 18.5, 45, 7);
        text("名前", x + 113, by + 18.5, 80, 7, "left");
        text("背番号", x + 193, by + 18.5, 53, 7);
        for (let i = 0; i < rows; i++) {
            const y = by + 25 + i * rh;
            line(x, y + rh, x + w, y + rh);
            if (!blank) {
                const a = bench[i],
                    b = bench[i + rows];
                if (a) {
                    text(a.name, x, y + rh / 2, 68, Math.min(7, rh - 1));
                    text(a.number, x + 68, y + rh / 2, 45, Math.min(7, rh - 1));
                }
                if (b) {
                    text(b.name, x + 113, y + rh / 2, 80, Math.min(7, rh - 1));
                    text(
                        b.number,
                        x + 193,
                        y + rh / 2,
                        53,
                        Math.min(7, rh - 1),
                    );
                }
            }
        }
        const fy = by + bh;
        line(x + 18, fy, x + 18, fy + 24);
        line(x + 139, fy, x + 139, fy + 24);
        text("監督", x, fy + 12, 18, 7);
        text(data.manager, x + 18, fy + 12, 95, 10);
        text("予備欄", x + 113, fy + 12, 26, 7);
    }
    line(280.5, 52, 280.5, 567, true);
    line(561.5, 52, 561.5, 567, true);
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
    });
    pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        841.89,
        595.28,
        undefined,
        "FAST",
    );
    pdf.setProperties({
        title: `メンバー表 ${data.teamName} ${data.date}`,
        creator: "メンバー表アプリ",
    });
    return {
        blob: pdf.output("blob"),
        name: `メンバー表_${data.date}_${data.teamName.replace(/[\\/:*?"<>|]/g, "_")}.pdf`,
    };
}
