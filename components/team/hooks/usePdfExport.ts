"use client";
import { useCallback, useEffect, useState } from "react";
import { lineupWarnings, type TeamData } from "@/lib/model";

/**
 * メンバー表 PDF の生成まわり。
 *
 * - 未入力チェック（lineupWarnings）に引っかかったら警告モーダル用の配列を返す
 * - PDF 生成ライブラリは重いので動的 import
 * - objectURL は不要になったタイミングで必ず revoke する
 */
export function usePdfExport(data: TeamData, onError: (message: string) => void) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [warnings, setWarnings] = useState<string[] | null>(null);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  /** @param force true なら未入力警告を無視して作成する */
  const create = useCallback(
    async (force = false) => {
      const found = lineupWarnings(data);
      if (found.length && !force) {
        setWarnings(found);
        return;
      }
      setWarnings(null);
      setBusy(true);
      try {
        const { generateMemberPdf } = await import("@/lib/pdf");
        const result = await generateMemberPdf(data);
        setUrl(URL.createObjectURL(result.blob));
        setName(result.name);
      } catch {
        onError("PDFを作成できませんでした。もう一度お試しください。");
      } finally {
        setBusy(false);
      }
    },
    [data, onError],
  );

  const dismissWarnings = useCallback(() => setWarnings(null), []);
  const closePreview = useCallback(() => setUrl(""), []);

  /** ログアウト時など、生成済み PDF を完全に破棄する */
  const clear = useCallback(() => {
    setUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    setName("");
    setWarnings(null);
  }, []);

  return { busy, url, name, warnings, create, dismissWarnings, closePreview, clear };
}

export type PdfExport = ReturnType<typeof usePdfExport>;
