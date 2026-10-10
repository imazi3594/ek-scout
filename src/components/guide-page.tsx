import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { RARITY_CHIP, SKILLS } from "@/data/catalog";
import { CostPips, RarityMark } from "@/components/card-identity";
import {
  EIKON_GROUPS,
  EIKON_INTRO,
  BASIC_GROUPS,
  RYUHA_GROUPS,
  SENKI_CATS,
  SENKI_GROUPS,
  SENKI_INTRO,
  SENKI_RARITIES,
  UNIT_GROUPS,
  type GuideGroup,
  type GuideTopic,
  type SenkiRarity,
  ryuhaTheme,
  ryuhaChip,
} from "@/data/guide";
import { SkillChip, SkillExplain } from "@/components/skill-chip";
import { UnitIcon } from "@/components/unit-icon";
import { cn } from "@/lib/utils";
import type { UnitName } from "@/data/catalog";

const TOPIC_MARK: Record<GuideTopic, string> = {
  basic: "bg-faction-gen",
  skills: "bg-faction-ao",
  units: "bg-faction-heki",
  siege: "bg-faction-ko",
  senki: "bg-faction-hi",
  eikon: "bg-faction-shi",
  ryuha: "bg-faction-ou",
};

const TOPICS: { id: GuideTopic; title: string; blurb: string }[] = [
  { id: "basic", title: "基本", blurb: "計數、卡組、士氣、出城與復活、武力與知力。" },
  { id: "skills", title: "特技", blurb: "武將固有被動。開場、戰鬥、移動與槽類效果。" },
  { id: "units", title: "兵種", blurb: "移速、攻城基礎，同槍、弓、斬、鐵砲的動作。" },
  { id: "siege", title: "攻城", blurb: "攻城力計算器。按兵種、武力、成本同加成，估算城牆同城門傷害。" },
  { id: "senki", title: "戰器", blurb: "對戰中僅能使用一次的裝備技。主效果、追加與時長皆為 Master。" },
  { id: "eikon", title: "英魂", blurb: "裝在戰器上，只強化裝備的那名武將。一般可疊，寶石不重複。" },
  { id: "ryuha", title: "流派", blurb: "壱・弐・参の型。表為永久，裏多為時限。" },
];

export function GuidePage({ topic, onTopic }: { topic: GuideTopic | null; onTopic: (topic: GuideTopic | null) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const menuScroll = useRef(0);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = topic ? 0 : menuScroll.current;
  }, [topic]);

  if (!topic) {
    return (
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6"
        onScroll={(event) => {
          menuScroll.current = event.currentTarget.scrollTop;
        }}
      >
        <p className="text-sm leading-relaxed text-pretty text-muted">請選擇要查閱的資料。</p>
        <div className="mt-4 flex flex-col gap-2">
          {TOPICS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTopic(item.id)}
              className="flex overflow-hidden rounded-xl border border-border bg-surface-2 text-left hover:bg-surface-3"
            >
              <span className={cn("w-1.5 shrink-0", TOPIC_MARK[item.id])} />
              <span className="px-4 py-3">
                <span className="block font-display text-lg text-fg">{item.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-pretty text-fg/75">{item.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={scroller} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() => onTopic(null)}
        className="mb-4 inline-flex h-8 items-center gap-1 rounded-md bg-surface-2 px-2.5 text-xs text-fg"
      >
        <ChevronLeft className="size-3.5" />
        返回資料
      </button>
      {topic === "basic" ? <GroupGuide intro="對戰共通規則。計略的具體 C 數見於武將詳情。" groups={BASIC_GROUPS} mark={TOPIC_MARK.basic} /> : null}
      {topic === "skills" ? <SkillsGuide /> : null}
      {topic === "units" ? <UnitGuide /> : null}
      {topic === "siege" ? <SiegeCalc /> : null}
      {topic === "senki" ? <SenkiGuide /> : null}
      {topic === "eikon" ? <GroupGuide intro={EIKON_INTRO} groups={EIKON_GROUPS} mark={TOPIC_MARK.eikon} /> : null}
      {topic === "ryuha" ? <RyuhaGuide /> : null}
    </div>
  );
}

function GuideLead({ children, extra }: { children: string; extra?: string }) {
  return (
    <div className="rounded-xl border border-cost/35 bg-surface-3 px-3.5 py-3">
      <p className="text-sm leading-relaxed text-pretty text-fg">{children}</p>
      {extra ? <p className="mt-1.5 text-xs tabular-nums text-cost">{extra}</p> : null}
    </div>
  );
}

function SkillsGuide() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-2">
        {SKILLS.map((skill) => {
          const on = open === skill.id;
          return (
            <section key={skill.id} className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface-2">
              <button
                type="button"
                onClick={() => setOpen(on ? null : skill.id)}
                className="plain-press flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left"
              >
                <SkillChip id={skill.id} />
                <span className="min-w-0 flex-1" />
                <ChevronDown className={cn("size-4 shrink-0 text-fg/50 transition-transform", on && "rotate-180")} />
              </button>
              {on ? (
                <div className="border-t border-border px-3 pb-3">
                  <SkillExplain id={skill.id} bodyOnly />
                </div>
              ) : null}
            </section>
          );
        })}
    </div>
  );
}

function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
  set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
}

const SENKI_CAT_TONE: Record<string, { bg: string; fg: string }> = {
  宝物: { bg: "#c4a000", fg: "#1a1612" },
  鎧兜: { bg: "#3d6ea8", fg: "#f3efe6" },
  武器: { bg: "#b41e22", fg: "#f3efe6" },
  軍配: { bg: "#7a1470", fg: "#f3efe6" },
  馬: { bg: "#1f8a4c", fg: "#f3efe6" },
  書物: { bg: "#d7d0c6", fg: "#1a1612" },
  宝石: { bg: "#c45a8a", fg: "#1a1612" },
};

function SenkiGuide() {
  const [rarities, setRarities] = useState<SenkiRarity[]>(["SR"]);
  const [cats, setCats] = useState<string[]>([]);
  const groups = useMemo(() => {
    return SENKI_GROUPS.flatMap((group) => {
      if (cats.length && !cats.some((c) => group.title.startsWith(c))) return [];
      const items = group.items.filter((item) => {
        if (!rarities.length || !item.rarity) return true;
        return rarities.includes(item.rarity);
      });
      if (!items.length) return [];
      return [{ ...group, items }];
    });
  }, [rarities, cats]);

  return (
    <>
      <GuideLead>{SENKI_INTRO}</GuideLead>
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-fg/60">稀有</span>
          {SENKI_RARITIES.map((r) => {
            const on = rarities.includes(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggle(rarities, r, setRarities)}
                className={cn("h-8 min-w-8 rounded-md px-2.5 text-xs", on ? RARITY_CHIP[r].active : RARITY_CHIP[r].idle)}
              >
                {r}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-fg/60">種類</span>
          {SENKI_CATS.map((cat) => {
            const on = cats.includes(cat);
            const tone = SENKI_CAT_TONE[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggle(cats, cat, setCats)}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs", !on && "bg-surface-3 text-fg")}
                style={on && tone ? { backgroundColor: tone.bg, color: tone.fg } : undefined}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: on ? tone?.fg : tone?.bg }}
                />
                {cat}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-6">
        {groups.length ? (
          groups.map((group) => <GuideSection key={group.title} group={group} showRarity mark={TOPIC_MARK.senki} />)
        ) : (
          <p className="text-sm text-muted">沒有符合篩選的戰器。</p>
        )}
      </div>
    </>
  );
}

function ryuhaKind(title: string) {
  return (title.split("・")[0] ?? "").replace("気", "氣");
}

function RyuhaIcon({ kind, className }: { kind: string; className?: string }) {
  const pen = {
    viewBox: "0 0 16 16",
    className: cn("size-4 shrink-0", className),
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (kind === "部隊") {
    return (
      <svg {...pen}>
        <circle cx="3.2" cy="4.2" r="1.15" fill="currentColor" stroke="none" />
        <circle cx="8" cy="3.4" r="1.15" fill="currentColor" stroke="none" />
        <circle cx="12.8" cy="4.2" r="1.15" fill="currentColor" stroke="none" />
        <path d="M1.4 13.2c.5-2.2 1.3-3.3 1.8-3.3s1.3 1.1 1.8 3.3M6.2 13.2c.5-2.4 1.3-3.6 1.8-3.6s1.3 1.2 1.8 3.6M11 13.2c.5-2.2 1.3-3.3 1.8-3.3s1.3 1.1 1.8 3.3" />
      </svg>
    );
  }
  if (kind === "士氣") {
    return (
      <svg {...pen}>
        <path d="M8 14.2c2.5 0 4.1-1.7 4.1-3.9 0-1.6-1-2.7-1.7-3.8-.4 1.2-1.3 1.6-1.6.2C8.2 5.2 8.6 3.2 8 1.8 6.2 3.8 4 5.6 4 8.6c0 2.8 1.6 5.6 4 5.6z" />
      </svg>
    );
  }
  if (kind === "城塞") {
    return (
      <svg {...pen}>
        <path d="M1.6 14.2V7.2h1.8V5h2.1v2.2h2.1V5h2.1v2.2H12V5h2.1v2.2h1.7v7" />
        <path d="M6.2 14.2v-3.2h3.6v3.2" />
      </svg>
    );
  }
  if (kind === "兵種") {
    return (
      <svg {...pen}>
        <path d="M4.2 14V5.2" />
        <path d="M4.2 2.4 6.1 5.4H2.3z" fill="currentColor" stroke="none" />
        <path d="M10.2 3.2c2.3 1.8 2.3 7.8 0 9.6" />
        <path d="M10.2 3.2v9.6" />
      </svg>
    );
  }
  if (kind === "琥煌") {
    return (
      <svg {...pen}>
        <path d="M8 1.2 10.2 8.6H5.8z" />
        <path d="M8 2.6v5.4" />
        <path d="M3.2 9.2h9.6" />
        <path d="M4.4 9.2 3.3 10.6M11.6 9.2l1.1 1.4" />
        <path d="M8 9.2v3.2" />
        <path d="M6.5 13.8h3" />
      </svg>
    );
  }
  return null;
}

function GuideSection({
  group,
  showRarity,
  themed,
  mark,
  nested,
  icon,
}: {
  group: GuideGroup;
  showRarity?: boolean;
  themed?: boolean;
  mark?: string;
  nested?: boolean;
  icon?: ReactNode;
}) {
  const tone = themed ? ryuhaTheme(group.title) : null;
  const veil = tone && nested ? (tone.cardFg === "#1a1612" ? "rgb(255 255 255 / 0.38)" : "rgb(0 0 0 / 0.28)") : null;
  return (
    <section>
      <h3
        className={cn(
          "inline-flex items-center gap-1.5 font-display text-base",
          tone ? "rounded-md px-2 py-1" : "text-fg",
        )}
        style={tone ? { backgroundColor: tone.badgeBg, color: tone.badgeFg } : undefined}
      >
        {tone ? <RyuhaIcon kind={ryuhaKind(group.title)} /> : icon ?? <span className={cn("h-4 w-1 rounded-full", mark ?? "bg-cost")} />}
        {group.title}
      </h3>
      {group.blurb ? (
        <p className={cn("mt-1 text-xs leading-relaxed text-pretty", !tone && "text-fg/70")}>{group.blurb}</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        {group.items.map((item) => (
          <article
            key={item.name}
            className={cn("rounded-xl border p-3", !tone && "border-border bg-surface-2", nested && "border-transparent")}
            style={
              tone
                ? { backgroundColor: veil ?? tone.cardBg, color: tone.cardFg }
                : undefined
            }
          >
            <div className={cn("flex items-baseline gap-2", !tone && "text-fg")}>
              {showRarity && item.rarity ? <RarityMark rarity={item.rarity} className="text-xs" /> : null}
              <p className={cn("font-display text-sm", !tone && "text-fg")}>{item.name}</p>
            </div>
            {item.note ? (
              <p className={cn("mt-1 text-sm leading-relaxed text-pretty", !tone && "text-fg/85")} style={tone ? { color: tone.cardFg } : undefined}>
                {item.note}
              </p>
            ) : null}
            {item.facts?.length ? (
              <dl className={cn("grid grid-cols-1 gap-1.5 sm:grid-cols-2", item.note ? "mt-2" : "mt-3")}>
                {item.facts.map((row) => (
                  <div
                    key={row.label}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-md px-2.5 py-2",
                      !tone && "bg-surface-3",
                    )}
                    style={tone ? { backgroundColor: veil ? (tone.cardFg === "#1a1612" ? "rgb(255 255 255 / 0.45)" : "rgb(0 0 0 / 0.22)") : tone.factBg } : undefined}
                  >
                    <dt className={cn("shrink-0 text-xs", !tone && "text-fg/60")} style={tone ? { color: tone.factMuted } : undefined}>
                      {row.label}
                    </dt>
                    <dd
                      className={cn("text-right text-sm font-medium leading-relaxed text-pretty", !tone && "text-fg")}
                      style={tone ? { color: tone.factFg } : undefined}
                    >
                      <span className="block">{row.value}</span>
                      {row.sub ? (
                        <span
                          className={cn("mt-0.5 block text-xs font-normal", !tone && "text-fg/60")}
                          style={tone ? { color: tone.factMuted } : undefined}
                        >
                          {row.sub}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

const UNIT_ICON: Record<string, UnitName> = {
  騎兵: "騎兵",
  槍兵: "槍兵",
  弓兵: "弓兵",
  劍豪: "剣豪",
  鐵砲隊: "鉄砲隊",
};

const UNIT_TONE: Record<string, { bg: string; fg: string }> = {
  騎兵: { bg: "#2e4a68", fg: "#e6e0d4" },
  槍兵: { bg: "#6a383c", fg: "#e6e0d4" },
  弓兵: { bg: "#2c5644", fg: "#e6e0d4" },
  劍豪: { bg: "#53405c", fg: "#e6e0d4" },
  鐵砲隊: { bg: "#5e4a32", fg: "#e6e0d4" },
};

function FolderBoard({
  tabs,
  active,
  onPick,
  icon,
  children,
}: {
  tabs: { id: string; label: string; bg: string; fg: string }[];
  active: string;
  onPick: (id: string) => void;
  icon?: (id: string) => ReactNode;
  children: ReactNode;
}) {
  const open = tabs.find((tab) => tab.id === active);
  return (
    <div className="mt-4">
      <div className="flex items-end gap-1">
        {tabs.map((tab) => {
          const on = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onPick(tab.id)}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-t-lg px-0.5 font-medium leading-none",
                on ? "z-10 -mb-px h-11 text-xs" : "h-8 text-[11px] opacity-75",
              )}
              style={{ backgroundColor: tab.bg, color: tab.fg }}
            >
              {icon ? icon(tab.id) : null}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="rounded-b-xl px-3 py-4" style={open ? { backgroundColor: open.bg, color: open.fg } : undefined}>
        {children}
      </div>
    </div>
  );
}

const SIEGE_COEF = [1, 2.5, 3.75, 4.7, 5.65, 6.55, 7.5] as const;
const SIEGE_COST = [1, 1.5, 2, 2.5, 3, 3.5, 4] as const;
const SIEGE_BASE: Record<UnitName, number> = {
  騎兵: 0.56,
  弓兵: 1.3,
  鉄砲隊: 1.3,
  剣豪: 1.5,
  槍兵: 2,
};
const SIEGE_UNITS: { id: UnitName; label: string }[] = [
  { id: "騎兵", label: "騎" },
  { id: "槍兵", label: "槍" },
  { id: "弓兵", label: "弓" },
  { id: "剣豪", label: "劍" },
  { id: "鉄砲隊", label: "鐵" },
];

const SIEGE_TIME: { sec: number; c: number }[] = [
  { sec: 5.53, c: 2.3 },
  { sec: 5.42, c: 2.26 },
  { sec: 5.28, c: 2.2 },
  { sec: 5.15, c: 2.15 },
  { sec: 5.01, c: 2.09 },
  { sec: 4.87, c: 2.03 },
  { sec: 4.73, c: 1.97 },
  { sec: 4.6, c: 1.92 },
  { sec: 4.46, c: 1.86 },
  { sec: 4.33, c: 1.8 },
  { sec: 4.19, c: 1.75 },
  { sec: 4.05, c: 1.69 },
  { sec: 3.92, c: 1.63 },
  { sec: 3.78, c: 1.58 },
  { sec: 3.64, c: 1.52 },
  { sec: 3.51, c: 1.46 },
  { sec: 3.37, c: 1.4 },
  { sec: 3.23, c: 1.35 },
  { sec: 3.09, c: 1.29 },
  { sec: 3, c: 1.25 },
];

type SiegeStratKind = "none" | "self" | "order";

const SIEGE_STRATS: { id: string; label: string; mul: number; flat: number; kind: SiegeStratKind }[] = [
  { id: "none", label: "無", mul: 1, flat: 0, kind: "none" },
  { id: "kibitsu", label: "吉備津彦・金剛の位　×4＋5%", mul: 4, flat: 5, kind: "self" },
  { id: "todo", label: "藤堂平助・一気呵成　×3＋4%", mul: 3, flat: 4, kind: "self" },
  { id: "maki", label: "真木保臣・今楠公の激発　×3＋3%", mul: 3, flat: 3, kind: "self" },
  { id: "gaoshun", label: "高順・陥陣営　×1.5＋6%", mul: 1.5, flat: 6, kind: "self" },
  { id: "yasuda", label: "安田長秀・安田・特攻！　×1.5＋4%", mul: 1.5, flat: 4, kind: "self" },
  { id: "koukou", label: "黄蓋・老将の攻城術　×1.3＋4%", mul: 1.3, flat: 4, kind: "self" },
  { id: "soukyuu", label: "曹休・特攻戦法　×1.3＋4%", mul: 1.3, flat: 4, kind: "self" },
  { id: "houjou", label: "北条高広・凶漢の進攻　×1.3＋4%", mul: 1.3, flat: 4, kind: "self" },
  { id: "kanyou", label: "簡雍・無血開城　×1.3", mul: 1.3, flat: 0, kind: "self" },
  { id: "houtoku", label: "龐徳・果敢な砕突　×1.3", mul: 1.3, flat: 0, kind: "self" },
  { id: "kanpei", label: "関平・忠勇の目覚め　×1.2＋2%", mul: 1.2, flat: 2, kind: "self" },
  { id: "kaishi", label: "介子推・閃光の進撃　×1.1＋1%", mul: 1.1, flat: 1, kind: "self" },
  { id: "takasugi", label: "高杉晋助・旧態の破壊者　×1.7", mul: 1.7, flat: 0, kind: "order" },
  { id: "katsuyori", label: "武田勝頼・獅吼の采配　×1.3＋1%", mul: 1.3, flat: 1, kind: "order" },
  { id: "oujou-hi", label: "王翦・三元の戦（弓鐵合計 4.5+）　×1.3＋2%", mul: 1.3, flat: 2, kind: "order" },
  { id: "oujou-mid", label: "王翦・三元の戦（弓鐵合計 2.5–4）　×1.2＋1.5%", mul: 1.2, flat: 1.5, kind: "order" },
  { id: "oujou-lo", label: "王翦・三元の戦（弓鐵合計 1–2）　×1.1＋1%", mul: 1.1, flat: 1, kind: "order" },
  { id: "kouyu", label: "公輸盤・破城の号令　×1.3＋4%", mul: 1.3, flat: 4, kind: "order" },
  { id: "rokkaku", label: "六角義賢・六角の陣　×1.3＋1.6%", mul: 1.3, flat: 1.6, kind: "order" },
  { id: "ouki", label: "王騎・天下の大将軍　×1.3", mul: 1.3, flat: 0, kind: "order" },
  { id: "dokan", label: "太田道灌・黄道無尽　×1.2＋2%", mul: 1.2, flat: 2, kind: "order" },
  { id: "shika", label: "山中鹿之助・七難八苦の采配　×1.2＋1.5%", mul: 1.2, flat: 1.5, kind: "order" },
  { id: "ito", label: "伊東甲子太郎・盟主の号令　×1.2＋1%", mul: 1.2, flat: 1, kind: "order" },
  { id: "katamori", label: "松平容保・盛衰存亡の誓い　×1.2＋1%", mul: 1.2, flat: 1, kind: "order" },
  { id: "jukei", label: "寿桂尼・尼御台の采配　×1.2＋1%", mul: 1.2, flat: 1, kind: "order" },
  { id: "saigo", label: "西郷従道・小西郷の琥陣（3劍）　×1.2＋1%", mul: 1.2, flat: 1, kind: "order" },
  { id: "ensho-hi", label: "袁紹・王者の大進軍（渾身強）　×1.2＋1%", mul: 1.2, flat: 1, kind: "order" },
  { id: "ensho-lo", label: "袁紹・王者の大進軍（渾身弱）　×1.1＋0.5%", mul: 1.1, flat: 0.5, kind: "order" },
  { id: "kenshin", label: "上杉謙信・毘沙門天の陣　×1.1＋2%", mul: 1.1, flat: 2, kind: "order" },
  { id: "choki", label: "趙姫・舞姫の火遊び　×1.1＋1%", mul: 1.1, flat: 1, kind: "order" },
  { id: "alan", label: "アラン・ア・デイル・吟遊の調べ　×1.1＋1%", mul: 1.1, flat: 1, kind: "order" },
  { id: "esca", label: "偉丈夫エスカノール・進攻の戦旗　×1.1＋1%", mul: 1.1, flat: 1, kind: "order" },
  { id: "shokatsu", label: "諸葛亮・伏龍のひらめき　×1.1＋1%", mul: 1.1, flat: 1, kind: "order" },
  { id: "jia", label: "賈南風・悪女の淫蕩　×1.1＋1%", mul: 1.1, flat: 1, kind: "order" },
  { id: "song", label: "宋江・星主の星　×1.1＋1%", mul: 1.1, flat: 1, kind: "order" },
  { id: "yasuhira", label: "藤原泰衡・栄枯盛衰　×1.1＋1%", mul: 1.1, flat: 1, kind: "order" },
];

function stratBy(id: string) {
  return SIEGE_STRATS.find((item) => item.id === id) ?? SIEGE_STRATS[0];
}

function cut2(n: number) {
  return Math.trunc(n * 100 + 1e-8) / 100;
}

type SiegeRyuha = "none" | "butai" | "kokou";
type SiegeSenki = "none" | "tatenashi" | "onimaru";

function siegeOf(
  unit: UnitName,
  power: number,
  costIndex: number,
  ryuha: SiegeRyuha,
  senki: SiegeSenki,
  ward: boolean,
  selfId: string,
  orderId: string,
) {
  const coef = SIEGE_COEF[costIndex] ?? 1;
  const self = stratBy(selfId);
  const order = stratBy(orderId);
  const atk = power + (senki === "onimaru" ? 3 : 0);
  let value = (SIEGE_BASE[unit] + 0.02 * atk) * coef;
  value *= self.mul * order.mul;
  if (senki !== "none") value *= 1.3;
  value += self.flat + order.flat;
  if (ryuha === "butai") value = value * 1.1 + 0.5;
  if (ryuha === "kokou") value *= 1.05;
  if (ward) value *= 0.9;
  const wall = cut2(value);
  return { wall, gate: cut2(wall * 1.65) };
}

function siegeTone(pct: number) {
  if (pct >= 15) return "#e07a2f";
  if (pct >= 10) return "#e2c15a";
  return undefined;
}

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number | ((current: number) => number)) => void;
  label: string;
}) {
  const timer = useRef<number | null>(null);
  const repeated = useRef(false);
  const skipClick = useRef(false);
  const stop = () => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const hold = (dir: number) => {
    repeated.current = false;
    let ticks = 0;
    const run = () => {
      ticks += 1;
      repeated.current = true;
      const step = ticks < 8 ? 1 : ticks < 16 ? 5 : 10;
      onChange((current) => Math.min(max, Math.max(min, current + dir * step)));
      timer.current = window.setTimeout(run, 70);
    };
    timer.current = window.setTimeout(run, 280);
  };
  return (
    <div className="inline-flex h-9 items-center overflow-hidden rounded-md bg-surface-2">
      <button
        type="button"
        className="plain-press h-full w-9 text-base text-fg"
        aria-label={`${label}減少`}
        onPointerDown={() => hold(-1)}
        onPointerUp={() => {
          if (repeated.current) skipClick.current = true;
          stop();
        }}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onClick={() => {
          if (skipClick.current) {
            skipClick.current = false;
            return;
          }
          onChange((current) => Math.max(min, current - 1));
        }}
      >
        −
      </button>
      <input
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          onChange(digits === "" ? min : Math.min(max, Math.max(min, Number(digits))));
        }}
        className="w-10 bg-transparent text-center text-sm tabular-nums text-fg outline-none"
      />
      <button
        type="button"
        className="plain-press h-full w-9 text-base text-fg"
        aria-label={`${label}增加`}
        onPointerDown={() => hold(1)}
        onPointerUp={() => {
          if (repeated.current) skipClick.current = true;
          stop();
        }}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onClick={() => {
          if (skipClick.current) {
            skipClick.current = false;
            return;
          }
          onChange((current) => Math.min(max, current + 1));
        }}
      >
        ＋
      </button>
    </div>
  );
}

function SiegeRule({ label, extra }: { label: string; extra?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="shrink-0 text-xs text-faint">{label}</span>
      <span className="h-px min-w-4 flex-1 bg-border" aria-hidden />
      {extra}
    </div>
  );
}

function SiegeCalc() {
  const [unit, setUnit] = useState<UnitName>("槍兵");
  const [costIndex, setCostIndex] = useState(3);
  const [power, setPower] = useState(8);
  const [intel, setIntel] = useState(8);
  const [ryuha, setRyuha] = useState<SiegeRyuha>("none");
  const [senki, setSenki] = useState<SiegeSenki>("none");
  const [ward, setWard] = useState(false);
  const [selfStrat, setSelfStrat] = useState("none");
  const [orderStrat, setOrderStrat] = useState("none");
  const { wall, gate } = siegeOf(unit, power, costIndex, ryuha, senki, ward, selfStrat, orderStrat);
  const time = SIEGE_TIME[Math.min(20, intel + (ryuha === "butai" ? 2 : 0)) - 1] ?? SIEGE_TIME[0];
  const wallTone = siegeTone(wall);
  const gateTone = siegeTone(gate);
  const reset = () => {
    setUnit("槍兵");
    setCostIndex(3);
    setPower(8);
    setIntel(8);
    setRyuha("none");
    setSenki("none");
    setWard(false);
    setSelfStrat("none");
    setOrderStrat("none");
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 -mx-4 bg-[#1c120c] sm:-mx-6">
        <dl>
          <div className="flex h-2.5 items-end gap-1 bg-[#2a160e] px-1" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} className={cn("h-2 flex-1 bg-[#c46a32]", i % 2 ? "opacity-0" : "opacity-90")} />
            ))}
          </div>
          <div className="bg-[linear-gradient(to_bottom,#1a120e_0%,#3a1a12_58%,#6a2a14_82%,#9a3412_100%)]">
            <div className="grid grid-cols-3 divide-x divide-[#a35a28]/40">
              <div className="min-w-0 px-3 py-2.5">
                <dt className="text-xs text-[#e7c39a]">城門</dt>
                <dd className="mt-1 whitespace-nowrap font-display text-xl leading-none tabular-nums text-fg" style={{ color: gateTone }}>
                  {gate}%{gate >= 15 ? <span className="text-base">💥</span> : null}
                </dd>
              </div>
              <div className="min-w-0 px-3 py-2.5">
                <dt className="text-xs text-[#e7c39a]">城牆</dt>
                <dd className="mt-1 whitespace-nowrap font-display text-xl leading-none tabular-nums text-fg" style={{ color: wallTone }}>
                  {wall}%{wall >= 15 ? <span className="text-base">💥</span> : null}
                </dd>
              </div>
              <div className="min-w-0 px-3 py-2.5">
                <dt className="text-xs text-[#e7c39a]">需時</dt>
                <dd className="mt-1 whitespace-nowrap font-display text-xl leading-none tabular-nums text-fg">
                  {time.sec}<span className="text-sm">秒</span>
                  <span className="ml-1 text-sm text-fg/70">{time.c}C</span>
                </dd>
              </div>
            </div>
            <div className="relative h-8 overflow-hidden">
              <svg className="siege-flame absolute inset-y-0 left-0 h-full w-[130%]" viewBox="0 0 400 48" preserveAspectRatio="none" aria-hidden>
                <path fill="#ea580c" opacity="0.9" d="M0 48V22C16 28 22 8 40 18C54 26 64 4 82 16C96 26 108 12 126 22C144 10 156 4 174 16C190 26 202 12 220 22C238 10 250 6 268 16C284 26 298 14 316 22C334 10 348 6 366 18C382 26 392 16 400 12V48Z" />
              </svg>
              <svg className="siege-flame-inner absolute inset-y-0 left-0 h-full w-[130%]" viewBox="0 0 400 48" preserveAspectRatio="none" aria-hidden>
                <path fill="#fbbf24" opacity="0.75" d="M0 48V36C20 36 28 28 46 32C62 36 74 26 92 32C108 38 122 42 140 34C158 28 172 32 190 38C208 42 222 28 240 34C258 40 274 34 292 30C310 26 326 36 344 32C362 28 380 36 400 32V48Z" />
              </svg>
              <p className="relative px-3 py-1.5 text-right text-[10px] tracking-widest text-[#f6e7c1]/55">只供參考</p>
            </div>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-5 rounded-xl bg-surface px-3 py-3">
      <div>
        <SiegeRule
          label="兵種"
          extra={
            <button
              type="button"
              className="plain-press h-7 shrink-0 rounded-md bg-faction-hi px-2.5 text-xs font-medium text-white"
              onClick={reset}
            >
              重設
            </button>
          }
        />
        <div className="grid grid-cols-5 gap-1">
          {SIEGE_UNITS.map((item) => {
            const on = unit === item.id;
            const tone = UNIT_TONE[item.id === "剣豪" ? "劍豪" : item.id === "鉄砲隊" ? "鐵砲隊" : item.id];
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => setUnit(item.id)}
                className={cn(
                  "plain-press flex h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] leading-none",
                  !on && "bg-surface-2 text-muted",
                )}
                style={on && tone ? { backgroundColor: tone.bg, color: tone.fg } : undefined}
              >
                <UnitIcon unit={item.id} className="size-5" title={item.label} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <SiegeRule label="成本" />
        <div className="grid grid-cols-7 gap-1">
          {SIEGE_COST.map((cost, index) => {
            const on = costIndex === index;
            return (
              <button
                key={cost}
                type="button"
                aria-pressed={on}
                onClick={() => setCostIndex(index)}
                className={cn(
                  "plain-press flex h-9 items-center justify-center rounded-md",
                  on ? "bg-surface-2 ring-2 ring-inset ring-fg" : "bg-surface-2",
                )}
              >
                <CostPips cost={cost} small stacked />
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <SiegeRule label="武力" />
          <Stepper label="武力" value={power} min={0} max={99} onChange={setPower} />
        </div>
        <div>
          <SiegeRule label="知力" />
          <Stepper label="知力" value={intel} min={1} max={20} onChange={setIntel} />
        </div>
      </div>
      <div>
        <SiegeRule label="單體強化" />
        <select
          value={selfStrat}
          onChange={(event) => setSelfStrat(event.target.value)}
          className="plain-press h-9 w-full rounded-md bg-surface-2 px-2 text-xs text-fg"
        >
          {SIEGE_STRATS.filter((item) => item.kind !== "order").map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <SiegeRule label="號令" />
        <select
          value={orderStrat}
          onChange={(event) => setOrderStrat(event.target.value)}
          className="plain-press h-9 w-full rounded-md bg-surface-2 px-2 text-xs text-fg"
        >
          {SIEGE_STRATS.filter((item) => item.kind !== "self").map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <SiegeRule label="流派加成" />
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              ["none", "無"],
              ["butai", "部隊裏 ×1.1"],
              ["kokou", "琥煌 ×1.05"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={ryuha === id}
              onClick={() => setRyuha(id)}
              className={cn(
                "plain-press h-9 rounded-md px-1 text-[11px] leading-none",
                ryuha === id ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-faint">部隊裏另＋0.5%，並把知力＋2。城塞表、裏都是敵城受傷 ×0.9。</p>
      </div>
      <div>
        <SiegeRule label="流派減成" />
        <button
          type="button"
          aria-pressed={ward}
          onClick={() => setWard((on) => !on)}
          className={cn(
            "plain-press h-9 rounded-md px-3 text-[11px]",
            ward ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
          )}
        >
          敵城塞 ×0.9
        </button>
      </div>
      <div>
        <SiegeRule label="戰器" />
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              ["none", "無"],
              ["tatenashi", "楯無 ×1.3"],
              ["onimaru", "鬼丸 ×1.3"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={senki === id}
              onClick={() => setSenki(id)}
              className={cn(
                "plain-press h-9 rounded-md px-1 text-[11px] leading-none",
                senki === id ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-faint">鬼丸另把武力＋3。兩者都是攻城力＋30%。</p>
      </div>
      </div>
    </div>
  );
}

function UnitGuide() {
  const [title, setTitle] = useState(UNIT_GROUPS[0]?.title ?? "");
  const group = UNIT_GROUPS.find((item) => item.title === title) ?? UNIT_GROUPS[0];
  const tabs = UNIT_GROUPS.map((item) => {
    const tone = UNIT_TONE[item.title] ?? { bg: "#333", fg: "#eee" };
    return {
      id: item.title,
      label: item.title === "鐵砲隊" ? "鐵砲" : item.title,
      bg: tone.bg,
      fg: tone.fg,
    };
  });
  return (
    <>
      {group ? (
        <FolderBoard tabs={tabs} active={group.title} onPick={setTitle}>
          <GuideSection
            group={group}
            icon={UNIT_ICON[group.title] ? <UnitIcon unit={UNIT_ICON[group.title]} className="size-5" title={group.title} /> : undefined}
          />
        </FolderBoard>
      ) : null}
    </>
  );
}

const RYUHA_KINDS = ["部隊", "士氣", "城塞", "兵種", "琥煌"];

function RyuhaGuide() {
  const [kind, setKind] = useState(RYUHA_KINDS[0]);
  const groups = useMemo(
    () => RYUHA_GROUPS.filter((group) => ryuhaKind(group.title) === kind),
    [kind],
  );
  const tabs = RYUHA_KINDS.map((name) => {
    const tone = ryuhaChip(name);
    return { id: name, label: name, bg: tone?.bg ?? "#333", fg: tone?.fg ?? "#eee" };
  });

  return (
    <FolderBoard tabs={tabs} active={kind} onPick={setKind} icon={(id) => <RyuhaIcon kind={id} className="size-3.5" />}>
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <GuideSection key={group.title} group={group} themed nested />
          ))}
        </div>
      </FolderBoard>
  );
}

function GroupGuide({
  intro,
  groups,
  themed,
  mark,
}: {
  intro: string;
  groups: GuideGroup[];
  themed?: boolean;
  mark?: string;
}) {
  return (
    <>
      <GuideLead>{intro}</GuideLead>
      <div className="mt-5 flex flex-col gap-6">
        {groups.map((group) => (
          <GuideSection key={group.title} group={group} themed={themed} mark={mark} />
        ))}
      </div>
    </>
  );
}
