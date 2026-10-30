import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, ChevronUp, Clock, Dices, Download, Info, Search, Wrench, X } from "lucide-react";
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
import { ChangelogPage } from "@/components/changelog-page";
import { GuidePage, ToolsPage, type ToolId } from "@/components/guide-page";
import { SkillList } from "@/components/skill-chip";
import { cn } from "@/lib/utils";
import { deviceKind, initInstallCapture, isStandalone, subscribeInstall, type BeforeInstall } from "@/lib/install";
import type { GuideTopic } from "@/data/guide";

initInstallCapture();

type Tab = "search" | "recents" | "tools" | "skills";
const TABS: Tab[] = ["search", "recents", "tools", "skills"];
const DUR_LO = 0;
const DUR_HI = 99;
const MORALE_LO = 1;
const MORALE_HI = 10;
const STAT_LO = 1;
const STAT_HI = 12;
type SortKey = "power" | "intel" | "cost" | "morale";
type SortDir = "asc" | "desc";
type SortRule = { key: SortKey; dir: SortDir };
const SORTS: { key: SortKey; label: string }[] = [
  { key: "power", label: "武力" },
  { key: "intel", label: "知力" },
  { key: "cost", label: "成本" },
  { key: "morale", label: "士氣" },
];
type Hist =
  | { v: "root" }
  | { v: "home" }
  | { v: "card"; id: string }
  | { v: "skills" }
  | { v: "guide"; topic: GuideTopic }
  | { v: "recents" }
  | { v: "tools" }
  | { v: "tool"; id: ToolId }
  | { v: "about" }
  | { v: "changelog" };

function histOf(tab: Tab, selectedId: string | null, guideTopic: GuideTopic | null, toolPage: ToolId | null): Hist {
  if (tab === "skills") return guideTopic ? { v: "guide", topic: guideTopic } : { v: "skills" };
  if (tab === "tools") return toolPage ? { v: "tool", id: toolPage } : { v: "tools" };
  if (tab === "recents") return { v: "recents" };
  if (selectedId) return { v: "card", id: selectedId };
  return { v: "home" };
}

function sameHist(a: Hist, b: Hist): boolean {
  if (a.v !== b.v) return false;
  if (a.v === "card" && b.v === "card") return a.id === b.id;
  if (a.v === "guide" && b.v === "guide") return a.topic === b.topic;
  if (a.v === "tool" && b.v === "tool") return a.id === b.id;
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
  const [durMin, setDurMin] = useState(DUR_LO);
  const [durMax, setDurMax] = useState(DUR_HI);
  const [moraleMin, setMoraleMin] = useState(MORALE_LO);
  const [moraleMax, setMoraleMax] = useState(MORALE_HI);
  const [powerMin, setPowerMin] = useState(STAT_LO);
  const [powerMax, setPowerMax] = useState(STAT_HI);
  const [intelMin, setIntelMin] = useState(STAT_LO);
  const [intelMax, setIntelMax] = useState(STAT_HI);
  const [pickPower, setPickPower] = useState<number | null>(null);
  const [pickIntel, setPickIntel] = useState<number | null>(null);
  const [statMode, setStatMode] = useState(false);
  const [statReady, setStatReady] = useState(false);
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [morePhase, setMorePhase] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const [guideTopic, setGuideTopic] = useState<GuideTopic | null>(null);
  const [toolPage, setToolPage] = useState<ToolId | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStatMode(localStorage.getItem("ek-stat-mode") === "1");
    const id = requestAnimationFrame(() => setStatReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    if (!statReady) return;
    localStorage.setItem("ek-stat-mode", statMode ? "1" : "0");
  }, [statMode, statReady]);

  useEffect(() => {
    if (morePhase !== "opening") return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setMorePhase((p) => (p === "opening" ? "open" : p)));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [morePhase]);

  useEffect(() => {
    if (morePhase !== "closing") return;
    const t = window.setTimeout(() => setMorePhase((p) => (p === "closing" ? "closed" : p)), 380);
    return () => window.clearTimeout(t);
  }, [morePhase]);

  const moreFilters = morePhase === "opening" || morePhase === "open";
  function toggleStat() {
    setStatMode((on) => !on);
  }
  function toggleMoreFilters() {
    setMorePhase((p) => (p === "open" || p === "opening" ? "closing" : "opening"));
  }
  function closeMoreFilters() {
    setMorePhase((p) => (p === "closed" ? p : "closing"));
  }
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
  const [browserOffline, setBrowserOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const [linkDown, setLinkDown] = useState(false);
  const offline = browserOffline || linkDown;
  const [webBrowse, setWebBrowse] = useState(() => typeof window !== "undefined" && !isStandalone());
  const [installEvent, setInstallEvent] = useState<BeforeInstall | null>(null);
  const [installHint, setInstallHint] = useState("");

  useEffect(() => {
    if (!import.meta.env.DEV || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister();
    });
  }, []);

  useEffect(() => {
    const sync = () => setBrowserOffline(navigator.onLine === false);
    const UPDATE_AFTER_MS = 10_000;
    const started = Date.now();
    let checked = false;
    let timer = 0;
    const checkUpdate = () => {
      if (import.meta.env.DEV || checked || !navigator.onLine || !("serviceWorker" in navigator)) return;
      if (Date.now() - started < UPDATE_AFTER_MS) return;
      checked = true;
      void navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: "revalidate", since: Date.now() - started });
      });
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (type === "online" || type === "updated") setLinkDown(false);
    };
    timer = window.setTimeout(checkUpdate, UPDATE_AFTER_MS);
    const onOnline = () => {
      sync();
      checkUpdate();
    };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("online", onOnline);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    sync();
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  useEffect(() => {
    setWebBrowse(!isStandalone());
    return subscribeInstall(setInstallEvent);
  }, []);

  async function promoteInstall() {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") setWebBrowse(false);
      return;
    }
    const { ios, iosChrome, android } = deviceKind();
    if (iosChrome) {
      setInstallHint("iPhone 的 Chrome 無法隱藏地址欄。請用 Safari 開啟，再加到主畫面。");
      return;
    }
    if (ios) {
      setInstallHint("按底欄分享鍵，再選「加到主畫面」。");
      return;
    }
    if (android) {
      setInstallHint("Chrome 右上 ⋮ → 選「安裝應用程式」，不要選「加到主畫面」。");
      return;
    }
    setInstallHint("用 Chrome 右上 ⋮ →「安裝應用程式」。");
  }

  function pushView(next: Hist) {
    if (fromPop.current) return;
    const cur = (history.state ?? { v: "home" }) as Hist;
    if (sameHist(cur, next)) return;
    history.pushState(next, "");
  }

  function applyHist(state: Hist | null) {
    const s = state ?? { v: "home" as const };
    setToolPage(s.v === "tool" ? s.id : s.v === "guide" && s.topic === "siege" ? "siege" : null);
    setAboutOpen(s.v === "about");
    setChangelogOpen(s.v === "changelog");
    if (s.v === "about" || s.v === "changelog") {
      setSheetOpen(false);
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
      if (s.topic === "siege") {
        setTab("tools");
        setGuideTopic(null);
        setSheetOpen(false);
        select(null);
        return;
      }
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
      select(null);
      return;
    }
    if (s.v === "tools") {
      setTab("tools");
      setGuideTopic(null);
      setSheetOpen(false);
      select(null);
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
    if ((aboutOpen || changelogOpen) && next === tab) {
      const cur = history.state as Hist | null;
      if (cur?.v === "about" || cur?.v === "changelog") history.back();
      else {
        setAboutOpen(false);
        setChangelogOpen(false);
      }
      return;
    }
    if (next === tab) {
      if (next === "skills" && guideTopic) {
        const cur = history.state as Hist | null;
        if (cur?.v === "guide") history.back();
        else setGuideTopic(null);
        return;
      }
      if (next === "tools" && toolPage) {
        const cur = history.state as Hist | null;
        if (cur?.v === "tool") history.back();
        else setToolPage(null);
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
    const cur = history.state as Hist | null;
    setAboutOpen(false);
    setChangelogOpen(false);
    setSheetOpen(false);
    setTab(next);
    if (next !== "skills") setGuideTopic(null);
    if (next !== "tools") setToolPage(null);
    const dest = histOf(next, null, next === "skills" ? guideTopic : null, next === "tools" ? toolPage : null);
    if (cur?.v === "card" || cur?.v === "about" || cur?.v === "changelog") {
      if (cur.v === "card") select(null);
      history.replaceState(dest, "");
      return;
    }
    pushView(dest);
  }

  function setToolView(next: ToolId | null) {
    if (next) {
      setToolPage(next);
      pushView({ v: "tool", id: next });
      return;
    }
    const cur = history.state as Hist | null;
    if (cur?.v === "tool") history.back();
    else {
      setToolPage(null);
      pushView({ v: "tools" });
    }
  }

  function openAbout() {
    if (changelogOpen) {
      const cur = history.state as Hist | null;
      if (cur?.v === "changelog") history.back();
      else {
        setChangelogOpen(false);
        setAboutOpen(true);
        pushView({ v: "about" });
      }
      return;
    }
    if (aboutOpen) {
      const cur = history.state as Hist | null;
      if (cur?.v === "about") history.back();
      else setAboutOpen(false);
      return;
    }
    setAboutOpen(true);
    setChangelogOpen(false);
    setSheetOpen(false);
    pushView({ v: "about" });
  }

  function openChangelog() {
    setAboutOpen(false);
    setChangelogOpen(true);
    setSheetOpen(false);
    pushView({ v: "changelog" });
  }

  function closeChangelog() {
    const cur = history.state as Hist | null;
    if (cur?.v === "changelog") history.back();
    else {
      setChangelogOpen(false);
      setAboutOpen(true);
      pushView({ v: "about" });
    }
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
      const raw = event.state;
      const known =
        raw &&
        typeof raw === "object" &&
        "v" in raw &&
        (raw.v === "root" ||
          raw.v === "home" ||
          raw.v === "card" ||
          raw.v === "skills" ||
          raw.v === "guide" ||
          raw.v === "recents" ||
          raw.v === "tools" ||
          raw.v === "tool" ||
          raw.v === "about" ||
          raw.v === "changelog");
      if (raw != null && !known) return;
      const s = (known ? raw : { v: "root" }) as Hist;
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

  const durOn = durMin > DUR_LO || durMax < DUR_HI;
  const moraleOn = moraleMin > MORALE_LO || moraleMax < MORALE_HI;
  const powerOn = powerMin > STAT_LO || powerMax < STAT_HI;
  const intelOn = intelMin > STAT_LO || intelMax < STAT_HI;
  const statOn = pickPower != null || pickIntel != null;
  const layerActive = colors.length + costs.length + units.length + periods.length + skills.length + rarities.length + stratCats.length + (durOn ? 1 : 0) + (moraleOn ? 1 : 0) + (powerOn ? 1 : 0) + (intelOn ? 1 : 0) + (statOn ? 1 : 0) + (sorts.length ? 1 : 0);

  const hits = useMemo(() => {
    const q = query.trim();
    if (!q && !layerActive) return [];
    let list = q ? searchCards(q, 200).map((h) => h.card) : CARDS;
    if (layerActive) list = filterCards(list, { colors, periods, units, skills, rarities, costs, stratCats, durMin, durMax, moraleMin, moraleMax });
    if (powerOn) list = list.filter((card) => card.power >= powerMin && card.power <= powerMax);
    if (intelOn) list = list.filter((card) => card.intel >= intelMin && card.intel <= intelMax);
    if (pickPower != null) list = list.filter((card) => card.power === pickPower);
    if (pickIntel != null) list = list.filter((card) => card.intel === pickIntel);
    if (sorts.length) {
      const value = (card: Card, key: SortKey) =>
        key === "power" ? card.power : key === "intel" ? card.intel : key === "cost" ? card.cost : card.stratCost;
      list = [...list].sort((a, b) => {
        for (const rule of sorts) {
          const diff = value(a, rule.key) - value(b, rule.key);
          if (diff) return rule.dir === "asc" ? diff : -diff;
        }
        return a.no.localeCompare(b.no, "ja");
      });
    }
    return list;
  }, [query, colors, periods, units, skills, rarities, costs, stratCats, durMin, durMax, moraleMin, moraleMax, powerMin, powerMax, intelMin, intelMax, layerActive, pickPower, pickIntel, sorts]);

  const recentCards = useMemo(
    () => recents.map((id) => CARD_BY_ID[id]).filter(Boolean),
    [recents],
  );

  const layerSummary = [
    colors.length ? colors.join(" ") : null,
    costs.length ? costs.map(formatCost).join("/") + " Cost" : null,
    units.length ? units.map((u) => UNIT_SHORT[u as keyof typeof UNIT_SHORT] ?? u).join(" ") : null,
    periods.length ? periods.join(" ") : null,
    skills.length ? skills.map((id) => SKILLS.find((skill) => skill.id === id)?.name).filter(Boolean).join(" ") : null,
    stratCats.length ? stratCats.map((cat) => translateCat(cat)).join(" ") : null,
    rarities.length ? rarities.join(" ") : null,
    durOn ? `${durMin}–${durMax}C` : null,
    moraleOn ? `士氣 ${moraleMin}–${moraleMax}` : null,
    powerOn ? `武力 ${powerMin}–${powerMax}` : null,
    intelOn ? `知力 ${intelMin}–${intelMax}` : null,
    statOn ? [pickPower != null ? `武力 ${pickPower}` : null, pickIntel != null ? `知力 ${pickIntel}` : null].filter(Boolean).join(" ") : null,
    sorts.length ? sorts.map((rule) => `${SORTS.find((item) => item.key === rule.key)?.label}${rule.dir === "asc" ? "▲" : "▼"}`).join(" ") : null,
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
    setDurMin(DUR_LO);
    setDurMax(DUR_HI);
    setMoraleMin(MORALE_LO);
    setMoraleMax(MORALE_HI);
    setPowerMin(STAT_LO);
    setPowerMax(STAT_HI);
    setIntelMin(STAT_LO);
    setIntelMax(STAT_HI);
    setPickPower(null);
    setPickIntel(null);
    setMorePhase("closed");
    setSorts([]);
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

  const pager = useTabScroller(tab, goTab);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg text-fg">
      {offline ? (
        <p className="relative z-[80] shrink-0 border-b border-red-950 bg-red-800 px-4 pt-[max(0.35rem,env(safe-area-inset-top))] pb-1.5 text-center text-xs text-white">
          {browserOffline ? "離線模式　已儲存的資料仍可查閱" : "網絡不穩，已用已儲存的資料"}
        </p>
      ) : null}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <HomeWash faded />
      <header className="relative z-10 shrink-0 border-b border-border bg-bg/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:pb-3 sm:pt-5">
          <div className="min-w-0">
            <p className="hidden text-xs tracking-widest text-faint sm:block">EIKETSU TAISEN</p>
            <h1 className="font-display text-xl tracking-tight text-balance sm:text-3xl">英傑大戦⚡️速查</h1>
          </div>
          <button
            type="button"
            onClick={openAbout}
            aria-label="關於"
            aria-pressed={aboutOpen || changelogOpen}
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full",
              aboutOpen || changelogOpen ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Info className="size-5" />
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-0 px-2 sm:gap-1 sm:px-6">
          <TabBtn id="search" tab={tab} setTab={goTab} icon={<Search className="size-4" />} label="速查" />
          <TabBtn id="recents" tab={tab} setTab={goTab} icon={<Clock className="size-4" />} label="最近" />
          <TabBtn id="tools" tab={tab} setTab={goTab} icon={<Wrench className="size-4" />} label="工具" />
          <TabBtn id="skills" tab={tab} setTab={goTab} icon={<BookOpen className="size-4" />} label="資料" />
        </nav>
      </header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_30rem]">
        {changelogOpen ? (
          <div key="changelog" className="absolute inset-0 z-40 overflow-y-auto bg-bg">
            <ChangelogPage onBack={closeChangelog} />
          </div>
        ) : aboutOpen ? (
          <div key="about" className="absolute inset-0 z-40 overflow-y-auto bg-bg">
            <AboutPage onOpenChangelog={openChangelog} />
          </div>
        ) : null}
        <section className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-border lg:border-r">
          <div ref={pager.rootRef} className="tab-pager">
          <div ref={pager.trackRef} className="tab-track">
          <div className="tab-pane">
            <div className="shrink-0 border-b border-border bg-bg/60 px-4 py-2.5 backdrop-blur-sm sm:px-6">
              <div className="relative z-30">
              <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
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
                  placeholder="織田信長、蒼173、指揮…"
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
              <div className="relative shrink-0">
              <button
                type="button"
                aria-pressed={statMode}
                aria-label={statMode ? "切換到成本和兵種" : "切換到武力知力"}
                onClick={toggleStat}
                className="mode-flip size-12"
              >
                <span className={cn("mode-flip-inner", statMode && "is-flipped", !statReady && "is-instant")}>
                  <span className="mode-face rounded-md bg-[#3a322c] text-[#d4cec4]">
                    <StatMark />
                  </span>
                  <span className="mode-face mode-face-back rounded-md bg-[#3a322c] text-[#d4cec4]">
                    <CostUnitMark />
                  </span>
                </span>
              </button>
              </div>
              </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-8 shrink-0 items-center gap-0.5 rounded-md bg-[#3a322c] px-2.5 text-xs font-medium text-[#d4cec4]"
                  onClick={toggleMoreFilters}
                  aria-expanded={moreFilters}
                >
                  進階篩選
                  {periods.length + skills.length + rarities.length + stratCats.length + (durOn ? 1 : 0) + (moraleOn ? 1 : 0) + (powerOn ? 1 : 0) + (intelOn ? 1 : 0) + (sorts.length ? 1 : 0) ? (
                    <span className="tabular-nums">{periods.length + skills.length + rarities.length + stratCats.length + (durOn ? 1 : 0) + (moraleOn ? 1 : 0) + (powerOn ? 1 : 0) + (intelOn ? 1 : 0) + (sorts.length ? 1 : 0)}</span>
                  ) : null}
                  {moreFilters ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>
                <ResultMarquee text={resultLabel} />
                <button
                  type="button"
                  className="flex h-8 shrink-0 items-center rounded-md bg-faction-hi px-2.5 text-xs font-medium text-white"
                  onClick={clearAll}
                >
                  重設
                </button>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border bg-bg/60 px-4 pb-2.5 sm:px-6">
              <div className="flex flex-col gap-1">
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
                <div className="grid">
                  <div className={cn("col-start-1 row-start-1 flex flex-col gap-1", statMode && "invisible")} aria-hidden={statMode} inert={statMode}>
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
                  <div className={cn("col-start-1 row-start-1 grid h-full grid-cols-2 gap-3", !statMode && "invisible")} aria-hidden={!statMode} inert={!statMode}>
                    <StatPick label="武力" tone="power" value={pickPower} onChange={setPickPower} />
                    <StatPick label="知力" tone="intel" value={pickIntel} onChange={setPickIntel} />
                  </div>
                </div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              {!query.trim() && !layerActive ? (
                <div className="px-6 pt-10 text-center">
                  <p className="text-sm leading-relaxed text-pretty text-muted">
                    可使用篩選，或輸入名稱、卡號、計略名或羅馬拼音的其中一字即可極速搜查。按右上方「武知」可切換武力知力篩選。
                  </p>
                  <div className="mt-5 flex flex-col items-center">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-surface-2 px-4 text-sm text-fg"
                      onClick={openRandom}
                      aria-label="隨機一張卡"
                    >
                      <Dices className="size-4" />
                      隨機一張
                    </button>
                    {webBrowse ? (
                      <>
                        <button
                          type="button"
                          className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-md border border-dashed border-faint px-4 text-sm text-muted"
                          onClick={() => void promoteInstall()}
                        >
                          <Download className="size-4" />
                          安裝到手機以離線瀏覽
                        </button>
                        {installHint ? (
                          <p className="mt-2 max-w-xs text-xs leading-relaxed text-pretty text-muted">{installHint}</p>
                        ) : null}
                      </>
                    ) : null}
                  </div>
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
            {morePhase !== "closed" ? (
              <div className={cn("more-sheet absolute inset-0 z-20 flex flex-col border-t-2 border-faction-ko bg-[#241910]", morePhase === "open" && "is-open")}>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2 sm:px-6">
                  <div className="flex flex-col gap-1 pb-2">
                    <FilterRule label="排序" />
                    <ChipGrid
                      cols="grid-cols-4"
                      items={SORTS.map((item) => {
                        const rule = sorts.find((entry) => entry.key === item.key);
                        const order = sorts.findIndex((entry) => entry.key === item.key);
                        return {
                          key: item.key,
                          label: rule ? `${order + 1}${item.label}${rule.dir === "asc" ? "▲" : "▼"}` : item.label,
                          active: Boolean(rule),
                          idleClassName: "bg-[#3a2c22] text-muted",
                          toggle: () =>
                            setSorts((current) => {
                              const index = current.findIndex((entry) => entry.key === item.key);
                              if (index < 0) return [...current, { key: item.key, dir: "asc" }];
                              const next = [...current];
                              next[index] = { ...next[index], dir: next[index].dir === "asc" ? "desc" : "asc" };
                              return next;
                            }),
                        };
                      })}
                    />
                    <StatBounds
                      powerMin={powerMin}
                      powerMax={powerMax}
                      intelMin={intelMin}
                      intelMax={intelMax}
                      onPower={(lo, hi) => {
                        setPowerMin(lo);
                        setPowerMax(hi);
                      }}
                      onIntel={(lo, hi) => {
                        setIntelMin(lo);
                        setIntelMax(hi);
                      }}
                    />
                    <div className="grid grid-cols-2 gap-3 pt-1.5">
                      <DurationRange
                        min={durMin}
                        max={durMax}
                        onChange={(lo, hi) => {
                          setDurMin(lo);
                          setDurMax(hi);
                        }}
                      />
                      <MoraleRange
                        min={moraleMin}
                        max={moraleMax}
                        onChange={(lo, hi) => {
                          setMoraleMin(lo);
                          setMoraleMax(hi);
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-faint">只算本計時長。只有短計的當作 0C。</p>
                    <FilterRule label="時代" />
                    <ChipGrid
                      cols="grid-cols-5"
                      items={PERIODS.map((p) => ({
                        key: p,
                        label: p,
                        active: periods.includes(p),
                        idleClassName: "bg-[#3a2c22] text-muted",
                        toggle: () => toggle(periods, p, setPeriods),
                      }))}
                    />
                    <FilterRule label="特技" />
                    <ChipGrid
                      cols="grid-cols-7"
                      items={SKILLS.map((s) => ({
                        key: String(s.id),
                        label: s.short,
                        active: skills.includes(s.id),
                        ariaLabel: s.name,
                        className: "border border-black bg-black text-cost",
                        idleClassName: "border border-black bg-cost text-black",
                        toggle: () => toggle(skills, s.id, setSkills),
                      }))}
                    />
                    <FilterRule label="計略類型" />
                    <ChipGrid
                      cols="grid-cols-5"
                      items={STRAT_CATS.map((cat) => ({
                        key: cat,
                        label: translateCat(cat),
                        active: stratCats.includes(cat),
                        ariaLabel: `計略 ${translateCat(cat)}`,
                        idleClassName: "bg-[#3a2c22] text-muted",
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
                </div>
                <div className="border-t border-faction-ko/40 px-4 py-2 sm:px-6">
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-center rounded-md bg-faction-ko text-sm font-medium text-white"
                    onClick={closeMoreFilters}
                  >
                    完成
                  </button>
                </div>
              </div>
            ) : null}
            </div>
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
            <ToolsPage page={toolPage} onPage={setToolView} />
          </div>
          <div className="tab-pane">
            <GuidePage topic={guideTopic} onTopic={setGuideView} />
          </div>
          </div>
          </div>
        </section>

        <aside className={cn("relative hidden min-h-0 overflow-hidden lg:flex lg:flex-col", selected && "card-frame", selected && `card-frame-${selected.rarity.toLowerCase()}`)}>
          <div className={cn("relative min-h-0 flex-1 overflow-hidden", selected && "card-frame-body bg-bg")}>
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
          </div>
        </aside>
      </div>

      {exitHint ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[70] flex justify-center px-4">
          <p className="rounded-full bg-black/85 px-4 py-2 text-sm text-fg shadow-[var(--shadow-border)]">再按一次關閉程式</p>
        </div>
      ) : null}

      {sheetOpen && selected && (tab === "search" || tab === "recents") ? (
        <div className={cn("card-frame absolute inset-0 z-50 flex min-h-0 flex-col lg:hidden", `card-frame-${selected.rarity.toLowerCase()}`)}>
          <div className="card-frame-body relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg">
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
            className="absolute right-0 top-[env(safe-area-inset-top)] z-20 flex size-16 items-start justify-end pt-0.5 pr-0.5 text-[#8a847c]"
            aria-label="關閉"
          >
            <X className="size-5" />
          </button>
          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-[max(3rem,calc(env(safe-area-inset-top)+2.5rem))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <CardDetail card={selected} />
          </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

function useTabScroller(tab: Tab, goTab: (next: Tab) => void) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef(tab);
  const goRef = useRef(goTab);
  const skipScroll = useRef(false);
  const busy = useRef(false);
  tabRef.current = tab;
  goRef.current = goTab;

  function place(x: number, animate: boolean) {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate ? "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    track.style.transform = `translate3d(${x}px,0,0)`;
  }

  useEffect(() => {
    const track = trackRef.current;
    const root = rootRef.current;
    if (!track || !root) return;
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    const x = -TABS.indexOf(tab) * (root.clientWidth || 1);
    busy.current = true;
    place(x, true);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      busy.current = false;
    };
    track.addEventListener("transitionend", finish);
    const timer = window.setTimeout(finish, 320);
    return () => {
      track.removeEventListener("transitionend", finish);
      window.clearTimeout(timer);
    };
  }, [tab]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    let axis: "h" | "v" | null = null;
    let x0 = 0;
    let y0 = 0;
    let base = 0;
    let w = 1;
    let t0 = 0;
    let dx = 0;
    let snapTimer = 0;
    let blockClick = false;

    const settleTo = (i: number) => {
      busy.current = true;
      window.clearTimeout(snapTimer);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        busy.current = false;
        const next = TABS[i];
        if (next && next !== tabRef.current) {
          skipScroll.current = true;
          goRef.current(next);
        }
      };
      const onEnd = (e: TransitionEvent) => {
        if (e.target !== track || e.propertyName !== "transform") return;
        track.removeEventListener("transitionend", onEnd);
        finish();
      };
      track.addEventListener("transitionend", onEnd);
      snapTimer = window.setTimeout(() => {
        track.removeEventListener("transitionend", onEnd);
        finish();
      }, 320);
      place(-i * w, true);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [data-no-swipe]")) {
        axis = "v";
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      x0 = t.clientX;
      y0 = t.clientY;
      t0 = performance.now();
      w = root.clientWidth || 1;
      base = -Math.max(0, TABS.indexOf(tabRef.current)) * w;
      dx = 0;
      axis = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || axis === "v") return;
      const t = e.touches[0];
      if (!t) return;
      dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (axis == null) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (axis === "v") return;
        blockClick = true;
        busy.current = true;
        track.style.transition = "none";
      }
      if (axis !== "h") return;
      e.preventDefault();
      const min = -(TABS.length - 1) * w;
      let x = base + dx;
      if (x > 0) x *= 0.28;
      else if (x < min) x = min + (x - min) * 0.28;
      track.style.transform = `translate3d(${x}px,0,0)`;
    };

    const onTouchEnd = () => {
      if (axis === "h") {
        const i0 = Math.max(0, TABS.indexOf(tabRef.current));
        const dist = Math.abs(dx);
        const dt = Math.max(16, performance.now() - t0);
        const speed = dist / dt;
        const commit = dist >= Math.max(72, w * 0.22) || (dist >= 48 && speed >= 0.5);
        let i = i0;
        if (commit) {
          if (dx < -8) i = Math.min(TABS.length - 1, i0 + 1);
          else if (dx > 8) i = Math.max(0, i0 - 1);
        }
        settleTo(i);
      }
      axis = null;
    };

    const onClick = (e: MouseEvent) => {
      if (!blockClick) return;
      blockClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    root.addEventListener("touchend", onTouchEnd);
    root.addEventListener("touchcancel", onTouchEnd);
    root.addEventListener("click", onClick, true);
    const ro = new ResizeObserver(() => {
      if (busy.current || axis === "h") return;
      w = root.clientWidth || 1;
      place(-Math.max(0, TABS.indexOf(tabRef.current)) * w, false);
    });
    ro.observe(root);
    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove, true);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
      root.removeEventListener("click", onClick, true);
      ro.disconnect();
      window.clearTimeout(snapTimer);
    };
  }, []);

  return { rootRef, trackRef };
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
        "list-row mb-1 flex w-full items-center gap-2 rounded-sm bg-white/[0.06] px-2 py-1.5 text-left",
        active ? "bg-white/[0.14]" : "hover:bg-white/[0.09]",
      )}
    >
      <span className={cn("w-1 shrink-0 self-stretch rounded-full", COLOR_BAR[card.color])} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <span className={cn("shrink-0 rounded-sm px-1 py-px font-medium", COLOR_CLASS[card.color])}>{card.no}</span>
          <UnitIcon unit={card.unit} title={card.unit} className="size-4 shrink-0" />
          <RarityMark rarity={card.rarity} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate font-bold text-fg">{card.name}</span>
          <CostPips cost={card.cost} small />
          <span className="shrink-0 tabular-nums text-fg">
            {card.power}/{card.intel}
          </span>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-faint">
          <span className="shrink-0 text-muted">{card.period}</span>
          <span className="min-w-0 truncate text-fg">{card.stratName}</span>
          <span className="shrink-0 tabular-nums text-muted">【{card.stratCost}】</span>
          <span className="shrink-0 tabular-nums text-muted">{dur.compact}</span>
          {dur.cap ? <span className="shrink-0 text-[10px] text-faint">上限</span> : null}
          {card.skills.length ? (
            <span className="ml-auto flex shrink-0 items-center">
              <SkillList ids={card.skills} short />
            </span>
          ) : null}
        </div>
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

function StatMark() {
  return (
    <span className="grid leading-none" aria-hidden>
      <span className="text-[13px] font-semibold text-[#e07070]">武</span>
      <span className="-mt-px text-[13px] font-semibold text-[#7aa2e3]">知</span>
    </span>
  );
}

function CostUnitMark() {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      <CostPips cost={4} small stacked />
      <UnitIcon unit="槍兵" className="size-5" />
    </span>
  );
}

function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
  set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
}

function StatPick({
  label,
  tone,
  value,
  onChange,
}: {
  label: string;
  tone: "power" | "intel";
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  const power = tone === "power";
  return (
    <div className={cn("flex h-full min-h-0 flex-col rounded-md px-1.5 py-1.5", power ? "bg-[#3a1818]/80 ring-1 ring-[#b41e22]/40" : "bg-[#152038]/80 ring-1 ring-[#1e3c8a]/55")}>
      <div className="mb-1 flex items-center gap-2">
        <span className={cn("shrink-0 text-xs", power ? "text-[#e07070]" : "text-[#7aa2e3]")}>
          {label}
          {value != null ? ` ${value}` : ""}
        </span>
        <span className={cn("h-px min-w-4 flex-1", power ? "bg-[#b41e22]/50" : "bg-[#1e3c8a]/70")} aria-hidden />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-3 gap-1">
        {Array.from({ length: 12 }, (_, index) => {
          const n = index + 1;
          const on = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${label}${n}`}
              aria-pressed={on}
              onClick={() => onChange(on ? null : n)}
              className={cn(
                "flex h-full min-h-8 items-center justify-center rounded-sm text-sm tabular-nums",
                on
                  ? power
                    ? "bg-faction-hi text-white"
                    : "bg-faction-ao text-white"
                  : power
                    ? "bg-[#2a1212] text-[#c9a3a3]"
                    : "bg-[#121a2e] text-[#a9b8d4]",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatBounds({
  powerMin,
  powerMax,
  intelMin,
  intelMax,
  onPower,
  onIntel,
}: {
  powerMin: number;
  powerMax: number;
  intelMin: number;
  intelMax: number;
  onPower: (min: number, max: number) => void;
  onIntel: (min: number, max: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-1.5">
      <StatBound label="武力範圍" min={powerMin} max={powerMax} onChange={onPower} />
      <StatBound label="知力範圍" min={intelMin} max={intelMax} onChange={onIntel} />
    </div>
  );
}

function StatBound({
  label,
  min,
  max,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const nums = Array.from({ length: STAT_HI - STAT_LO + 1 }, (_, index) => STAT_LO + index);
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="shrink-0 text-xs text-faint">{label}</span>
        <span className="h-px min-w-4 flex-1 bg-border" aria-hidden />
      </div>
      <div className="flex items-center gap-1">
        <select
          aria-label={`${label}下限`}
          value={min}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(next, Math.max(next, max));
          }}
          className="plain-press h-8 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
        >
          {nums.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="shrink-0 text-xs text-faint">至</span>
        <select
          aria-label={`${label}上限`}
          value={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Math.min(min, next), next);
          }}
          className="plain-press h-8 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
        >
          {nums.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ResultMarquee({ text }: { text: string }) {
  const box = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const [run, setRun] = useState(false);
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = measure.current;
    if (!outer || !inner) return;
    const tick = () => setRun(inner.scrollWidth > outer.clientWidth + 2);
    tick();
    const observer = new ResizeObserver(tick);
    observer.observe(outer);
    return () => observer.disconnect();
  }, [text]);
  const seconds = Math.max(8, Math.round(text.length * 0.35));
  return (
    <div ref={box} className="relative min-w-0 flex-1 overflow-hidden">
      <span ref={measure} className="pointer-events-none absolute text-xs whitespace-nowrap opacity-0" aria-hidden>
        {text}
      </span>
      {run ? (
        <div className="result-marquee flex w-max" style={{ animationDuration: `${seconds}s` }}>
          <span className="pr-10 text-xs tabular-nums whitespace-nowrap text-faint">{text}</span>
          <span className="pr-10 text-xs tabular-nums whitespace-nowrap text-faint" aria-hidden>
            {text}
          </span>
        </div>
      ) : (
        <p className="truncate text-xs tabular-nums whitespace-nowrap text-faint">{text}</p>
      )}
    </div>
  );
}

function DurationRange({
  min,
  max,
  onChange,
}: {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const [lo, setLo] = useState(String(min));
  const [hi, setHi] = useState(String(max));
  useEffect(() => setLo(String(min)), [min]);
  useEffect(() => setHi(String(max)), [max]);
  const edit = (raw: string, which: "min" | "max") => {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    if (which === "min") setLo(digits);
    else setHi(digits);
    if (digits === "") return;
    const value = Math.min(DUR_HI, Math.max(DUR_LO, Number(digits)));
    if (which === "min") onChange(Math.min(value, max), max);
    else onChange(min, Math.max(value, min));
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="shrink-0 text-xs text-faint">計略時長</span>
        <span className="h-px min-w-4 flex-1 bg-border" aria-hidden />
      </div>
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          aria-label="最短時長"
          value={lo}
          onChange={(event) => edit(event.target.value, "min")}
          onBlur={() => setLo(String(min))}
          className="plain-press h-8 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
        />
        <span className="shrink-0 text-xs text-faint">至</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label="最長時長"
          value={hi}
          onChange={(event) => edit(event.target.value, "max")}
          onBlur={() => setHi(String(max))}
          className="plain-press h-8 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
        />
      </div>
    </div>
  );
}

function MoraleRange({
  min,
  max,
  onChange,
}: {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const nums = Array.from({ length: MORALE_HI - MORALE_LO + 1 }, (_, index) => MORALE_LO + index);
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="shrink-0 text-xs text-faint">計略士氣</span>
        <span className="h-px min-w-4 flex-1 bg-border" aria-hidden />
      </div>
      <div className="flex items-center gap-1">
        <select
          aria-label="最低士氣"
          value={min}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(next, Math.max(next, max));
          }}
          className="plain-press h-8 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
        >
          {nums.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="shrink-0 text-xs text-faint">至</span>
        <select
          aria-label="最高士氣"
          value={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Math.min(min, next), next);
          }}
          className="plain-press h-8 min-w-0 flex-1 rounded-md bg-surface-2 px-1 text-center text-sm tabular-nums text-fg"
        >
          {nums.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
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
