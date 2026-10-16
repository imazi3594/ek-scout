import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsLeft, ChevronsRight, CircleHelp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TOTAL_MS = 99 * 2400;
const URA_MS = 12.5 * 2400;
const BASE_MAX = [0, 12, 10, 8, 6];

type Kind = "spend" | "plus" | "capStrat" | "gain" | "max3" | "speed125" | "speed166" | "kokoGain" | "kokoSpeed" | "gear";
type Act = { id: string; at: number; kind: Kind; n: number; label: string; cap?: "set15" | "plus9" };

const CAP_STRATS: { id: string; name: string; cost: number; cap: "set15" | "plus9"; needFactions?: number }[] = [
  { id: "oogami", name: "快刀乱麻", cost: 6, cap: "set15" },
  { id: "mouri", name: "西照らす残光", cost: 5, cap: "plus9", needFactions: 2 },
  { id: "nagi", name: "心眼の撫子", cost: 6, cap: "plus9" },
  { id: "yoshiaki", name: "信長包囲網", cost: 6, cap: "plus9" },
];

const SCHOOLS: { kind: Kind; group: "士氣" | "琥煌"; side: "表" | "裏"; n: number; label: string }[] = [
  { kind: "max3", group: "士氣", side: "表", n: 3, label: "士氣・表・壱　最大＋3" },
  { kind: "gain", group: "士氣", side: "表", n: 1.25, label: "士氣・表・弐　＋1.25" },
  { kind: "speed125", group: "士氣", side: "表", n: 1.25, label: "士氣・表・参　速度×1.25" },
  { kind: "speed166", group: "士氣", side: "裏", n: 1.66, label: "士氣・裏・弐　速度×1.66／12.5C" },
  { kind: "kokoGain", group: "琥煌", side: "表", n: 1, label: "琥煌・表・弐　＋1" },
  { kind: "kokoSpeed", group: "琥煌", side: "裏", n: 1.66, label: "琥煌・裏・弐　速度×1.66／12.5C" },
];

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function displayC(ms: number) {
  if (ms <= 0) return 0;
  return Math.min(99, Math.ceil(ms / 2400));
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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
  const opened = round1(koyo * 0.2);
  let morale = Math.min(max, opened);
  let overflow = round1(Math.max(0, opened - max));
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
    gained = round1(gained + n);
    const next = round1(morale + n);
    if (next > max + 1e-9) {
      overflow = round1(overflow + (next - max));
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
      morale = round1(morale - autoCost);
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
        morale = round1(morale - act.n);
        used = round1(used + act.n);
      }
      return;
    }
    if (act.kind === "gain" || act.kind === "gear" || act.kind === "kokoGain" || act.kind === "plus") {
      addMorale(act.n);
      return;
    }
    if (act.kind === "max3") max = Math.min(15, round1(max + 3));
    if (act.kind === "capStrat") {
      if (morale + 1e-9 < act.n) {
        short.add(act.id);
        return;
      }
      morale = round1(morale - act.n);
      used = round1(used + act.n);
      max = act.cap === "set15" ? Math.max(max, 15) : Math.min(15, round1(max + 9));
    }
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
  return { morale: round1(morale), max, short, extra, ready, overflow: round1(overflow), used: round1(used), gained: round1(gained) };
}

export function MoraleCalc({ onBack }: { onBack?: () => void }) {
  const [remain, setRemain] = useState(TOTAL_MS);
  const [factions, setFactions] = useState(1);
  const [koyo, setKoyo] = useState(0);
  const [allies, setAllies] = useState(0);
  const [strat, setStrat] = useState(6);
  const [plus, setPlus] = useState(1);
  const [capId, setCapId] = useState(CAP_STRATS[0].id);
  const [mini, setMini] = useState(2);
  const [school, setSchool] = useState<Kind>("max3");
  const [acts, setActs] = useState<Act[]>([]);
  const [warn, setWarn] = useState<{ text: string; id: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [schoolNote, setSchoolNote] = useState(false);
  const schoolTip = useRef<HTMLSpanElement>(null);

  const clock = displayC(remain);
  useEffect(() => {
    if (!schoolNote) return;
    const close = (event: PointerEvent) => {
      if (!schoolTip.current?.contains(event.target as Node)) setSchoolNote(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [schoolNote]);
  useEffect(() => {
    if (!warn) return;
    const id = window.setTimeout(() => setWarn(null), 1600);
    return () => window.clearTimeout(id);
  }, [warn]);
  const view = useMemo(() => simulate(acts, remain, factions, koyo, 0, -1, 0, -1, allies), [acts, remain, factions, koyo, allies]);
  const full = useMemo(() => simulate(acts, 0, factions, koyo, 0, -1, 0, -1, allies), [acts, factions, koyo, allies]);

  const move = (deltaMs: number) => setRemain((current) => Math.max(0, Math.min(TOTAL_MS, current + deltaMs)));

  const reset = () => {
    setRemain(TOTAL_MS);
    setFactions(1);
    setKoyo(0);
    setAllies(0);
    setStrat(6);
    setPlus(1);
    setCapId(CAP_STRATS[0].id);
    setMini(2);
    setSchool("max3");
    setActs([]);
  };

  const placeCap = () => {
    const item = CAP_STRATS.find((entry) => entry.id === capId) ?? CAP_STRATS[0];
    if (item.needFactions && factions < item.needFactions) {
      setWarn({ text: `${item.name} 需要 ${item.needFactions} 勢力以上。`, id: Date.now() });
      return;
    }
    if (view.morale + 1e-9 < item.cost) {
      setWarn({ text: `士氣不足。此刻 ${view.morale.toFixed(1)}，需要 ${item.cost}。`, id: Date.now() });
      return;
    }
    setActs((list) => [
      ...list,
      { id: uid(), at: remain, kind: "capStrat", n: item.cost, label: `${item.name}　士氣−${item.cost}`, cap: item.cap },
    ]);
  };

  const place = (kind: Kind, n: number, label: string) => {
    if (kind === "spend" && view.morale + 1e-9 < n) {
      setWarn({ text: `士氣不足。此刻 ${view.morale.toFixed(1)}，需要 ${n}。`, id: Date.now() });
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
  const schoolOptions = SCHOOLS.filter(
    (entry) => !used(entry.kind) && (!pickedSchool || (entry.group === pickedSchool.group && entry.side === pickedSchool.side)),
  );
  const schoolPick = schoolOptions.find((entry) => entry.kind === school) ?? schoolOptions[0];
  const listed = [...acts].sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden" data-no-swipe="">
      <div className="relative shrink-0 bg-[#120e0a]">
        <div className="grid grid-cols-[auto_1fr_auto] items-center px-2 pt-0.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-8 items-center gap-0.5 rounded-md bg-black/70 px-2.5 text-xs font-medium text-[#f6e7c1] shadow-[0_0_0_1px_rgba(198,161,90,0.45)]"
            >
              <ChevronLeft className="size-4" />
              返回
            </button>
          ) : (
            <span />
          )}
          <div className="text-center">
            <p className="font-display text-4xl leading-none tabular-nums text-[#f4efe4]">{clock}</p>
            <p className="mt-1 text-xs leading-none text-[#c6a15a]">剩餘時間</p>
          </div>
          <p className="pr-1 text-[10px] tracking-widest text-[#c6a15a]/70">只供參考</p>
        </div>
        <div className="flex items-start gap-1 px-2 pb-1">
          <div className="flex justify-start gap-1">
            <Scrub label="後退 10 秒" hint="−10秒" onClick={() => move(10000)} disabled={remain >= TOTAL_MS}>
              <ChevronsLeft className="size-4" />
            </Scrub>
            <Scrub label="後退 1 秒" hint="−1秒" onClick={() => move(1000)} disabled={remain >= TOTAL_MS}>
              <ChevronLeft className="size-4" />
            </Scrub>
          </div>
          <TimeBar
            value={TOTAL_MS - remain}
            max={TOTAL_MS}
            onChange={(elapsed) => setRemain(TOTAL_MS - elapsed)}
          />
          <div className="flex justify-end gap-1">
            <Scrub label="前進 1 秒" hint="＋1秒" onClick={() => move(-1000)} disabled={remain <= 0}>
              <ChevronRight className="size-4" />
            </Scrub>
            <Scrub label="前進 10 秒" hint="＋10秒" onClick={() => move(-10000)} disabled={remain <= 0}>
              <ChevronsRight className="size-4" />
            </Scrub>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 px-3 pb-1">
          {Array.from({ length: view.max }, (_, i) => {
            const full = Math.floor(view.morale + 1e-9);
            const frac = view.morale - full;
            const on = i < full;
            const partial = i === full && frac > 0.02;
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
          已使用 {view.used.toFixed(1)}　總獲得 {view.gained.toFixed(1)}
          {view.overflow > 0 ? <span className="text-[#e5484d]">（溢出 {view.overflow.toFixed(1)}）</span> : null}
        </p>
      </div>
      <div className={cn("relative flex flex-col bg-[#120e0a]", expanded ? "min-h-0 flex-1" : "shrink-0")}>
        <ActWindow
          remain={remain}
          acts={listed}
          short={full.short}
          expanded={expanded}
          onToggle={() => setExpanded((open) => !open)}
          onScrub={setRemain}
          onDelete={(id) => setActs((list) => list.filter((item) => item.id !== id))}
          onClear={() => setActs([])}
        />
        {warn ? (
          <p className="pointer-events-none absolute inset-x-4 bottom-0 z-30 translate-y-full rounded-md bg-[#e5484d] px-3 py-2 text-center text-sm font-medium text-white shadow-lg">
            {warn.text}
          </p>
        ) : null}
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto bg-bg px-3 py-1.5 sm:px-6", expanded && "hidden")}>
        <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-xl tabular-nums leading-none text-fg">
            <span className="mr-1.5 text-xs font-normal text-faint">此刻</span>
            {view.morale.toFixed(1)}
            <span className="text-base text-muted">／{view.max}</span>
          </p>
          <button
            type="button"
            onClick={reset}
            className="plain-press h-7 shrink-0 rounded-md bg-faction-hi px-2.5 text-xs font-medium text-white"
          >
            重設
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-xs text-faint">勢力</span>
          <select
            aria-label="勢力"
            value={factions}
            onChange={(event) => setFactions(Number(event.target.value))}
            className="plain-press h-8 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4+</option>
          </select>
          <span className="shrink-0 text-xs text-faint">昂揚</span>
          <select
            aria-label="昂揚"
            value={koyo}
            onChange={(event) => setKoyo(Number(event.target.value))}
            className="plain-press h-8 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
          >
            {Array.from({ length: 19 }, (_, i) => i / 2).map((n) => (
              <option key={n} value={n}>
                {Number.isInteger(n) ? n : n.toFixed(1)}
              </option>
            ))}
          </select>
          <span className="shrink-0 text-xs text-faint">同盟</span>
          <select
            aria-label="同盟"
            value={allies}
            onChange={(event) => setAllies(Number(event.target.value))}
            className="plain-press h-8 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
          >
            {Array.from({ length: 10 }, (_, n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <Row label="使用士氣">
          <Stepper value={strat} min={1} max={15} step={1} onChange={setStrat} />
          <Add onClick={() => place("spend", strat, `使用士氣 −${strat}`)}>輸入</Add>
        </Row>

        <Row label="短計">
          <Stepper value={mini} min={0.5} max={2} step={0.5} onChange={setMini} />
          <Add onClick={() => place("spend", mini, `短計 −${mini}`)}>輸入</Add>
        </Row>

        <Row label="增加士氣">
          <Stepper value={plus} min={0.5} max={12} step={0.5} onChange={setPlus} />
          <Add onClick={() => place("plus", plus, `增加士氣 ＋${Number.isInteger(plus) ? plus : plus.toFixed(1)}`)}>輸入</Add>
        </Row>

        <div className="flex items-center gap-2">
          <span className="w-[4.75rem] shrink-0 whitespace-nowrap text-xs leading-none text-faint">增加上限</span>
          <select
            aria-label="增加上限"
            value={capId}
            onChange={(event) => setCapId(event.target.value)}
            className="plain-press h-8 min-w-0 flex-1 truncate rounded-md bg-surface-2 px-2 text-xs text-fg"
          >
            {CAP_STRATS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}　士氣−{entry.cost}
              </option>
            ))}
          </select>
          <Add onClick={placeCap}>輸入</Add>
        </div>

        <div className="flex items-center gap-2">
          <span ref={schoolTip} className="relative flex w-[4.75rem] shrink-0 items-center gap-0.5 whitespace-nowrap text-xs leading-none text-faint">
            流派
            <button
              type="button"
              aria-label="流派說明"
              aria-expanded={schoolNote}
              onClick={() => setSchoolNote((open) => !open)}
              className="grid size-4 place-items-center text-muted"
            >
              <CircleHelp className="size-3.5" />
            </button>
            {schoolNote ? (
              <p className="absolute left-0 top-full z-30 mt-1 w-44 rounded-md border border-white/10 bg-[#2a221c] px-2.5 py-2 text-[11px] font-normal leading-snug text-fg">
                實際可發動時間以遊戲情況為準
              </p>
            ) : null}
          </span>
          <select
            value={schoolPick?.kind ?? ""}
            disabled={!schoolPick}
            onChange={(event) => setSchool(event.target.value as Kind)}
            className="plain-press h-8 min-w-0 flex-1 rounded-md bg-surface-2 px-2 text-xs text-fg disabled:opacity-40"
          >
            {schoolOptions.map((entry) => (
              <option key={entry.kind} value={entry.kind}>
                {entry.label}
              </option>
            ))}
            {!schoolPick ? <option value="">已用完</option> : null}
          </select>
          <Add
            disabled={!schoolPick}
            onClick={() => schoolPick && place(schoolPick.kind, schoolPick.n, schoolPick.label)}
          >
            輸入
          </Add>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-[4.75rem] shrink-0 whitespace-nowrap text-xs leading-none text-faint">戰器</span>
          <span className={cn("flex h-8 min-w-0 flex-1 items-center rounded-md bg-surface-2 px-2 text-xs text-fg", used("gear") && "opacity-40")}>
            {used("gear") ? "已用完" : "＋0.75"}
          </span>
          <Add disabled={used("gear")} onClick={() => place("gear", 0.75, "戰器 ＋0.75")}>
            輸入
          </Add>
        </div>
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
    <div className={cn("flex flex-col px-2 pb-1", expanded ? "min-h-0 flex-1" : "h-32 shrink-0")}>
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
              return (
                <div key={act.id} className="absolute left-[4.1rem] right-2 flex -translate-y-1/2 items-center" style={{ top }}>
                  <div className="flex min-w-0 max-w-full items-center gap-1 rounded bg-[#2a2118] px-1.5 py-0.5">
                    <span className="w-8 shrink-0 text-[10px] tabular-nums text-[#c6a15a]">{displayC(act.at)}C</span>
                    <span className="min-w-0 truncate text-[11px] text-[#f4efe4]">{act.label}</span>
                    {short.has(act.id) ? <span className="shrink-0 text-[10px] text-[#e5484d]">不足</span> : null}
                    <button
                      type="button"
                      aria-label="刪除"
                      onClick={() => onDelete(act.id)}
                      className="grid size-4 shrink-0 place-items-center text-[#c6a15a]"
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
        className="relative z-20 mx-auto -mt-px flex h-6 w-1/2 items-center justify-center gap-1 rounded-b-md bg-[#c6a15a] text-xs font-medium text-[#1a140c]"
      >
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        {expanded ? "收起" : "展開"}
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

function Scrub({
  children,
  label,
  hint,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className="grid size-8 place-items-center rounded-md bg-[#2a2118] text-[#f4efe4] disabled:opacity-30"
      >
        {children}
      </button>
      <span className="mt-0.5 whitespace-nowrap text-[10px] tabular-nums text-[#c6a15a]">{hint}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-[4.75rem] shrink-0 whitespace-nowrap text-xs leading-none text-faint">{label}</span>
      {children}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  step,
  onChange,
  compact,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  compact?: boolean;
}) {
  const shown = Number.isInteger(step) && Number.isInteger(value) ? String(value) : value.toFixed(1);
  return (
    <div className="flex h-8 min-w-0 flex-1 items-center rounded-md bg-surface-2">
      <button
        type="button"
        aria-label="減少"
        onClick={() => onChange(round1(Math.max(min, value - step)))}
        className={cn("grid h-full place-items-center text-fg", compact ? "w-6" : "w-9")}
      >
        −
      </button>
      <span className="min-w-0 flex-1 text-center text-sm tabular-nums">{shown}</span>
      <button
        type="button"
        aria-label="增加"
        onClick={() => onChange(round1(Math.min(max, value + step)))}
        className={cn("grid h-full place-items-center text-fg", compact ? "w-6" : "w-9")}
      >
        ＋
      </button>
    </div>
  );
}

function Add({ children, onClick, disabled }: { children: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="plain-press h-8 shrink-0 rounded-md bg-[#c6a15a] px-3 text-xs font-medium text-[#1a140c] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
