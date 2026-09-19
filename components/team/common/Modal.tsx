"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * このアプリ共通のモーダル。
 *
 * スマホでソフトキーボードが出たときにダイアログがはみ出さないよう、
 * visualViewport の高さ・位置を CSS 変数（--dialog-height / --dialog-top）に流し込みます。
 * 開いたときのフォーカスは入力欄ではなくタイトルへ移します（勝手にキーボードが出ないように）。
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    const view = window.visualViewport;
    if (!view) return;
    const update = () => setViewport({ height: view.height, top: view.offsetTop });
    update();
    view.addEventListener("resize", update);
    view.addEventListener("scroll", update);
    return () => {
      view.removeEventListener("resize", update);
      view.removeEventListener("scroll", update);
    };
  }, [open]);

  const style = viewport
    ? ({
        "--dialog-height": `${viewport.height}px`,
        "--dialog-top": `${viewport.top}px`,
      } as CSSProperties)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        layout="app"
        style={style}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus({ preventScroll: true });
        }}
      >
        <div className="team-dialog-header">
          <DialogTitle ref={titleRef} tabIndex={-1} className="modal-title">
            {title}
          </DialogTitle>
          <DialogDescription
            className={description ? "modal-description" : "sr-only"}
          >
            {description || title}
          </DialogDescription>
        </div>
        <div className="team-dialog-body">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
