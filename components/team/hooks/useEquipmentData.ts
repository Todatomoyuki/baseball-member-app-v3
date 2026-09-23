"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  initialEquipmentData,
  type EquipmentData,
} from "@/lib/equipment";

type SaveState =
  | "saved"
  | "dirty"
  | "saving"
  | "error"
  | "conflict";

type EquipmentResponse = {
  data: EquipmentData;
  revision: number;
  error?: string;
};

async function equipmentApi(
  method = "GET",
  body?: unknown,
): Promise<EquipmentResponse> {
  const res = await fetch("/api/equipment", {
    method,
    credentials: "same-origin",
    headers: body
      ? { "Content-Type": "application/json" }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const value = (await res.json()) as EquipmentResponse;

  if (!res.ok) {
    throw Object.assign(
      new Error(
        value.error ??
          "道具データを処理できませんでした。",
      ),
      {
        status: res.status,
      },
    );
  }

  return value;
}

export function useEquipmentData() {
  const [data, setData] = useState<EquipmentData>(
    initialEquipmentData(),
  );

  const [revision, setRevision] = useState(0);

  const [saveState, setSaveState] =
    useState<SaveState>("saved");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const saved = useRef("");
  const saving = useRef(false);
  const currentDraft = useRef("");
  currentDraft.current = JSON.stringify(data);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await equipmentApi();

      setData(result.data);
      setRevision(result.revision);

      saved.current = JSON.stringify(result.data);

      setSaveState("saved");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "道具データを読み込めませんでした。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * 道具データを変更するときは
   * setDataではなくこれを使う
   */
  const edit = useCallback(
    (
      updater:
        | EquipmentData
        | ((current: EquipmentData) => EquipmentData),
    ) => {
      setData((current) => {
        const next =
          typeof updater === "function"
            ? updater(structuredClone(current))
            : updater;

        return next;
      });

      setSaveState((current) =>
        current === "conflict"
          ? current
          : "dirty",
      );
    },
    [],
  );

  /*
   * dirtyになったら650ms後に自動保存
   */
  useEffect(() => {
    if (
      loading ||
      saveState !== "dirty" ||
      saving.current ||
      JSON.stringify(data) === saved.current
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      const payload = JSON.stringify(data);

      saving.current = true;
      setSaveState("saving");

      try {
        const result = await equipmentApi(
          "PUT",
          {
            data,
            revision,
          },
        );

        saved.current = payload;
        setRevision(result.revision);

        setSaveState(currentDraft.current === payload ? "saved" : "dirty");
        setError("");
      } catch (e) {
        const err = e as Error & {
          status?: number;
        };

        setError(err.message);

        setSaveState(
          err.status === 409
            ? "conflict"
            : "error",
        );
      } finally {
        saving.current = false;
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [
    data,
    revision,
    saveState,
    loading,
  ]);

  /*
   * 保存対象と同じ状態まで戻った場合
   */
  useEffect(() => {
    if (
      saveState === "dirty" &&
      !saving.current &&
      JSON.stringify(data) === saved.current
    ) {
      setSaveState("saved");
    }
  }, [data, saveState, revision]);

  return {
    data,
    revision,

    loading,
    error,
    setError,

    saveState,

    edit,
    load,
  };
}
