"use client";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  GripVertical,
  FileDown,
  Users,
  ChevronDown,
  Plus,
  Check,
  Search,
  Settings,
  LogOut,
  LockKeyhole,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  CalendarDays,
  RefreshCw,
  ShieldCheck,
  Wrench,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  POSITIONS,
  initialData,
  benchPlayers,
  absentPlayers,
  changeMode,
  swapPlayer,
  lineupWarnings,
  type TeamData,
  type Player,
  type Position,
} from "@/lib/model";

type DragKey = { kind: "player" | "position" | "order"; key: string };
async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = (await res.json()) as {
    error?: string;
    data: TeamData;
    revision: number;
    authenticated: boolean;
  };
  if (!res.ok)
    throw Object.assign(new Error(value.error || "通信できませんでした。"), {
      status: res.status,
    });
  return value;
}
function DragButton({
  item,
  children,
  onClick,
  className = "",
  label,
  disabled = false,
}: {
  item: DragKey;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  label: string;
  disabled?: boolean;
}) {
  const id = `${item.kind}:${item.key}`;
  const drag = useDraggable({ id, data: item, disabled });
  const drop = useDroppable({ id, data: item, disabled });
  return (
    <button
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      {...drag.listeners}
      {...drag.attributes}
      type="button"
      onClick={onClick}
      className={`${className} drag-button ${drag.isDragging ? "dragging" : ""} ${drop.isOver ? "drop-over" : ""}`}
      aria-label={label}
      style={{
        transform: drag.transform
          ? `translate3d(${drag.transform.x}px,${drag.transform.y}px,0)`
          : undefined,
        zIndex: drag.isDragging ? 40 : undefined,
      }}
    >
      {children}
    </button>
  );
}
function PlayerZone({
  zone,
  children,
}: {
  zone: "bench" | "absent";
  children: ReactNode;
}) {
  const key = `${zone}-zone`;
  const { setNodeRef, isOver } = useDroppable({
    id: `player:${key}`,
    data: { kind: "player", key },
  });
  return (
    <div ref={setNodeRef} className={`bench-zone ${isOver ? "drop-over" : ""}`}>
      {children}
    </div>
  );
}
function Modal({
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
  const [viewport, setViewport] = useState<{
    height: number;
    top: number;
  } | null>(null);
  useEffect(() => {
    if (!open) return;
    const view = window.visualViewport;
    if (!view) return;
    const update = () =>
      setViewport({ height: view.height, top: view.offsetTop });
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
function PlayerEditor({
  player,
  onSave,
  onDelete,
  onClose,
  onMove,
  location,
}: {
  player?: Player;
  onSave: (p: Player) => void;
  onDelete?: () => void;
  onClose: () => void;
  onMove?: () => void;
  location?: "bench" | "absent" | "active";
}) {
  const [name, setName] = useState(player?.name ?? "");
  const [number, setNumber] = useState(player?.number ?? "");
  const [kana, setKana] = useState(player?.kana ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: player?.id ?? crypto.randomUUID(),
          name: name.trim(),
          number: number.trim(),
          kana: kana.trim(),
        });
        onClose();
      }}
    >
      <label>
        選手名
        <Input
          required
          maxLength={30}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="山田 太郎"
        />
      </label>
      <div className="form-two">
        <label>
          背番号
          <Input
            required
            inputMode="numeric"
            pattern="[0-9]{1,3}"
            maxLength={3}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="10"
          />
        </label>
        <label>
          ふりがな <span className="optional">任意</span>
          <Input
            maxLength={50}
            value={kana}
            onChange={(e) => setKana(e.target.value)}
            placeholder="やまだ たろう"
          />
        </label>
      </div>
      {onMove && location !== "active" && (
        <button type="button" className="secondary full" onClick={onMove}>
          {location === "absent" ? "ベンチに戻す" : "不参加へ移動"}
        </button>
      )}
      <div className="modal-actions">
        {onDelete && (
          <button type="button" className="danger-link" onClick={onDelete}>
            <Trash2 size={16} />
            削除
          </button>
        )}
        <button className="primary" disabled={!name.trim()}>
          {player ? "変更を反映" : "選手を登録"}
        </button>
      </div>
    </form>
  );
}

export default function Home() {
  const [auth, setAuth] = useState<"loading" | "login" | "ready">("loading");
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState<TeamData>(initialData);
  const [revision, setRevision] = useState(0);
  const saved = useRef("");
  const currentDraft = useRef("");
  currentDraft.current = JSON.stringify(data);
  const [saveState, setSaveState] = useState<
    "saved" | "dirty" | "saving" | "error" | "conflict"
  >("saved");
  const [error, setError] = useState("");
  const saving = useRef(false);
  const mounted = useRef(false);
  const [tab, setTab] = useState<"order" | "players">("order");
  const [editor, setEditor] = useState<Player | "new" | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [positionIndex, setPositionIndex] = useState<number | null>(null);
  const [teamPicker, setTeamPicker] = useState(false);
  const [teamQuery, setTeamQuery] = useState("");
  const [tournamentPicker, setTournamentPicker] = useState(false);
  const [tournamentQuery, setTournamentQuery] = useState("");
  const [rosterQuery, setRosterQuery] = useState("");
  const [settings, setSettings] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [reauth, setReauth] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfWarnings, setPdfWarnings] = useState<string[] | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 240, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );
  const load = useCallback(async () => {
    const result = await api("/api/team");
    saved.current = JSON.stringify(result.data);
    setData(result.data);
    setRevision(result.revision);
    setSaveState("saved");
    setError("");
    setAuth("ready");
  }, []);
  useEffect(() => {
    mounted.current = true;
    void api("/api/auth")
      .then((r) => (r.authenticated ? load() : setAuth("login")))
      .catch((e) => {
        setLoginError(e.message);
        setAuth("login");
      });
    return () => {
      mounted.current = false;
    };
  }, [load]);
  const edit = useCallback((fn: (d: TeamData) => TeamData) => {
    setData((current) => fn(structuredClone(current)));
    setSaveState((v) => (v === "conflict" ? v : "dirty"));
  }, []);
  useEffect(() => {
    if (
      auth !== "ready" ||
      saveState !== "dirty" ||
      saving.current ||
      JSON.stringify(data) === saved.current
    )
      return;
    const timer = setTimeout(async () => {
      const payload = JSON.stringify(data);
      saving.current = true;
      setSaveState("saving");
      try {
        const result = await api("/api/team", "PUT", {
          data,
          revision,
        });
        saved.current = payload;
        setRevision(result.revision);
        setSaveState("dirty");
        setError("");
      } catch (e) {
        const err = e as Error & { status?: number };
        setError(err.message);
        if (err.status === 401) setReauth(true);
        setSaveState(err.status === 409 ? "conflict" : "error");
      } finally {
        saving.current = false;
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [data, revision, auth, saveState]);
  useEffect(() => {
    if (
      saveState === "dirty" &&
      !saving.current &&
      JSON.stringify(data) === saved.current
    )
      setSaveState("saved");
  }, [data, saveState]);
  useEffect(() => {
    if (auth !== "ready") return;
    const id = setInterval(() => {
      if (
        !saving.current &&
        JSON.stringify(data) === saved.current &&
        document.visibilityState === "visible"
      ) {
        void api("/api/team")
          .then((r) => {
            if (
              r.revision !== revision &&
              currentDraft.current === saved.current
            ) {
              saved.current = JSON.stringify(r.data);
              setData(r.data);
              setRevision(r.revision);
            }
          })
          .catch(() => {});
      }
    }, 20000);
    return () => clearInterval(id);
  }, [auth, data, revision]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (
        (saving.current || JSON.stringify(data) !== saved.current) &&
        auth === "ready"
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [data, auth]);
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);
  useEffect(() => {
    const ctx = (
      document as Document & {
        modelContext?: {
          registerTool: (t: unknown, o: unknown) => unknown;
        };
      }
    ).modelContext;
    if (!ctx || auth !== "ready") return;
    const life = new AbortController();
    try {
      void Promise.resolve(
        ctx.registerTool(
          {
            name: "get_baseball_lineup",
            title: "現在のメンバー表を確認",
            description:
              "ログイン済みの画面に表示中の打順・守備・控え選手・試合情報を読み取る。保存や変更はしません。",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: {
              readOnlyHint: true,
              untrustedContentHint: true,
            },
            execute: () => ({
              team: data.teamName,
              date: data.date,
              opponent: data.opponent,
              mode: data.mode,
              starters: data.slots.map((s, i) => ({
                order: i + 1,
                position: s.position,
                player: data.players.find((p) => p.id === s.playerId) ?? null,
              })),
              pitcher: data.players.find((p) => p.id === data.pitcher) ?? null,
              bench: benchPlayers(data),
              absent: absentPlayers(data),
            }),
          },
          { signal: life.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => life.abort();
  }, [data, auth]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      await api("/api/auth", "POST", { password });
      setPassword("");
      await load();
    } catch (e) {
      setLoginError((e as Error).message);
    } finally {
      setLoginBusy(false);
    }
  }
  async function logout() {
    if (
      saveState !== "saved" &&
      !window.confirm("未保存の変更があります。ログアウトしますか？")
    )
      return;
    try {
      await api("/api/auth", "DELETE");
      saved.current = "";
      setData(initialData());
      setAuth("login");
      setSettings(false);
      setError("");
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl("");
      }
    } catch (e) {
      setSettingsMessage((e as Error).message);
    }
  }
  function dragEnd(event: DragEndEvent) {
    const a = event.active.data.current as DragKey | undefined,
      b = event.over?.data.current as DragKey | undefined;
    if (!a || !b || a.kind !== b.kind || a.key === b.key) return;
    edit((d) => {
      if (a.kind === "player") {
        if (b.key === "bench-zone" || b.key === "absent-zone") {
          const id = a.key.startsWith("bench:")
            ? a.key.slice(6)
            : a.key.startsWith("absent:")
              ? a.key.slice(7)
              : a.key === "pitcher"
                ? d.pitcher
                : d.slots[Number(a.key.slice(5))]?.playerId;
          if (!id) return d;
          if (a.key === "pitcher") d.pitcher = null;
          else if (a.key.startsWith("slot:"))
            d.slots[Number(a.key.slice(5))].playerId = null;
          d.absentIds = d.absentIds.filter((v) => v !== id);
          if (b.key === "absent-zone") d.absentIds.push(id);
          return d;
        }
        return swapPlayer(d, a.key, b.key);
      }
      const from = Number(a.key),
        to = Number(b.key);
      if (a.kind === "position") {
        [d.slots[from].position, d.slots[to].position] = [
          d.slots[to].position,
          d.slots[from].position,
        ];
      } else {
        const [row] = d.slots.splice(from, 1);
        d.slots.splice(to, 0, row);
      }
      return d;
    });
  }
  function selectPlayer(id: string | null) {
    if (pick === null) return;
    edit((d) => {
      if (!id) {
        if (pick === "pitcher") d.pitcher = null;
        else d.slots[Number(pick.slice(5))].playerId = null;
        return d;
      }
      const i = d.slots.findIndex((s) => s.playerId === id);
      const from =
        i >= 0
          ? `slot:${i}`
          : d.pitcher === id
            ? "pitcher"
            : d.absentIds.includes(id)
              ? `absent:${id}`
              : `bench:${id}`;
      return swapPlayer(d, from, pick);
    });
    setPick(null);
  }
  function moveEditedPlayer(player: Player) {
    edit((d) => {
      d.absentIds = d.absentIds.includes(player.id)
        ? d.absentIds.filter((id) => id !== player.id)
        : [...d.absentIds, player.id];
      return d;
    });
    setEditor(null);
  }
  function setPosition(p: Position) {
    if (positionIndex === null) return;
    edit((d) => {
      const other = d.slots.findIndex((s) => s.position === p);
      [d.slots[positionIndex].position, d.slots[other].position] = [
        d.slots[other].position,
        d.slots[positionIndex].position,
      ];
      return d;
    });
    setPositionIndex(null);
  }
  function shift(index: number, delta: number) {
    edit((d) => {
      const target = index + delta;
      if (target < 0 || target >= 9) return d;
      [d.slots[index], d.slots[target]] = [d.slots[target], d.slots[index]];
      return d;
    });
  }
  async function createPdf(force = false) {
    const warnings = lineupWarnings(data);
    if (warnings.length && !force) {
      setPdfWarnings(warnings);
      return;
    }
    setPdfWarnings(null);
    setPdfBusy(true);
    try {
      const { generateMemberPdf } = await import("@/lib/pdf");
      const result = await generateMemberPdf(data);
      setPdfUrl(URL.createObjectURL(result.blob));
      setPdfName(result.name);
    } catch {
      setError("PDFを作成できませんでした。もう一度お試しください。");
    } finally {
      setPdfBusy(false);
    }
  }
  const activeCount =
      data.slots.filter((s) => s.playerId).length +
      (data.mode === "dh" && data.pitcher ? 1 : 0),
    bench = benchPlayers(data),
    absent = absentPlayers(data);
  const brand = (
    <button
      type="button"
      className="brand brand-button"
      onClick={() => setAppMenuOpen(true)}
      aria-label="YGメニューを開く"
    >
      <span className="brand-mark">Y</span>
      <span>
        YG <small>TEAM TOOLS</small>
      </span>
    </button>
  );
  if (auth !== "ready")
    return (
      <main className="login-page">
        <div className="login-brand">{brand}</div>
        <section className="login-card">
          <div className="lock-icon">
            <LockKeyhole size={28} />
          </div>
          <p className="eyebrow">TEAM MEMBERS ONLY</p>
          <h1>チームのメンバー表</h1>
          <p className="login-intro">
            共通パスワードでログインして、
            <br />
            試合のオーダーを準備しましょう。
          </p>
          {auth === "loading" ? (
            <p role="status">ログイン状態を確認しています…</p>
          ) : (
            <form onSubmit={login}>
              <label>
                チーム共通パスワード
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  maxLength={128}
                />
              </label>
              {loginError && (
                <p className="error-text" role="alert">
                  {loginError}
                </p>
              )}
              <button className="primary full" disabled={loginBusy}>
                {loginBusy ? "確認中…" : "ログイン"}
              </button>
            </form>
          )}
          <p className="login-note">
            <ShieldCheck size={16} />
            この端末のログイン状態を保持します
          </p>
        </section>
        <p className="login-footer">草野球の試合準備を、もっとスムーズに。</p>
      </main>
    );
  return (
    <main className="app-shell">
      <header className="topbar">
        {brand}
        <div className="header-right">
          <span className="team-badge">チーム共有</span>
          <button
            className="icon-button"
            aria-label="設定"
            onClick={() => setSettings(true)}
          >
            <Settings size={21} />
          </button>
        </div>
      </header>
      <div className="page-heading">
        <div>
          <p className="eyebrow">GAME DAY</p>
          <h1>メンバー表をつくる</h1>
          <p>
            {data.teamName} <span className="heading-separator">/</span>{" "}
            公式戦オーダー
          </p>
        </div>
        <button
          className="primary"
          onClick={() => void createPdf()}
          disabled={pdfBusy}
        >
          <FileDown size={19} />
          {pdfBusy ? "PDFを作成中…" : "メンバー表作成"}
        </button>
      </div>
      <nav className="tabs" aria-label="画面切替">
        <button
          className={tab === "order" ? "active" : ""}
          onClick={() => setTab("order")}
        >
          <GripVertical size={17} />
          オーダー
        </button>
        <button
          className={tab === "players" ? "active" : ""}
          onClick={() => setTab("players")}
        >
          <Users size={17} />
          登録選手
          <span className="count-badge">{data.players.length}</span>
        </button>
        <span
          className={`save-status ${saveState === "error" || saveState === "conflict" ? "bad" : ""}`}
          role="status"
        >
          {saveState === "saved" ? (
            <>
              <Check size={14} />
              保存済み
            </>
          ) : saveState === "saving" ? (
            "保存中…"
          ) : saveState === "dirty" ? (
            "変更あり"
          ) : (
            "未保存"
          )}
        </span>
      </nav>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          {saveState === "conflict" ? (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "画面上の未保存の変更を破棄し、最新データに置き換えますか？",
                  )
                )
                  void load().catch((e) => setError(e.message));
              }}
            >
              最新データを読み込む
            </button>
          ) : (
            <button
              onClick={() => {
                setError("");
                if (saveState === "error") setSaveState("dirty");
              }}
            >
              再試行
            </button>
          )}
        </div>
      )}
      {tab === "order" ? (
        <div className="workspace">
          <aside className={`panel match-panel ${infoOpen ? "info-open" : ""}`}>
            <button
              className="mobile-info-toggle"
              onClick={() => setInfoOpen(!infoOpen)}
              aria-expanded={infoOpen}
            >
              <CalendarDays size={19} />
              <span>
                {data.date.replaceAll("-", " / ")}
                <small>
                  {data.opponent ? `vs ${data.opponent}` : "試合情報を入力"}
                </small>
              </span>
              <ChevronDown size={18} />
            </button>
            <div className="match-fields">
              <h2>試合情報</h2>
              <label>
                大会名
                <button
                  className="combobox-trigger"
                  role="combobox"
                  aria-expanded={tournamentPicker}
                  onClick={() => {
                    setTournamentQuery("");
                    setTournamentPicker(true);
                  }}
                >
                  <span className={!data.tournament ? "placeholder" : ""}>
                    {data.tournament || "大会を検索・追加"}
                  </span>
                  <ChevronDown size={16} />
                </button>
              </label>
              <label>
                日付
                <Input
                  type="date"
                  value={data.date}
                  onChange={(e) =>
                    edit((d) => ({
                      ...d,
                      date: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                相手チーム名
                <button
                  className="combobox-trigger"
                  role="combobox"
                  aria-expanded={teamPicker}
                  onClick={() => {
                    setTeamQuery("");
                    setTeamPicker(true);
                  }}
                >
                  <span className={!data.opponent ? "placeholder" : ""}>
                    {data.opponent || "チームを検索・追加"}
                  </span>
                  <ChevronDown size={16} />
                </button>
              </label>
              <label>
                自チーム名
                <Input
                  maxLength={80}
                  value={data.teamName}
                  onChange={(e) =>
                    edit((d) => ({
                      ...d,
                      teamName: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                監督名
                <Input
                  maxLength={80}
                  value={data.manager}
                  onChange={(e) =>
                    edit((d) => ({
                      ...d,
                      manager: e.target.value,
                    }))
                  }
                  placeholder="監督名を入力"
                />
              </label>
              <div className="paper-note">
                <FileDown size={21} />
                <div>
                  <strong>A4横・3枚綴り</strong>
                  <p>提出用2枚と空欄1枚を出力</p>
                </div>
              </div>
            </div>
          </aside>
          <section className="order-panel">
            <div className="order-toolbar">
              <h2>オーダー</h2>
              <select
                className="mode-select"
                aria-label="試合のルール"
                value={data.mode}
                onChange={(e) =>
                  edit((d) =>
                    changeMode(d, e.target.value as "normal" | "dh", 9),
                  )
                }
              >
                <option value="normal">9人制</option>
                <option value="dh">DH制（10人）</option>
              </select>
            </div>
            <p className="drag-help">
              <GripVertical size={14} />
              打順・選手・守備はドラッグで入れ替え
            </p>
            <DndContext
              sensors={sensors}
              onDragEnd={dragEnd}
              collisionDetection={(args) =>
                closestCenter({
                  ...args,
                  droppableContainers: args.droppableContainers.filter(
                    (c) =>
                      c.data.current?.kind === args.active.data.current?.kind,
                  ),
                })
              }
            >
              <div className="section-title">
                <span>スターティングオーダー</span>
                <span>
                  {activeCount} / {data.mode === "dh" ? 10 : 9}
                </span>
              </div>
              <div className="column-labels">
                <span>打順</span>
                <span>選手 / 背番号</span>
                <span>守備</span>
              </div>
              <div className="lineup-list">
                {data.slots.map((slot, i) => {
                  const player = data.players.find(
                    (p) => p.id === slot.playerId,
                  );
                  return (
                    <div className="player-row" key={i}>
                      <DragButton
                        item={{
                          kind: "order",
                          key: String(i),
                        }}
                        className="order-number"
                        label={`${i + 1}番の打順を移動`}
                      >
                        <span>{i + 1}</span>
                        <GripVertical size={12} />
                      </DragButton>
                      <DragButton
                        item={{
                          kind: "player",
                          key: `slot:${i}`,
                        }}
                        className={`player-slot ${!player ? "empty" : ""}`}
                        label={`${i + 1}番 ${player?.name ?? "選手を選択"}`}
                        onClick={() => setPick(`slot:${i}`)}
                      >
                        <GripVertical size={16} />
                        <span className="player-name">
                          {player?.name ?? "選手を選択"}
                        </span>
                        <span className="jersey">
                          {player ? `#${player.number}` : "＋"}
                        </span>
                      </DragButton>
                      <DragButton
                        item={{
                          kind: "position",
                          key: String(i),
                        }}
                        className="position"
                        label={`${i + 1}番の守備 ${slot.position}`}
                        onClick={() => setPositionIndex(i)}
                      >
                        {slot.position}
                      </DragButton>
                    </div>
                  );
                })}
                {data.mode === "dh" && (
                  <div className="player-row pitcher-row">
                    <span className="pitcher-label">投</span>
                    <DragButton
                      item={{
                        kind: "player",
                        key: "pitcher",
                      }}
                      className={`player-slot ${!data.pitcher ? "empty" : ""}`}
                      label="DH制の投手を選択"
                      onClick={() => setPick("pitcher")}
                    >
                      <GripVertical size={16} />
                      <span className="player-name">
                        {data.players.find((p) => p.id === data.pitcher)
                          ?.name ?? "投手を選択"}
                      </span>
                      <span className="jersey">
                        {data.pitcher
                          ? `#${data.players.find((p) => p.id === data.pitcher)?.number}`
                          : "＋"}
                      </span>
                    </DragButton>
                    <span className="position fixed-position">投</span>
                  </div>
                )}
              </div>
              <div className="section-title bench-title">
                <span>ベンチ</span>
                <span>{bench.length}人</span>
              </div>
              <PlayerZone zone="bench">
                {bench.length ? (
                  <div className="bench-grid">
                    {bench.map((p) => (
                      <DragButton
                        key={p.id}
                        item={{
                          kind: "player",
                          key: `bench:${p.id}`,
                        }}
                        className="bench-player"
                        label={`控え ${p.name}`}
                        onClick={() => setEditor(p)}
                      >
                        <GripVertical size={15} />
                        <span>{p.name}</span>
                        <span className="jersey">#{p.number}</span>
                      </DragButton>
                    ))}
                  </div>
                ) : (
                  <div className="empty-bench">
                    <Users size={25} />
                    <p>
                      {data.players.length
                        ? "ここに移動するとベンチに戻せます"
                        : "選手を登録してオーダーを組みましょう"}
                    </p>
                  </div>
                )}
                <button
                  className="add-player-link"
                  onClick={() => setEditor("new")}
                  disabled={data.players.length >= 30}
                >
                  <Plus size={16} />
                  選手を登録 <span>{data.players.length}/30</span>
                </button>
              </PlayerZone>
              <div className="section-title absent-title">
                <span>不参加</span>
                <span>{absent.length}人</span>
              </div>
              <PlayerZone zone="absent">
                {absent.length ? (
                  <div className="bench-grid">
                    {absent.map((p) => (
                      <DragButton
                        key={p.id}
                        item={{
                          kind: "player",
                          key: `absent:${p.id}`,
                        }}
                        className="bench-player"
                        label={`不参加 ${p.name}`}
                        onClick={() => setEditor(p)}
                      >
                        <GripVertical size={15} />
                        <span>{p.name}</span>
                        <span className="jersey">#{p.number}</span>
                      </DragButton>
                    ))}
                  </div>
                ) : (
                  <div className="empty-absent">来ない選手をここに移動</div>
                )}
              </PlayerZone>
            </DndContext>
          </section>
        </div>
      ) : (
        <section className="panel roster-panel">
          <div className="roster-heading">
            <div>
              <h2>登録選手</h2>
              <p>名前と背番号を登録して、チームで共有。</p>
            </div>
            <button
              className="primary"
              onClick={() => setEditor("new")}
              disabled={data.players.length >= 30}
            >
              <Plus size={17} />
              選手を登録
            </button>
          </div>
          <div className="search-field">
            <Search size={18} />
            <Input
              value={rosterQuery}
              onChange={(e) => setRosterQuery(e.target.value)}
              placeholder="名前・背番号で検索"
              aria-label="登録選手を検索"
            />
          </div>
          {!data.players.length ? (
            <div className="roster-empty">
              <Users size={36} />
              <h3>まずは、チームの選手を登録</h3>
              <p>最大30人。登録した選手は何度でも使えます。</p>
              <button className="secondary" onClick={() => setEditor("new")}>
                <Plus size={16} />
                最初の選手を登録
              </button>
            </div>
          ) : (
            <div className="roster-list">
              {data.players
                .filter((p) =>
                  `${p.name} ${p.kana} ${p.number}`.includes(rosterQuery),
                )
                .map((p) => (
                  <button
                    className="roster-row"
                    key={p.id}
                    onClick={() => setEditor(p)}
                  >
                    <span className="roster-number">{p.number}</span>
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.kana || "ふりがな未登録"}</small>
                    </span>
                    <span className="roster-status">
                      {absent.some((a) => a.id === p.id)
                        ? "不参加"
                        : bench.some((b) => b.id === p.id)
                          ? "ベンチ"
                          : "スタメン"}
                    </span>
                    <Pencil size={16} />
                  </button>
                ))}
            </div>
          )}
          <p className="roster-count">{data.players.length} / 30人登録済み</p>
        </section>
      )}
      <footer>{data.teamName} · メンバー表</footer>
      <div className="mobile-bottom">
        <button
          className="mobile-nav"
          onClick={() => setTab(tab === "order" ? "players" : "order")}
        >
          <Users size={19} />
          {tab === "order" ? "選手登録" : "オーダー"}
        </button>
        <button
          className="primary"
          onClick={() => void createPdf()}
          disabled={pdfBusy}
        >
          <FileDown size={18} />
          {pdfBusy ? "作成中…" : "メンバー表作成"}
        </button>
      </div>
      <Modal
        open={reauth}
        onClose={() => setReauth(false)}
        title="再ログイン"
        description="編集内容を残したままログインし直します。"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoginBusy(true);
            try {
              await api("/api/auth", "POST", { password });
              setPassword("");
              setReauth(false);
              setSaveState("dirty");
              setError("");
            } catch (err) {
              setLoginError((err as Error).message);
            } finally {
              setLoginBusy(false);
            }
          }}
        >
          <label>
            チーム共通パスワード
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {loginError && <p role="alert">{loginError}</p>}
          <button className="primary full" disabled={loginBusy}>
            ログインして保存を再開
          </button>
        </form>
      </Modal>
      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor === "new" ? "選手を登録" : "選手を編集"}
        description="登録内容はチームの全端末に反映されます。"
      >
        {editor !== null && (
          <PlayerEditor
            key={typeof editor === "string" ? editor : editor.id}
            player={editor === "new" ? undefined : editor}
            onClose={() => setEditor(null)}
            location={
              editor === "new"
                ? undefined
                : absent.some((a) => a.id === editor.id)
                  ? "absent"
                  : bench.some((b) => b.id === editor.id)
                    ? "bench"
                    : "active"
            }
            onMove={
              editor === "new" ? undefined : () => moveEditedPlayer(editor)
            }
            onSave={(player) =>
              edit((d) => ({
                ...d,
                players: d.players.some((p) => p.id === player.id)
                  ? d.players.map((p) => (p.id === player.id ? player : p))
                  : [...d.players, player],
              }))
            }
            onDelete={
              editor === "new"
                ? undefined
                : () => {
                    if (
                      window.confirm(
                        `${editor.name}さんを名簿から削除しますか？`,
                      )
                    ) {
                      edit((d) => ({
                        ...d,
                        players: d.players.filter((p) => p.id !== editor.id),
                        slots: d.slots.map((s) =>
                          s.playerId === editor.id
                            ? { ...s, playerId: null }
                            : s,
                        ),
                        pitcher: d.pitcher === editor.id ? null : d.pitcher,
                        benchOrder: d.benchOrder.filter(
                          (id) => id !== editor.id,
                        ),
                        absentIds: d.absentIds.filter((id) => id !== editor.id),
                      }));
                      setEditor(null);
                    }
                  }
            }
          />
        )}
      </Modal>
      <Modal
        open={pick !== null}
        onClose={() => setPick(null)}
        title={
          pick === "pitcher"
            ? "投手を選択"
            : `${Number(pick?.slice(5)) + 1}番の選手を選択`
        }
        description="出場中の選手を選ぶと、その選手と入れ替わります。"
      >
        <Command>
          <CommandInput placeholder="名前・背番号で検索" />
          <CommandList>
            <CommandItem onSelect={() => selectPlayer(null)}>
              選択を解除してベンチへ戻す
            </CommandItem>
            {data.players.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.kana} ${p.number}`}
                onSelect={() => selectPlayer(p.id)}
              >
                <span>{p.name}</span>
                <span className="jersey">#{p.number}</span>
                <small>
                  {absent.some((a) => a.id === p.id)
                    ? "不参加"
                    : bench.some((b) => b.id === p.id)
                      ? "ベンチ"
                      : "出場中"}
                </small>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        {pick?.startsWith("slot:") && (
          <div className="move-actions">
            <button
              className="secondary"
              disabled={Number(pick.slice(5)) === 0}
              onClick={() => {
                shift(Number(pick.slice(5)), -1);
                setPick(null);
              }}
            >
              <ArrowUp size={16} />
              打順を上げる
            </button>
            <button
              className="secondary"
              disabled={Number(pick.slice(5)) === 8}
              onClick={() => {
                shift(Number(pick.slice(5)), 1);
                setPick(null);
              }}
            >
              <ArrowDown size={16} />
              打順を下げる
            </button>
          </div>
        )}
        {!data.players.length && (
          <button
            className="secondary"
            onClick={() => {
              setPick(null);
              setEditor("new");
            }}
          >
            選手を登録
          </button>
        )}
      </Modal>
      <Modal
        open={positionIndex !== null}
        onClose={() => setPositionIndex(null)}
        title="守備位置を変更"
        description="選んだ守備の選手と守備位置を交換します。"
      >
        <div className="position-grid">
          {POSITIONS.filter((p) =>
            data.mode === "normal" ? p !== "DH" : p !== "投",
          ).map((p) => (
            <button
              className={`position ${positionIndex !== null && data.slots[positionIndex].position === p ? "selected" : ""}`}
              key={p}
              onClick={() => setPosition(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={teamPicker}
        onClose={() => setTeamPicker(false)}
        title="相手チームを選択"
        description="登録済みのチームを検索、または新しく追加できます。"
      >
        <div className="picker-body">
          <Input
            value={teamQuery}
            onChange={(e) => setTeamQuery(e.target.value)}
            placeholder="チーム名を検索・入力"
            aria-label="チーム名を検索"
            maxLength={80}
          />
          <div className="picker-list">
            {data.opponents
              .filter((v) => v.toLowerCase().includes(teamQuery.toLowerCase()))
              .map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    edit((d) => ({ ...d, opponent: name }));
                    setTeamPicker(false);
                  }}
                >
                  {name}
                </button>
              ))}
            {teamQuery.trim() && !data.opponents.includes(teamQuery.trim()) && (
              <button
                onClick={() => {
                  const name = teamQuery.trim();
                  edit((d) => ({
                    ...d,
                    opponent: name,
                    opponents: [...d.opponents, name].slice(-200),
                  }));
                  setTeamPicker(false);
                }}
              >
                <Plus size={16} />「{teamQuery.trim()}
                」を追加
              </button>
            )}
            {!data.opponents.length && !teamQuery && (
              <p className="picker-empty">チーム名を入力すると追加できます。</p>
            )}
          </div>
        </div>
      </Modal>
      <Modal
        open={tournamentPicker}
        onClose={() => setTournamentPicker(false)}
        title="大会名を選択"
        description="過去の大会名を検索、または新しく追加できます。"
      >
        <div className="picker-body">
          <Input
            value={tournamentQuery}
            onChange={(e) => setTournamentQuery(e.target.value)}
            placeholder="大会名を検索・入力"
            aria-label="大会名を検索"
            maxLength={80}
          />
          <div className="picker-list">
            {data.tournaments
              .filter((v) =>
                v.toLowerCase().includes(tournamentQuery.toLowerCase()),
              )
              .map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    edit((d) => ({
                      ...d,
                      tournament: name,
                    }));
                    setTournamentPicker(false);
                  }}
                >
                  {name}
                </button>
              ))}
            {tournamentQuery.trim() &&
              !data.tournaments.includes(tournamentQuery.trim()) && (
                <button
                  onClick={() => {
                    const name = tournamentQuery.trim();
                    edit((d) => ({
                      ...d,
                      tournament: name,
                      tournaments: [...d.tournaments, name].slice(-200),
                    }));
                    setTournamentPicker(false);
                  }}
                >
                  <Plus size={16} />「{tournamentQuery.trim()}
                  」を追加
                </button>
              )}
            {!data.tournaments.length && !tournamentQuery && (
              <p className="picker-empty">大会名を入力すると追加できます。</p>
            )}
          </div>
        </div>
      </Modal>
      <Modal
        open={settings}
        onClose={() => setSettings(false)}
        title="チームの設定"
        description="共通パスワードを変更すると、ほかの端末は再ログインが必要です。"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (newPassword !== confirmPassword) {
              setSettingsMessage("新しいパスワードが一致しません。");
              return;
            }
            setSettingsBusy(true);
            try {
              await api("/api/auth", "PUT", {
                current: oldPassword,
                password: newPassword,
              });
              setOldPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setSettingsMessage(
                "パスワードを変更しました。チームに新しいパスワードをお知らせください。",
              );
            } catch (err) {
              setSettingsMessage((err as Error).message);
            } finally {
              setSettingsBusy(false);
            }
          }}
        >
          <label>
            現在のパスワード
            <Input
              required
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              maxLength={128}
            />
          </label>
          <label>
            新しいパスワード（12文字以上）
            <Input
              required
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label>
            新しいパスワード（確認）
            <Input
              required
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          {settingsMessage && <p role="status">{settingsMessage}</p>}
          <button className="primary full" disabled={settingsBusy}>
            パスワードを変更
          </button>
        </form>
        <button className="logout-button" onClick={() => void logout()}>
          <LogOut size={17} />
          この端末からログアウト
        </button>
        <p className="modal-description">
          ログイン状態は180日間保持し、利用時に延長します。ブラウザーのデータを消去した場合は再ログインが必要です。
        </p>
      </Modal>
      <Modal
        open={pdfWarnings !== null}
        onClose={() => setPdfWarnings(null)}
        title="未入力の項目があります"
        description="内容を確認してからメンバー表を作成してください。"
      >
        <ul className="warning-list">
          {pdfWarnings?.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        <button className="primary" onClick={() => void createPdf(true)}>
          空欄のままPDFを作成
        </button>
        <button
          className="secondary"
          onClick={() => {
            setPdfWarnings(null);
            setInfoOpen(true);
          }}
        >
          入力に戻る
        </button>
      </Modal>
      <Modal
        open={!!pdfUrl}
        onClose={() => setPdfUrl("")}
        title="メンバー表ができました"
        description="A4横・提出用2枚と空欄1枚です。"
      >
        <div className="pdf-ready">
          <FileDown size={42} />
          <p>{pdfName}</p>
        </div>
        <a className="primary full" href={pdfUrl} download={pdfName}>
          <FileDown size={18} />
          PDFを保存
        </a>
        <a
          className="secondary full"
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
        >
          PDFを開く・印刷する
        </a>
        <p className="modal-description">
          スマホではPDFを開き、共有メニューから保存・印刷できます。
        </p>
      </Modal>

      <Modal
        open={appMenuOpen}
        onClose={() => setAppMenuOpen(false)}
        title="YG チームメニュー"
        description="使用する機能を選択してください。"
      >
        <div className="app-launcher-grid">
          <button
            className="app-launcher-item active"
            onClick={() => setAppMenuOpen(false)}
          >
            <ClipboardList size={26} />
            <strong>メンバー表作成</strong>
            <small>試合のオーダーを作成</small>
          </button>

          <a className="app-launcher-item" href="/equipment">
            <Wrench size={26} />
            <strong>チーム道具管理</strong>
            <small>道具・個数・保管状況</small>
          </a>

          <a className="app-launcher-item" href="/stats">
            <BarChart3 size={26} />
            <strong>成績入力</strong>
            <small>試合・打撃・投手成績</small>
          </a>

          <button
            className="app-launcher-item"
            onClick={() => {
              setAppMenuOpen(false);
              setTab("players");
            }}
          >
            <Users size={26} />
            <strong>選手管理</strong>
            <small>選手登録・編集</small>
          </button>
        </div>
      </Modal>
    </main>
  );
}
