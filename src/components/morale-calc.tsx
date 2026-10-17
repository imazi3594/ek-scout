import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, CircleHelp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TOTAL_MS = 240 * 1000;
const URA_MS = 12.5 * 2400;
const BASE_MAX = [0, 12, 10, 8, 6];

type Kind = "spend" | "plus" | "gain" | "max3" | "speed125" | "speed166" | "kokoGain" | "kokoSpeed" | "gear";
type Act = { id: string; at: number; kind: Kind; n: number; label: string; unlock?: boolean };

const SCHOOLS: { kind: Kind; group: "士氣" | "琥煌"; side: "表" | "裏"; n: number; label: string }[] = [
  { kind: "max3", group: "士氣", side: "表", n: 3, label: "士氣・表・壱　最大＋3" },
  { kind: "gain", group: "士氣", side: "表", n: 1.25, label: "士氣・表・弐　＋1.25" },
  { kind: "speed125", group: "士氣", side: "表", n: 1.25, label: "士氣・表・参　速度×1.25" },
  { kind: "speed166", group: "士氣", side: "裏", n: 1.66, label: "士氣・裏・弐　速度×1.66／12.5C" },
  { kind: "kokoGain", group: "琥煌", side: "表", n: 1, label: "琥煌・表・弐　＋1" },
  { kind: "kokoSpeed", group: "琥煌", side: "裏", n: 1.66, label: "琥煌・裏・弐　速度×1.66／12.5C" },
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function show1(n: number) {
  return (Math.floor(n * 10 + 1e-6) / 10).toFixed(1);
}

function displayC(ms: number) {
  if (ms <= 0) return 0;
  return Math.min(99, Math.ceil(ms / 2400));
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const MORALE_STORE = "ek-morale-calc";
const MORALE_KINDS = new Set<Kind>(["spend", "plus", "gain", "max3", "speed125", "speed166", "kokoGain", "kokoSpeed", "gear"]);

type ActionGroup = "spend" | "mini" | "plus" | "minus" | "school" | "gear";
type MoraleDraft = {
  remain: number;
  factions: number;
  koyo: number;
  allies: number;
  spendAmount: number;
  plusAmount: number;
  minusAmount: number;
  mode: ActionGroup;
  unlock: boolean;
  mini: number;
  school: Kind;
  acts: Act[];
  deckLocked: boolean;
};

function loadMorale(): MoraleDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MORALE_STORE);
    if (!raw) return null;
    const data = JSON.parse(raw) as MoraleDraft;
    if (!data || !Array.isArray(data.acts)) return null;
    data.acts = data.acts.filter((act) => act && MORALE_KINDS.has(act.kind) && typeof act.at === "number");
    const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
    data.remain = num(data.remain, TOTAL_MS);
    data.factions = num(data.factions, 1);
    data.koyo = num(data.koyo, 0);
    data.allies = num(data.allies, 0);
    data.spendAmount = num(data.spendAmount, 6);
    data.plusAmount = num(data.plusAmount, 1);
    if (data.plusAmount < 0) data.plusAmount = 1;
    data.minusAmount = [1, 1.5, 2].includes(num(data.minusAmount, 2)) ? num(data.minusAmount, 2) : 2;
    data.mini = num(data.mini, 1);
    data.unlock = Boolean(data.unlock);
    const savedMode = data.mode as string;
    if (savedMode === "gear" || savedMode === "spend" || savedMode === "plus" || savedMode === "minus" || savedMode === "mini" || savedMode === "school") {
      data.mode = savedMode;
    } else if (SCHOOLS.some((entry) => entry.kind === savedMode)) {
      data.school = savedMode as Kind;
      data.mode = "school";
    } else data.mode = "spend";
    if (!MORALE_KINDS.has(data.school)) data.school = "max3";
    data.deckLocked = Boolean(data.deckLocked) || data.acts.length > 0 || data.remain < TOTAL_MS - 0.5;
    return data;
  } catch {
    return null;
  }
}

function simulate(
  acts: Act[],
  stop: number,
  factions: number,
  koyo: number,
  autoCost = 0,
  autoFrom = -1,
  watchCost = 0,
  watchFrom = -1,
  allies = 0,
) {
  const base = BASE_MAX[factions] ?? 10;
  let max = Math.min(15, base + allies);
  const opened = round2(koyo * 0.2);
  let morale = Math.min(max, opened);
  let overflow = round2(Math.max(0, opened - max));
  let live = overflow;
  let gained = opened;
  let used = 0;
  let real = 0;
  let perm125 = false;
  let uraFrom: number | null = null;
  let extra = 0;
  let ready: number | null = null;
  const short = new Set<string>();
  const ordered = [...acts].sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
  let cursor = TOTAL_MS;
  let index = 0;

  const mulNow = () => {
    let next = perm125 ? 1.25 : 1;
    if (uraFrom != null && cursor <= uraFrom && cursor > uraFrom - URA_MS) next = Math.max(next, 1.66);
    return next;
  };

  const addMorale = (n: number) => {
    gained = round2(gained + n);
    const next = round2(morale + n);
    if (next > max + 1e-9) {
      const over = round2(next - max);
      overflow = round2(overflow + over);
      live = round2(live + over);
      morale = max;
      return;
    }
    morale = next;
  };

  const note = () => {
    if (!watchCost || ready != null || cursor > watchFrom + 0.5) return;
    if (morale + 1e-9 >= watchCost) ready = cursor;
  };

  const takeAuto = () => {
    if (!autoCost || cursor > autoFrom - 0.5) return;
    while (morale + 1e-9 >= autoCost) {
      morale = round2(morale - autoCost);
      extra += 1;
    }
  };

  const tickReady = () => {
    let need = 1000 / mulNow();
    while (real + 0.01 >= need) {
      real -= need;
      addMorale(0.1);
      takeAuto();
      note();
      need = 1000 / mulNow();
    }
  };

  const regen = (to: number) => {
    while (cursor > to + 0.01) {
      tickReady();
      let limit = to;
      if (uraFrom != null) {
        const end = uraFrom - URA_MS;
        if (cursor > end + 0.01 && end > to) limit = end;
      }
      const need = 1000 / mulNow();
      const into = Math.max(0, need - real);
      if (into <= 0.01 || cursor - into <= limit + 0.01) {
        real += cursor - limit;
        cursor = limit;
        tickReady();
        if (limit === to) break;
        continue;
      }
      real = 0;
      cursor -= into;
      addMorale(0.1);
      takeAuto();
      note();
    }
    cursor = to;
    tickReady();
    note();
  };

  const apply = (act: Act) => {
    if (act.kind === "spend") {
      if (morale + 1e-9 < act.n) short.add(act.id);
      else {
        morale = round2(morale - act.n);
        used = round2(used + act.n);
        live = 0;
        if (act.unlock) max = 15;
      }
      return;
    }
    if (act.kind === "plus") {
      if (act.unlock) max = 15;
      if (act.n < 0) {
        morale = round2(Math.max(0, morale + act.n));
        if (morale + 1e-9 < max) live = 0;
      } else addMorale(act.n);
      return;
    }
    if (act.kind === "gain" || act.kind === "gear" || act.kind === "kokoGain") {
      addMorale(act.n);
      return;
    }
    if (act.kind === "max3") max = Math.min(15, round2(max + 3));
    if (act.kind === "speed125") perm125 = true;
    if (act.kind === "speed166" || act.kind === "kokoSpeed") uraFrom = act.at;
  };

  note();
  while (index < ordered.length && ordered[index].at >= stop) {
    const act = ordered[index];
    regen(act.at);
    apply(act);
    takeAuto();
    note();
    index += 1;
  }
  if (cursor > stop) regen(stop);
  note();
  return { morale: round2(morale), max, short, extra, ready, overflow: round2(overflow), live: round2(live), used: round2(used), gained: round2(gained) };
}

export function MoraleCalc({ onBack }: { onBack?: () => void }) {
  const [remain, setRemain] = useState(TOTAL_MS);
  const [factions, setFactions] = useState(1);
  const [koyo, setKoyo] = useState(0);
  const [allies, setAllies] = useState(0);
  const [spendAmount, setSpendAmount] = useState(6);
  const [plusAmount, setPlusAmount] = useState(1);
  const [minusAmount, setMinusAmount] = useState(2);
  const [mode, setMode] = useState<ActionGroup>("spend");
  const [unlock, setUnlock] = useState(false);
  const [mini, setMini] = useState(1);
  const [school, setSchool] = useState<Kind>("max3");
  const [acts, setActs] = useState<Act[]>([]);
  const [warn, setWarn] = useState<{ text: string; id: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [stratNote, setStratNote] = useState(false);
  const [stepFlash, setStepFlash] = useState<{ text: string; id: number } | null>(null);
  const [deckLocked, setDeckLocked] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [ready, setReady] = useState(false);
  const stratTip = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const saved = loadMorale();
    if (saved) {
      setRemain(saved.remain);
      setFactions(saved.factions);
      setKoyo(saved.koyo);
      setAllies(saved.allies);
      setSpendAmount(saved.spendAmount);
      setPlusAmount(saved.plusAmount);
      setMinusAmount(saved.minusAmount ?? 2);
      setMode(saved.mode);
      setUnlock(saved.unlock);
      setMini(saved.mini);
      setSchool(saved.school);
      setActs(saved.acts);
      setDeckLocked(saved.deckLocked);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const draft: MoraleDraft = { remain, factions, koyo, allies, spendAmount, plusAmount, minusAmount, mode, unlock, mini, school, acts, deckLocked };
    localStorage.setItem(MORALE_STORE, JSON.stringify(draft));
  }, [ready, remain, factions, koyo, allies, spendAmount, plusAmount, minusAmount, mode, unlock, mini, school, acts, deckLocked]);

  const clock = displayC(remain);
  useEffect(() => {
    if (!stratNote) return;
    const close = (event: PointerEvent) => {
      if (!stratTip.current?.contains(event.target as Node)) setStratNote(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [stratNote]);
  useEffect(() => {
    if (!warn) return;
    const id = window.setTimeout(() => setWarn(null), 1600);
    return () => window.clearTimeout(id);
  }, [warn]);
  const view = useMemo(() => simulate(acts, remain, factions, koyo, 0, -1, 0, -1, allies), [acts, remain, factions, koyo, allies]);
  const full = useMemo(() => simulate(acts, 0, factions, koyo, 0, -1, 0, -1, allies), [acts, factions, koyo, allies]);

  const move = (deltaMs: number) => setRemain((current) => Math.max(0, Math.min(TOTAL_MS, current + deltaMs)));
  const scrub = (ms: number) => {
    if (!deckLocked) return;
    setRemain(ms);
  };
  const nudge = (text: string, deltaMs: number) => {
    if (!deckLocked) return;
    move(deltaMs);
    setStepFlash({ text, id: Date.now() });
  };

  const reset = () => {
    setRemain(TOTAL_MS);
    setFactions(1);
    setKoyo(0);
    setAllies(0);
    setSpendAmount(6);
    setPlusAmount(1);
    setMinusAmount(2);
    setMode("spend");
    setUnlock(false);
    setMini(1);
    setSchool("max3");
    setActs([]);
    setDeckLocked(false);
    setResetAsk(false);
    localStorage.removeItem(MORALE_STORE);
  };

  const amount = mode === "spend" ? spendAmount : mode === "mini" ? mini : mode === "minus" ? minusAmount : plusAmount;
  const setAmount = mode === "spend" ? setSpendAmount : mode === "mini" ? setMini : mode === "minus" ? setMinusAmount : setPlusAmount;

  const placeMorale = () => {
    const shown = amount.toFixed(1);
    if ((mode === "spend" || mode === "mini") && view.morale + 1e-9 < amount) {
      setWarn({ text: `士氣不足。此刻 ${show1(view.morale)}，需要 ${shown}。`, id: Date.now() });
      return;
    }
    const cap = unlock && mode === "spend" ? "　上限變為15" : "";
    const signed = mode === "minus" ? -amount : amount;
    const label =
      mode === "spend"
        ? `計略 −${shown}${cap}`
        : mode === "mini"
          ? `短計 −${shown}`
          : `效果 ${signed < 0 ? "－" : "＋"}${shown}${cap}`;
    setActs((list) => [
      ...list,
      { id: uid(), at: remain, kind: mode === "plus" || mode === "minus" ? "plus" : "spend", n: signed, label, unlock: Boolean(cap) },
    ]);
    setUnlock(false);
  };

  const place = (kind: Kind, n: number, label: string) => {
    if (kind === "spend" && view.morale + 1e-9 < n) {
      setWarn({ text: `士氣不足。此刻 ${show1(view.morale)}，需要 ${n}。`, id: Date.now() });
      return;
    }
    setActs((list) => {
      const once = kind === "gear" || SCHOOLS.some((entry) => entry.kind === kind);
      if (once && list.some((act) => act.kind === kind)) return list;
      const item = SCHOOLS.find((entry) => entry.kind === kind);
      if (
        item &&
        list.some((act) =>
          SCHOOLS.some((entry) => entry.kind === act.kind && (entry.group !== item.group || entry.side !== item.side)),
        )
      ) {
        return list;
      }
      return [...list, { id: uid(), at: remain, kind, n, label }];
    });
  };

  const used = (kind: Kind) => acts.some((act) => act.kind === kind);
  const pickedSchool = SCHOOLS.find((entry) => used(entry.kind));
  const listed = [...acts].sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden" data-no-swipe="">
      <div className="relative shrink-0 bg-[#120e0a]">
        <div className="relative flex min-h-14 items-center px-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="relative z-10 inline-flex h-8 items-center gap-0.5 rounded-md bg-black/70 px-2.5 text-xs font-medium text-[#f6e7c1] shadow-[0_0_0_1px_rgba(198,161,90,0.45)]"
            >
              <ChevronLeft className="size-4" />
              返回
            </button>
          ) : (
            <span />
          )}
          <div className="pointer-events-none absolute inset-x-0 text-center">
            <p
              className={cn(
                "relative inline-block font-display text-4xl leading-none tabular-nums",
                clock <= 10 ? "morale-clock-late" : clock <= 20 ? "text-[#f5d84a]" : "text-[#f4efe4]",
              )}
            >
              {clock < 10 ? `0${clock}` : clock}
              {stepFlash ? (
                <span key={stepFlash.id} className="morale-step-flash absolute top-1/2 left-full ml-2 whitespace-nowrap text-base font-medium text-[#f5d84a]">
                  {stepFlash.text}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-[10px] leading-none text-[#c6a15a]">剩餘時間</p>
          </div>
          <p className="relative z-10 ml-auto pr-1 text-[10px] tracking-widest text-[#c6a15a]/70">僅供參考</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 px-3">
          {Array.from({ length: view.max }, (_, i) => {
            const filled = Math.floor(view.morale + 1e-9);
            const frac = view.morale - filled;
            const on = i < filled;
            const partial = i === filled && frac > 0.02;
            return (
              <span key={i} className="relative size-[18px] rounded-full border border-[#c6a15a] bg-[#1a140c]">
                {on ? <FullPip /> : null}
                {partial ? (
                  <span className="absolute inset-[2px] overflow-hidden rounded-full">
                    <span className="block h-full bg-[#e25822]/80" style={{ width: `${frac * 100}%` }} />
                  </span>
                ) : null}
              </span>
            );
          })}
        </div>
        <p className="pb-1 text-center text-[10px] tabular-nums tracking-wide text-[#c6a15a]">
          已使用 {show1(full.used)}　總獲得 {show1(full.gained)}
          {full.overflow > 0 ? <span className="text-[#e5484d]">（總溢出 {show1(full.overflow)}）</span> : null}
        </p>
      </div>
      <div className={cn("relative flex min-h-0 flex-1 flex-col bg-[#120e0a]", !deckLocked && "pointer-events-none opacity-40")}>
        <ActWindow
          remain={remain}
          acts={listed}
          short={full.short}
          expanded={expanded}
          onToggle={() => setExpanded((open) => !open)}
          onScrub={scrub}
          onDelete={(id) => setActs((list) => list.filter((item) => item.id !== id))}
          onClear={() => setActs([])}
        />
        {warn ? (
          <p className="pointer-events-none absolute inset-x-4 bottom-2 z-30 rounded-md bg-[#e5484d] px-3 py-2 text-center text-sm font-medium text-white shadow-lg">
            {warn.text}
          </p>
        ) : null}
      </div>
      <div className={cn("shrink-0 bg-[#120e0a]", !deckLocked && "pointer-events-none opacity-40")}>
        <div className="flex items-center gap-1 px-2 py-1">
          <div className="flex justify-start gap-1">
            <Scrub label="後退 10 秒" onClick={() => nudge("−10秒", 10000)} disabled={!deckLocked || remain >= TOTAL_MS}>
              <Tri dir="left" />
              <Tri dir="left" />
            </Scrub>
            <Scrub label="後退 1 秒" onClick={() => nudge("−1秒", 1000)} disabled={!deckLocked || remain >= TOTAL_MS}>
              <Tri dir="left" />
            </Scrub>
          </div>
          <TimeBar
            value={TOTAL_MS - remain}
            max={TOTAL_MS}
            onChange={(elapsed) => scrub(TOTAL_MS - elapsed)}
          />
          <div className="flex justify-end gap-1">
            <Scrub label="前進 1 秒" onClick={() => nudge("＋1秒", -1000)} disabled={!deckLocked || remain <= 0}>
              <Tri dir="right" />
            </Scrub>
            <Scrub label="前進 10 秒" onClick={() => nudge("＋10秒", -10000)} disabled={!deckLocked || remain <= 0}>
              <Tri dir="right" />
              <Tri dir="right" />
            </Scrub>
          </div>
        </div>
      </div>

      <div className={cn("shrink-0 bg-bg px-3 py-2.5 sm:px-6", expanded && "hidden")}>
        <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-xl tabular-nums leading-none text-fg">
              <span className="mr-1.5 text-sm font-normal text-faint">此刻士氣</span>
              {show1(view.morale)}
              <span className="text-sm text-muted">／{view.max}</span>
              {view.live > 0 ? (
                <span className="ml-1.5 text-xs font-normal text-[#e5484d]">（溢出 {show1(view.live)}）</span>
              ) : null}
            </p>
            <p className="mt-1 min-h-4 text-xs leading-4 text-faint">
              {deckLocked
                ? `勢力 ${factions === 4 ? "4+" : factions}　昂揚 ${Number.isInteger(koyo) ? koyo : koyo.toFixed(1)}　同盟 ${allies}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResetAsk(true)}
            className="plain-press h-8 shrink-0 rounded-md bg-faction-hi px-2.5 text-sm font-medium text-white"
          >
            重設
          </button>
        </div>

        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm font-medium text-[#c6a15a]">動作</span>
            <span className="h-px min-w-4 flex-1 bg-[#c6a15a]/40" aria-hidden />
          </div>
          <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_auto] items-center gap-x-2 gap-y-2.5">
          <select
            aria-label="動作"
            value={mode}
            onChange={(event) => {
              const next = event.target.value as ActionGroup;
              setMode(next);
              setStratNote(false);
              if (next === "school") {
                const open = SCHOOLS.find(
                  (entry) => !used(entry.kind) && (!pickedSchool || (entry.group === pickedSchool.group && entry.side === pickedSchool.side)),
                );
                if (open) setSchool(open.kind);
              }
            }}
            className="plain-press h-9 w-full truncate rounded-md bg-surface-2 px-1 text-sm text-fg"
          >
            <option value="spend">計略</option>
            <option value="mini">短計</option>
            <option value="plus">效果(增加)</option>
            <option value="minus">效果(減少)</option>
            <option value="school">流派</option>
            <option value="gear">戰器</option>
          </select>
          {mode === "school" ? (
            <select
              aria-label="流派"
              value={school}
              onChange={(event) => setSchool(event.target.value as Kind)}
              className="plain-press h-9 w-full truncate rounded-md bg-surface-2 px-1 text-sm text-fg"
            >
              {SCHOOLS.map((entry) => (
                <option
                  key={entry.kind}
                  value={entry.kind}
                  disabled={used(entry.kind) || Boolean(pickedSchool && (entry.group !== pickedSchool.group || entry.side !== pickedSchool.side))}
                >
                  {used(entry.kind) ? `${entry.label}（已發動）` : entry.label}
                </option>
              ))}
            </select>
          ) : mode === "gear" ? (
            <select aria-label="戰器" value="gear" disabled={used("gear")} className="plain-press h-9 w-full truncate rounded-md bg-surface-2 px-1 text-sm text-fg disabled:opacity-40">
              <option value="gear">{used("gear") ? "已發動" : "＋0.75"}</option>
            </select>
          ) : (
            <select
              aria-label="士氣"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="plain-press h-9 w-full truncate rounded-md bg-surface-2 px-1 text-sm text-fg"
            >
              {(mode === "spend"
                ? Array.from({ length: 15 }, (_, index) => index + 1)
                : mode === "mini"
                  ? [0.5, 1, 1.5, 2]
                  : mode === "minus"
                    ? [1, 1.5, 2]
                    : Array.from({ length: 24 }, (_, index) => (index + 1) / 2)
              ).map((n) => (
                <option key={n} value={n}>
                  {mode === "plus" ? `＋${n.toFixed(1)}` : `－${n.toFixed(1)}`}
                </option>
              ))}
            </select>
          )}
          <Add
            disabled={
              !deckLocked ||
              (mode === "gear"
                ? used("gear")
                : mode === "school"
                  ? used(school) || Boolean(pickedSchool && SCHOOLS.some((entry) => entry.kind === school && (entry.group !== pickedSchool.group || entry.side !== pickedSchool.side)))
                  : false)
            }
            onClick={() => {
              if (mode === "spend" || mode === "mini" || mode === "plus" || mode === "minus") {
                placeMorale();
                return;
              }
              if (mode === "gear") {
                place("gear", 0.75, "戰器 ＋0.75");
                setUnlock(false);
                return;
              }
              const entry = SCHOOLS.find((item) => item.kind === school);
              if (entry) {
                place(entry.kind, entry.n, entry.label);
                setUnlock(false);
              }
            }}
          >
            輸入
          </Add>
          <span ref={stratTip} className="relative col-start-1 flex h-5 items-center justify-start">
            {mode === "plus" || mode === "minus" || mode === "school" ? (
              <>
                <button
                  type="button"
                  aria-label="動作說明"
                  aria-expanded={stratNote}
                  onClick={() => setStratNote((open) => !open)}
                  className="grid size-5 place-items-center text-muted"
                >
                  <CircleHelp className="size-4" />
                </button>
                {stratNote ? (
                  <p className="absolute left-5 top-1/2 z-30 ml-1 w-44 -translate-y-1/2 rounded-md border border-white/10 bg-[#2a221c] px-2.5 py-2 text-xs font-normal leading-snug text-fg">
                    {mode === "plus"
                      ? "效果為增加士氣的計略效果"
                      : mode === "minus"
                        ? "效果為減少士氣的計略效果"
                        : "實際可發動時間以遊戲情況為準"}
                  </p>
                ) : null}
              </>
            ) : null}
          </span>
          <span className="col-start-2 flex h-5 items-center">
            {mode === "spend" ? (
              <label className="flex items-center gap-1.5 text-sm text-faint">
                <input
                  type="checkbox"
                  checked={unlock}
                  onChange={(event) => setUnlock(event.target.checked)}
                  className="size-4 accent-[#c6a15a]"
                  aria-label="解放士氣上限"
                />
                解放士氣上限
              </label>
            ) : null}
          </span>
        </div>
        </div>
        {!deckLocked ? (
          <div className="absolute inset-0 z-20 flex flex-col justify-center gap-3 bg-bg">
            <p className="text-center text-base text-fg">請設定卡組</p>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-faint">勢力</span>
              <select
                aria-label="勢力"
                value={factions}
                onChange={(event) => setFactions(Number(event.target.value))}
                className="plain-press h-9 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4+</option>
              </select>
              <span className="shrink-0 text-sm text-faint">昂揚</span>
              <select
                aria-label="昂揚"
                value={koyo}
                onChange={(event) => setKoyo(Number(event.target.value))}
                className="plain-press h-9 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
              >
                {Array.from({ length: 19 }, (_, i) => i / 2).map((n) => (
                  <option key={n} value={n}>
                    {Number.isInteger(n) ? n : n.toFixed(1)}
                  </option>
                ))}
              </select>
              <span className="shrink-0 text-sm text-faint">同盟</span>
              <select
                aria-label="同盟"
                value={allies}
                onChange={(event) => setAllies(Number(event.target.value))}
                className="plain-press h-9 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
              >
                {Array.from({ length: 10 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setDeckLocked(true)}
              className="plain-press mx-auto h-11 w-44 rounded-md bg-[#c6a15a] text-base font-medium text-[#1a140c]"
            >
              開始使用
            </button>
          </div>
        ) : null}
        {resetAsk ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55">
            <div className="w-56 rounded-lg bg-[#1c1814] px-4 py-4 text-center shadow-lg">
              <p className="text-sm text-fg">確定重設？</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetAsk(false)}
                  className="plain-press h-9 flex-1 rounded-md bg-surface-2 text-sm text-fg"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetAsk(false);
                    reset();
                  }}
                  className="plain-press h-9 flex-1 rounded-md bg-[#e5484d] text-sm font-medium text-white"
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
    </div>
  );
}

function FullPip() {
  const [delay] = useState(() => `-${Date.now() % 1100}ms`);
  return <span className="morale-pip-full absolute inset-[2px] rounded-full" style={{ animationDelay: delay }} />;
}

const PX_PER_SEC = 4;
const WINDOW_H = 188;

function ActWindow({
  remain,
  acts,
  short,
  expanded,
  onToggle,
  onScrub,
  onDelete,
  onClear,
}: {
  remain: number;
  acts: Act[];
  short: Set<string>;
  expanded: boolean;
  onToggle: () => void;
  onScrub: (ms: number) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; remain: number } | null>(null);
  const [height, setHeight] = useState(WINDOW_H);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const measure = () => {
      const next = node.clientHeight || WINDOW_H;
      setHeight((current) => (Math.abs(current - next) < 1 ? current : next));
    };
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(node);
    return () => watcher.disconnect();
  }, [expanded]);
  const span = (TOTAL_MS / 1000) * PX_PER_SEC;
  const pad = height / 2;
  const yOf = (ms: number) => pad + ((TOTAL_MS - ms) / 1000) * PX_PER_SEC;
  const shift = yOf(remain) - height / 2;
  const labels = [99, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];
  const ticks = Array.from({ length: 100 }, (_, index) => 99 - index);
  const placed: number[] = [];
  return (
    <div className="relative flex min-h-0 flex-1 flex-col px-2">
      <div
        ref={frame}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden rounded-md bg-[#1a140c] shadow-[inset_0_0_0_1px_rgba(198,161,90,0.28)]"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          drag.current = { y: event.clientY, remain };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const next = drag.current.remain + ((event.clientY - drag.current.y) / PX_PER_SEC) * 1000;
          onScrub(Math.max(0, Math.min(TOTAL_MS, Math.round(next / 1000) * 1000)));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        {acts.length ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-1.5 top-1.5 z-20 rounded-md bg-[#3d6b8c] px-2 py-0.5 text-[11px] font-medium text-white"
          >
            清空
          </button>
        ) : null}
        <div className="pointer-events-none absolute inset-x-2 top-1/2 z-20 h-px -translate-y-1/2 bg-[#e25822]/45" />
        <div className="pointer-events-none absolute bottom-6 right-1.5 top-7 z-20 flex flex-col items-center justify-between text-[#c6a15a]/55">
          <ChevronUp className="size-3.5" />
          <ChevronDown className="size-3.5" />
        </div>
        <div className="absolute inset-x-0 top-0" style={{ height: pad * 2 + span, transform: `translateY(${-shift}px)` }}>
          <div className="absolute bottom-0 left-[3.55rem] top-0 w-px bg-[#c6a15a]/40" />
          {ticks.map((c) => {
            const major = c % 10 === 0 || c === 99;
            return (
              <span
                key={c}
                className={cn(
                  "absolute -translate-y-1/2 bg-[#c6a15a]",
                  major ? "left-[2.7rem] h-[2px] w-3.5" : "left-[3.15rem] h-px w-1.5 opacity-50",
                )}
                style={{ top: yOf(c === 0 ? 0 : c * 2400) }}
              />
            );
          })}
          {labels.map((c) => (
            <span
              key={c}
              className={cn(
                "absolute left-0 w-10 -translate-y-1/2 text-right tabular-nums leading-none text-[#e8c56a]",
                c % 10 === 0 || c === 99 ? "text-sm font-medium" : "text-[10px]",
              )}
              style={{ top: yOf(c === 0 ? 0 : c * 2400) }}
            >
              {c}C
            </span>
          ))}
          {[...acts]
            .sort((a, b) => b.at - a.at)
            .map((act) => {
              let top = yOf(act.at);
              const last = placed[placed.length - 1];
              if (last != null && top < last + 22) top = last + 22;
              placed.push(top);
              const lacking = short.has(act.id);
              const tone = lacking
                ? "bg-[#3a3a3a] text-[#8d8d8d]"
                : act.kind === "gear"
                  ? "bg-[#3a2748] text-[#e4c4f5]"
                  : act.kind === "spend" || act.kind === "plus"
                    ? "bg-[#3d321c] text-[#f3dd9a]"
                    : "bg-[#1c3344] text-[#b7dff2]";
              return (
                <div key={act.id} className="absolute left-[4.1rem] right-2 flex -translate-y-1/2 items-center" style={{ top }}>
                  <div className={cn("flex min-w-0 max-w-full items-center gap-1 rounded px-1.5 py-0.5", tone)}>
                    <span className="w-8 shrink-0 text-[10px] tabular-nums opacity-80">{displayC(act.at)}C</span>
                    <span className="min-w-0 truncate text-[11px]">{act.label}</span>
                    {lacking ? <span className="shrink-0 text-[10px] text-[#e5484d]">不足</span> : null}
                    <button
                      type="button"
                      aria-label="刪除"
                      onClick={() => onDelete(act.id)}
                      className="grid size-4 shrink-0 place-items-center opacity-70"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      <button
        type="button"
        aria-label={expanded ? "收起" : "展開"}
        onClick={onToggle}
        className="absolute bottom-0 left-1/2 z-20 flex h-4 w-10 -translate-x-1/2 items-center justify-center rounded-t-md bg-[#c6a15a] text-[#1a140c]"
      >
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
    </div>
  );
}

function TimeBar({ value, max, onChange }: { value: number; max: number; onChange: (ms: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const pick = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return;
    const next = Math.round(((clientX - box.left) / box.width) * max / 1000) * 1000;
    onChange(Math.min(max, Math.max(0, next)));
  };
  return (
    <div
      ref={ref}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="時間"
      className="relative h-8 min-w-0 flex-1 touch-none rounded-[3px] bg-[#2a2118]"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pick(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event.clientX);
      }}
    >
      <div className="absolute inset-y-0 left-0 rounded-[3px] bg-[#c6a15a]/40" style={{ width: `${ratio * 100}%` }} />
      <div
        className="absolute top-1 bottom-1 w-3 -translate-x-1/2 rounded-[2px] bg-[#f4efe4]"
        style={{ left: `${ratio * 100}%` }}
      />
    </div>
  );
}

function Tri({ dir }: { dir: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block h-0 w-0 border-y-[6px] border-y-transparent",
        dir === "left" ? "border-r-[9px] border-r-current" : "border-l-[9px] border-l-current",
      )}
    />
  );
}

function Scrub({
  children,
  label,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 min-w-8 items-center justify-center gap-0.5 rounded-md bg-[#2a2118] px-2 text-[#f4efe4] disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Add({ children, onClick, disabled }: { children: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="plain-press h-9 shrink-0 rounded-md bg-[#c6a15a] px-3 text-sm font-medium text-[#1a140c] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
