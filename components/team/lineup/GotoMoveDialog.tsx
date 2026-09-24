"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import styles from "./GotoMoveDialog.module.css";

export type GotoMoveDestination = "starter" | "bench" | "absent" | "equipment";

const messages: Record<GotoMoveDestination, string> = {
  starter: "俺をスタメンにすると余裕で勝っちゃうぞ？いいのか？",
  bench: "俺がベンチだと？そんなんでいいのか？",
  absent: "俺を不参加にさせようってのか？",
  equipment: "俺に道具を持たせようだと？ふざけてるのか？",
};

type GotoMoveDialogProps = {
  open: boolean;
  destination: GotoMoveDestination;
  onConfirm: () => void;
  onCancel: () => void;
};

export function GotoMoveDialog({
  open,
  destination,
  onConfirm,
  onCancel,
}: GotoMoveDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <AlertDialogContent className={styles.dialog}>
        <div className={styles.heading}>
          <span className={styles.number} aria-hidden="true">
            No.11
          </span>
          <AlertDialogTitle className={styles.title}>
            後藤からひとこと
          </AlertDialogTitle>
        </div>

        <div className={styles.photoFrame}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.photo}
            src="/goto/IMG_3549.JPEG"
            alt="こちらを指さす後藤選手"
            width={1536}
            height={2048}
          />
        </div>

        <AlertDialogDescription className={styles.message}>
          {messages[destination]}
        </AlertDialogDescription>

        <div className={styles.choices}>
          <AlertDialogAction
            className={`${styles.choice} ${styles.confirm}`}
            onClick={(event) => {
              // The parent closes the dialog after applying the pending move.
              // Prevent Radix's close event from also invoking onCancel.
              event.preventDefault();
              onConfirm();
            }}
          >
            はい
          </AlertDialogAction>
          <AlertDialogCancel
            className={`${styles.choice} ${styles.cancel}`}
          >
            いいえ
          </AlertDialogCancel>
          <a
            className={styles.storyLink}
            href="/goto"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onCancel}
          >
            <span>それより後藤のありがたいお話を聞く</span>
            <span className={styles.newTab}>新しいタブで開く ↗</span>
          </a>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
