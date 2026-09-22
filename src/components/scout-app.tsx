import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, ChevronUp, Clock, Dices, Info, Search, X } from "lucide-react";
import {
  CARD_BY_ID,
  CARDS,
  COLOR_BAR,
  COLOR_CLASS,
  COLORS,
  COSTS,
  formatCost,
  formatStratDuration,
  PERIODS,
  RARITIES,
  RARITY_CHIP,
  SKILLS,
  STRAT_CATS,
  UNITS,
  UNIT_SHORT,
  type ColorName,
  type Card,
} from "@/data/catalog";
import { filterCards, searchCards } from "@/lib/search";
import { translateCat } from "@/data/translate";
import { useScout } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { CardDetail } from "@/components/card-detail";
import { CardThemeBackdrop, HomeWash } from "@/components/card-theme";
import { CostPips, RarityMark } from "@/components/card-identity";
import { UnitIcon } from "@/components/unit-icon";
import { AboutPage } from "@/components/about-page";
import { GuidePage } from "@/components/guide-page";
import { SkillList } from "@/components/skill-chip";
import { cn } from "@/lib/utils";
import { initInstallCapture } from "@/lib/install";
import type { GuideTopic } from "@/data/guide";

initInstallCapture();

type Tab = "search" | "skills" | "recents" | "about";
const TABS: Tab[] = ["search", "skills", "recents", "about"];
type Hist =
  | { v: "root" }
  | { v: "home" }
  | { v: "card"; id: string }
  | { v: "skills" }
  | { v: "guide"; topic: GuideTopic }
  | { v: "recents" }
  | { v: "about" };

function histOf(tab: Tab, selectedId: string | null, guideTopic: GuideTopic | null): Hist {
  if (tab === "about") return { v: "about" };
  if (tab === "skills") return guideTopic ? { v: "guide", topic: guideTopic } : { v: "skills" };
  if (tab === "recents") return { v: "recents" };
  if (selectedId) return { v: "card", id: selectedId };
  return { v: "home" };
}

function sameHist(a: Hist, b: Hist): boolean {
  if (a.v !== b.v) return false;
  if (a.v === "card" && b.v === "card") return a.id === b.id;
  if (a.v === "guide" && b.v === "guide") return a.topic === b.topic;
  return true;
}

export function ScoutApp() {
  const [tab, setTab] = useState<Tab>("search");
  const [colors, setColors] = useState<ColorName[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [skills, setSkills] = useState<number[]>([]);
  const [rarities, setRarities] = useState<string[]>([]);
  const [stratCats, setStratCats] = useState<string[]>([]);
  const [costs, setCosts] = useState<number[]>([]);
  const [moreFilters, setMoreFilters] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [guideTopic, setGuideTopic] = useState<GuideTopic | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = useScout((s) => s.query);
  const setQuery = useScout((s) => s.setQuery);
  const selectedId = useScout((s) => s.selectedId);
  const select = useScout((s) => s.select);
  const recents = useScout((s) => s.recents);
  const selected = selectedId ? CARD_BY_ID[selectedId] : null;
  const fromPop = useRef(false);
  const lastBack = useRef(0);
  const [exitHint, setExitHint] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  function pushView(next: Hist) {
    if (fromPop.current) return;
    const cur = (history.state ?? { v: "home" }) as Hist;
    if (sameHist(cur, next)) return;
    history.pushState(next, "");
  }

  function applyHist(state: Hist | null) {
    const s = state ?? { v: "home" as const };
    if (s.v === "about") {
      setTab("about");
      setGuideTopic(null);
      setSheetOpen(false);
      select(null);
      return;
    }
    if (s.v === "skills") {
      setTab("skills");
      setGuideTopic(null);
      setSheetOpen(false);
      select(null);
      return;
    }
    if (s.v === "guide") {
      setTab("skills");
      setGuideTopic(s.topic);
      setSheetOpen(false);
      select(null);
      return;
    }
    if (s.v === "recents") {
      setTab("recents");
      setGuideTopic(null);
      setSheetOpen(false);
      return;
    }
    setTab("search");
    setGuideTopic(null);
    if (s.v === "card") {
      select(s.id);
      setSheetOpen(true);
      return;
    }
    setSheetOpen(false);
    select(null);
  }

  const applyHistRef = useRef(applyHist);
  applyHistRef.current = applyHist;

  function goTab(next: Tab) {
    if (next === tab) {
      if (next === "skills" && guideTopic) {
        const cur = history.state as Hist | null;
        if (cur?.v === "guide") history.back();
        else setGuideTopic(null);
        return;
      }
      if ((next === "search" || next === "recents") && selectedId) {
        const cur = history.state as Hist | null;
        if (cur?.v === "card") history.back();
        else {
          setSheetOpen(false);
          select(null);
          pushView(next === "recents" ? { v: "recents" } : { v: "home" });
        }
      }
      return;
    }
    setSheetOpen(false);
    setTab(next);
    if (next !== "skills") setGuideTopic(null);
    pushView(histOf(next, selectedId, next === "skills" ? guideTopic : null));
  }

  function setGuideView(next: GuideTopic | null) {
    if (next) {
      setGuideTopic(next);
      pushView({ v: "guide", topic: next });
      return;
    }
    const cur = history.state as Hist | null;
    if (cur?.v === "guide") history.back();
    else {
      setGuideTopic(null);
      pushView({ v: "skills" });
    }
  }

  useEffect(() => {
    void Promise.resolve(useScout.persist.rehydrate());

    history.replaceState({ v: "root" } satisfies Hist, "");
    history.pushState({ v: "home" } satisfies Hist, "");

    const onPop = (event: PopStateEvent) => {
      const s = (event.state ?? { v: "root" }) as Hist;
      if (s.v === "root") {
        const now = Date.now();
        if (now - lastBack.current < 2000) {
          history.back();
          return;
        }
        lastBack.current = now;
        setExitHint(true);
        window.setTimeout(() => setExitHint(false), 2000);
        history.pushState({ v: "home" } satisfies Hist, "");
        fromPop.current = true;
        applyHistRef.current({ v: "home" });
        queueMicrotask(() => {
          fromPop.current = false;
        });
        return;
      }
      fromPop.current = true;
      applyHistRef.current(s);
      queueMicrotask(() => {
        fromPop.current = false;
      });
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const layerActive = colors.length + costs.length + units.length + periods.length + skills.length + rarities.length + stratCats.length;

  const hits = useMemo(() => {
    const q = query.trim();
    if (!q && !layerActive) return [];
    let list = q ? searchCards(q, 200).map((h) => h.card) : CARDS;
    if (layerActive) list = filterCards(list, { colors, periods, units, skills, rarities, costs, stratCats });
    return list;
  }, [query, colors, periods, units, skills, rarities, costs, stratCats, layerActive]);

  const recentCards = useMemo(
    () => recents.map((id) => CARD_BY_ID[id]).filter(Boolean),
    [recents],
  );

  const layerSummary = [
    colors.length ? colors.join(" ") : null,
    costs.length ? costs.map(formatCost).join("/") + " Cost" : null,
    units.length ? units.map((u) => UNIT_SHORT[u as keyof typeof UNIT_SHORT] ?? u).join(" ") : null,
    periods.length ? periods.join(" ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const clearAll = () => {
    setQuery("");
    setColors([]);
    setCosts([]);
    setUnits([]);
    setPeriods([]);
    setSkills([]);
    setRarities([]);
    setStratCats([]);
  };

  const resultLabel = query || layerActive ? `${hits.length} 筆${layerSummary ? `　${layerSummary}` : ""}` : "";

  function openCard(id: string) {
    select(id);
    setSheetOpen(true);
    pushView({ v: "card", id });
  }

  function openRandom() {
    const pool = (hits.length ? hits : CARDS).filter((card) => card.id !== selectedId);
    const list = pool.length ? pool : CARDS;
    const card = list[Math.floor(Math.random() * list.length)];
    if (!card) return;
    openCard(card.id);
  }

  const scrollerRef = useTabScroller(tab, goTab);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg text-fg">
      <HomeWash faded />
      <header className="relative z-10 shrink-0 border-b border-border bg-bg/60 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-2.5 sm:px-6 sm:pb-3 sm:pt-5">
          <p className="hidden text-xs tracking-widest text-faint sm:block">EIKETSU TAISEN</p>
          <h1 className="font-display text-xl tracking-tight text-balance sm:text-3xl">英傑大戦⚡️速查</h1>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-0 px-2 sm:gap-1 sm:px-6">
          <TabBtn id="search" tab={tab} setTab={goTab} icon={<Search className="size-4" />} label="速查" />
          <TabBtn id="skills" tab={tab} setTab={goTab} icon={<BookOpen className="size-4" />} label="資料" />
          <TabBtn id="recents" tab={tab} setTab={goTab} icon={<Clock className="size-4" />} label="最近" />
          <TabBtn id="about" tab={tab} setTab={goTab} icon={<Info className="size-4" />} label="關於" />
        </nav>
      </header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_30rem]">
        <section className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-border lg:border-r">
          <div ref={scrollerRef} className="tab-pager">
          <div className="tab-pane">
            <div className="shrink-0 border-b border-border bg-bg/60 px-4 py-2.5 backdrop-blur-sm sm:px-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      inputRef.current?.blur();
                    }
                  }}
                  type="search"
                  enterKeyHint="search"
                  inputMode="search"
                  placeholder="織田信長、蒼173、指揮、伏兵…"
                  className="pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="搜尋武將"
                  suppressHydrationWarning
                />
                {query ? (
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-fg"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    aria-label="清除"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-8 shrink-0 items-center gap-0.5 rounded-md bg-surface-2 px-2.5 text-xs text-fg lg:hidden"
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                >
                  篩選
                  {filtersOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>
                <p className="min-w-0 flex-1 truncate text-xs tabular-nums text-faint">{resultLabel}</p>
                <button
                  type="button"
                  className="flex h-8 shrink-0 items-center rounded-md bg-faction-hi px-2.5 text-xs font-medium text-white"
                  onClick={clearAll}
                >
                  清除
                </button>
              </div>

              <div
                className={cn(
                  "flex-col gap-1 overflow-x-hidden",
                  filtersOpen ? "mt-2 flex max-h-[min(52vh,26rem)] overflow-y-auto" : "hidden",
                  "lg:mt-3 lg:flex lg:max-h-[min(42vh,24rem)] lg:overflow-y-auto",
                )}
              >
                <FilterRule label="勢力" />
                <ChipGrid
                  cols="grid-cols-7"
                  items={COLORS.map((c) => ({
                    key: c,
                    label: c,
                    active: colors.includes(c),
                    className: cn(COLOR_BAR[c], "text-fg ring-2 ring-inset ring-fg"),
                    idleClassName: cn(COLOR_BAR[c], "text-fg opacity-75"),
                    toggle: () => toggle(colors, c, setColors),
                  }))}
                />
                <div className="flex min-w-0 flex-col gap-1">
                    <FilterRule label="成本" />
                    <ChipGrid
                      cols="grid-cols-7"
                      items={COSTS.map((c) => ({
                        key: String(c),
                        label: <CostPips cost={c} small stacked />,
                        active: costs.includes(c),
                        className: "bg-surface-2 text-fg ring-2 ring-inset ring-fg",
                        idleClassName: "bg-surface-2",
                        ariaLabel: `${formatCost(c)} Cost`,
                        toggle: () => toggle(costs, c, setCosts),
                      }))}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <FilterRule label="兵種" />
                    <ChipGrid
                      cols="grid-cols-5"
                      items={UNITS.map((u) => ({
                        key: u,
                        label: <UnitIcon unit={u} className="size-6" />,
                        active: units.includes(u),
                        ariaLabel: u,
                        toggle: () => toggle(units, u, setUnits),
                      }))}
                    />
                  </div>

                <div className="mt-1 flex items-center">
                  <button
                    type="button"
                    className="flex h-8 shrink-0 items-center gap-0.5 rounded-md bg-surface-2 px-2.5 text-xs text-fg"
                    onClick={() => setMoreFilters((v) => !v)}
                    aria-expanded={moreFilters}
                  >
                    更多篩選
                    {periods.length + skills.length + rarities.length + stratCats.length ? (
                      <span className="tabular-nums">{periods.length + skills.length + rarities.length + stratCats.length}</span>
                    ) : null}
                    {moreFilters ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>
                </div>

                {moreFilters ? (
                  <div className="flex flex-col gap-1 overflow-x-hidden pb-1">
                    <FilterRule label="時代" />
                    <ChipGrid
                      cols="grid-cols-5"
                      items={PERIODS.map((p) => ({
                        key: p,
                        label: p,
                        active: periods.includes(p),
                        toggle: () => toggle(periods, p, setPeriods),
                      }))}
                    />
                    <FilterRule label="特技" />
                    <ChipGrid
                      cols="grid-cols-4 sm:grid-cols-6"
                      items={SKILLS.map((s) => ({
                        key: String(s.id),
                        label: s.name,
                        active: skills.includes(s.id),
                        className: "border border-black bg-black text-cost",
                        idleClassName: "border border-black bg-cost text-black",
                        toggle: () => toggle(skills, s.id, setSkills),
                      }))}
                    />
                    <FilterRule label="計略類型" />
                    <ChipGrid
                      cols="grid-cols-4 sm:grid-cols-5"
                      items={STRAT_CATS.map((cat) => ({
                        key: cat,
                        label: translateCat(cat),
                        active: stratCats.includes(cat),
                        ariaLabel: `計略 ${translateCat(cat)}`,
                        toggle: () => toggle(stratCats, cat, setStratCats),
                      }))}
                    />
                    <FilterRule label="稀有" />
                    <ChipGrid
                      cols="grid-cols-4"
                      items={RARITIES.map((r) => ({
                        key: r,
                        label: r,
                        active: rarities.includes(r),
                        className: RARITY_CHIP[r].active,
                        idleClassName: RARITY_CHIP[r].idle,
                        toggle: () => toggle(rarities, r, setRarities),
                      }))}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              {!query.trim() && !layerActive ? (
                <div className="px-6 pt-10 text-center">
                  <p className="text-sm leading-relaxed text-pretty text-muted">
                    可使用篩選，或輸入名稱、卡號或計略名的其中一字即可極速搜查。
                  </p>
                  <button
                    type="button"
                    className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-md bg-surface-2 px-4 text-sm text-fg"
                    onClick={openRandom}
                    aria-label="隨機一張卡"
                  >
                    <Dices className="size-4" />
                    隨機一張
                  </button>
                </div>
              ) : (
                <ul className="h-full overflow-y-auto overscroll-contain px-2 py-2 sm:px-4">
                  {!hits.length ? (
                    <li className="px-3 py-16 text-center text-sm text-muted">找不到。請改篩選或卡號（蒼173）。</li>
                  ) : (
                    hits.map((card) => (
                      <li key={card.id}>
                        <CardHitRow
                          card={card}
                          active={card.id === selectedId}
                          onOpen={() => openCard(card.id)}
                        />
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
          <div className="tab-pane">
            <GuidePage topic={guideTopic} onTopic={setGuideView} />
          </div>
          <div className="tab-pane">
            <p className="shrink-0 px-4 pt-3 pb-1 text-xs tabular-nums text-faint sm:px-6">
              {recents.length ? `最近 ${recents.length} 張` : "最近查看"}
            </p>
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-4">
              {recentCards.length ? (
                recentCards.map((card) => (
                  <li key={card.id}>
                    <CardHitRow
                      card={card}
                      active={card.id === selectedId}
                      onOpen={() => openCard(card.id)}
                    />
                  </li>
                ))
              ) : (
                <li className="px-3 py-16 text-center text-sm text-muted">尚未查看武將。在速查開啟過即會顯示於此。</li>
              )}
            </ul>
          </div>
          <div className="tab-pane">
            <AboutPage />
          </div>
          </div>
        </section>

        <aside className="relative hidden min-h-0 overflow-hidden lg:block">
          {selected ? <CardThemeBackdrop card={selected} /> : null}
          <div className="relative z-10 h-full overflow-y-auto p-5">
            {selected ? (
              <CardDetail card={selected} />
            ) : (
              <p className="text-sm leading-relaxed text-pretty text-muted">
                選擇一張武將，即可查看計略時長與效果值。
              </p>
            )}
          </div>
        </aside>
      </div>

      {exitHint ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[70] flex justify-center px-4">
          <p className="rounded-full bg-black/85 px-4 py-2 text-sm text-fg shadow-[var(--shadow-border)]">再按一次關閉程式</p>
        </div>
      ) : null}

      {sheetOpen && selected && (tab === "search" || tab === "recents") ? (
        <div className="absolute inset-0 z-50 flex min-h-0 flex-col bg-bg lg:hidden">
          <CardThemeBackdrop card={selected} />
          <button
            type="button"
            onClick={() => {
              const cur = history.state as Hist | null;
              if (cur?.v === "card") history.back();
              else {
                setSheetOpen(false);
                select(null);
              }
            }}
            className="absolute right-2 top-[max(0.35rem,env(safe-area-inset-top))] z-20 grid size-10 place-items-center rounded-full bg-black/70 text-fg shadow-[0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-sm hover:bg-black/85"
            aria-label="關閉"
          >
            <X className="size-5" />
          </button>
          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-[max(3rem,calc(env(safe-area-inset-top)+2.5rem))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <CardDetail card={selected} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function useTabScroller(tab: Tab, goTab: (next: Tab) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const tabRef = useRef(tab);
  const goRef = useRef(goTab);
  const skipScroll = useRef(false);
  tabRef.current = tab;
  goRef.current = goTab;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    const left = TABS.indexOf(tab) * el.clientWidth;
    if (Math.abs(el.scrollLeft - left) < 8) return;
    el.scrollTo({ left, behavior: "smooth" });
  }, [tab]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let settle = 0;
    let axis: "h" | "v" | null = null;
    let x0 = 0;
    let y0 = 0;
    let startLeft = 0;
    let t0 = 0;
    let dragging = false;

    const sync = () => {
      if (dragging) return;
      const w = el.clientWidth || 1;
      const i = Math.max(0, Math.min(TABS.length - 1, Math.round(el.scrollLeft / w)));
      const next = TABS[i];
      if (!next || next === tabRef.current) return;
      skipScroll.current = true;
      goRef.current(next);
    };

    const onScroll = () => {
      if (dragging) return;
      window.clearTimeout(settle);
      settle = window.setTimeout(sync, 80);
    };
    const onScrollEnd = () => {
      if (dragging) return;
      window.clearTimeout(settle);
      sync();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) {
        axis = "v";
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      x0 = t.clientX;
      y0 = t.clientY;
      t0 = performance.now();
      startLeft = el.scrollLeft;
      axis = null;
      dragging = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || axis === "v") return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (axis == null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (axis === "v") return;
        dragging = true;
        el.style.scrollSnapType = "none";
      }
      if (axis !== "h") return;
      e.preventDefault();
      const w = el.clientWidth || 1;
      const max = (TABS.length - 1) * w;
      let next = startLeft - dx;
      if (next < 0) next *= 0.28;
      else if (next > max) next = max + (next - max) * 0.28;
      el.scrollLeft = next;
    };

    const onTouchEnd = () => {
      if (axis === "h") {
        const w = el.clientWidth || 1;
        const i0 = Math.max(0, TABS.indexOf(tabRef.current));
        const moved = el.scrollLeft - startLeft;
        const dist = Math.abs(moved);
        const dt = Math.max(16, performance.now() - t0);
        const speed = dist / dt;
        const commit = dist >= Math.max(72, w * 0.22) || (dist >= 48 && speed >= 0.5);
        let i = i0;
        if (commit) {
          if (moved > 8) i = Math.min(TABS.length - 1, i0 + 1);
          else if (moved < -8) i = Math.max(0, i0 - 1);
        }
        el.style.scrollSnapType = "";
        dragging = false;
        el.scrollTo({ left: i * w, behavior: "smooth" });
        const next = TABS[i];
        if (next && next !== tabRef.current) {
          skipScroll.current = true;
          goRef.current(next);
        }
      }
      axis = null;
      dragging = false;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    const ro = new ResizeObserver(() => {
      el.scrollLeft = TABS.indexOf(tabRef.current) * el.clientWidth;
    });
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove, true);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      ro.disconnect();
      window.clearTimeout(settle);
    };
  }, []);

  return ref;
}

function CardHitRow({
  card,
  active,
  onOpen,
}: {
  card: Card;
  active: boolean;
  onOpen: () => void;
}) {
  const dur = formatStratDuration(card);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-[var(--motion-quick)]",
        active ? "bg-surface-2" : "hover:bg-surface",
      )}
    >
      <span className={cn("h-7 w-1 shrink-0 rounded-full", COLOR_BAR[card.color])} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <span className={cn("shrink-0 rounded-sm px-1 py-px font-medium", COLOR_CLASS[card.color])}>{card.no}</span>
          <UnitIcon unit={card.unit} title={card.unit} className="size-4" />
          <RarityMark rarity={card.rarity} className="shrink-0" />
          <span className="min-w-0 truncate font-bold text-fg">{card.name}</span>
          <CostPips cost={card.cost} small />
          <span className="shrink-0 tabular-nums text-muted">
            /{card.power}/{card.intel}
          </span>
          {card.skills.length ? (
            <span className="ml-auto flex shrink-0 items-center">
              <SkillList ids={card.skills} short />
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-faint">
          <span className="text-fg">{card.stratName}</span>
          <span className="text-muted">　士氣{card.stratCost}</span>
          <span className="tabular-nums text-muted">　{dur.compact}</span>
          {dur.cap ? <span className="text-[10px] text-faint">上限</span> : null}
        </p>
      </div>
    </button>
  );
}

function TabBtn({
  id,
  tab,
  setTab,
  icon,
  label,
}: {
  id: Tab;
  tab: Tab;
  setTab: (t: Tab) => void;
  icon: ReactNode;
  label: string;
}) {
  const active = tab === id;
  return (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        "flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 border-b-2 px-1.5 text-sm sm:h-11 sm:flex-none sm:px-3",
        active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
  set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
}

function FilterRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1.5 first:pt-0">
      <span className="shrink-0 text-xs text-faint">{label}</span>
      <span className="h-px min-w-4 flex-1 bg-border" aria-hidden />
    </div>
  );
}

function ChipGrid({
  items,
  cols,
}: {
  cols: string;
  items: {
    key: string;
    label: ReactNode;
    active: boolean;
    toggle: () => void;
    className?: string;
    idleClassName?: string;
    ariaLabel?: string;
  }[];
}) {
  return (
    <div className={cn("grid gap-1", cols)}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.toggle}
          aria-label={item.ariaLabel}
          className={cn(
            "flex h-9 w-full items-center justify-center overflow-hidden rounded-sm px-0.5 text-center text-xs leading-none whitespace-nowrap",
            item.active ? (item.className ?? "bg-accent text-accent-fg") : (item.idleClassName ?? "bg-surface-2 text-muted"),
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
