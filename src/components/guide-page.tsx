import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { RARITY_CHIP, SKILLS } from "@/data/catalog";
import { RarityMark } from "@/components/card-identity";
import {
  RYUHA_GROUPS,
  RYUHA_INTRO,
  SENKI_CATS,
  SENKI_GROUPS,
  SENKI_INTRO,
  SENKI_RARITIES,
  type GuideGroup,
  type GuideTopic,
  type SenkiRarity,
  ryuhaTheme,
} from "@/data/guide";
import { SkillExplain } from "@/components/skill-chip";
import { cn } from "@/lib/utils";

const TOPICS: { id: GuideTopic; title: string; blurb: string }[] = [
  { id: "skills", title: "特技", blurb: "武將固有被動。開場、戰鬥、移動與槽類效果。" },
  { id: "senki", title: "戰器", blurb: "對戰中僅能使用一次的裝備技。主效果與追加條件。" },
  { id: "ryuha", title: "流派", blurb: "壱・弐・参の型。表為永久，裏多為時限。" },
];

export function GuidePage({ topic, onTopic }: { topic: GuideTopic | null; onTopic: (topic: GuideTopic | null) => void }) {
  if (!topic) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <p className="text-sm leading-relaxed text-pretty text-muted">請選擇要查閱的資料。</p>
        <div className="mt-4 flex flex-col gap-2">
          {TOPICS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTopic(item.id)}
              className="rounded-lg bg-surface-2 px-4 py-3 text-left hover:bg-surface-3"
            >
              <p className="font-display text-lg text-fg">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-pretty text-muted">{item.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() => onTopic(null)}
        className="mb-4 inline-flex h-8 items-center gap-1 rounded-md bg-surface-2 px-2.5 text-xs text-fg"
      >
        <ChevronLeft className="size-3.5" />
        返回資料
      </button>
      {topic === "skills" ? <SkillsGuide /> : null}
      {topic === "senki" ? <SenkiGuide /> : null}
      {topic === "ryuha" ? <GroupGuide intro={RYUHA_INTRO} groups={RYUHA_GROUPS} themed /> : null}
    </div>
  );
}

function SkillsGuide() {
  return (
    <>
      <p className="text-sm leading-relaxed text-pretty text-muted">
        1C＝2.4 秒，全場 99C。以下為各特技的持續／成本換算。計略的具體 C 數見於武將詳情。
      </p>
      <p className="mt-1 text-xs tabular-nums text-faint">5C＝12秒　10C＝24秒　50C＝120秒　先陣約 49C</p>
      <div className="mt-5 flex flex-col gap-3">
        {SKILLS.map((s) => (
          <SkillExplain key={s.id} id={s.id} />
        ))}
      </div>
    </>
  );
}

function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
  set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
}

function SenkiGuide() {
  const [rarities, setRarities] = useState<SenkiRarity[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const groups = useMemo(() => {
    return SENKI_GROUPS.flatMap((group) => {
      if (cats.length && !cats.some((c) => group.title.startsWith(c))) return [];
      const items = group.items.filter((item) => {
        if (!rarities.length) return true;
        return item.rarity ? rarities.includes(item.rarity) : false;
      });
      if (!items.length) return [];
      return [{ ...group, items }];
    });
  }, [rarities, cats]);

  return (
    <>
      <p className="text-sm leading-relaxed text-pretty text-muted">{SENKI_INTRO}</p>
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
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
        <div className="flex flex-wrap gap-1.5">
          {SENKI_CATS.map((cat) => {
            const on = cats.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggle(cats, cat, setCats)}
                className={cn(
                  "h-8 rounded-md px-2.5 text-xs",
                  on ? "bg-surface-2 font-medium text-fg ring-2 ring-inset ring-fg" : "bg-surface-2 text-muted",
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-6">
        {groups.length ? (
          groups.map((group) => <GuideSection key={group.title} group={group} showRarity />)
        ) : (
          <p className="text-sm text-muted">沒有符合篩選的戰器。</p>
        )}
      </div>
    </>
  );
}

function GuideSection({ group, showRarity, themed }: { group: GuideGroup; showRarity?: boolean; themed?: boolean }) {
  const tone = themed ? ryuhaTheme(group.title) : null;
  return (
    <section>
      <h3 className={cn("font-display text-base", !tone && "text-fg")} style={tone ? { color: tone.head } : undefined}>
        {group.title}
      </h3>
      {group.blurb ? (
        <p className="mt-1 text-xs leading-relaxed text-pretty text-muted">{group.blurb}</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        {group.items.map((item) => (
          <article
            key={item.name}
            className={cn("rounded-lg p-3", !tone && "bg-surface-2")}
            style={
              tone
                ? { backgroundColor: tone.cardBg, color: tone.cardFg }
                : undefined
            }
          >
            <div className={cn("flex items-baseline gap-2", !tone && "text-fg")}>
              {showRarity && item.rarity ? <RarityMark rarity={item.rarity} className="text-xs" /> : null}
              <p className={cn("font-display text-sm", !tone && "text-fg")}>{item.name}</p>
            </div>
            {item.note ? (
              <p className="mt-1 text-sm leading-relaxed text-pretty" style={tone ? { color: tone.cardFg } : undefined}>
                {item.note}
              </p>
            ) : null}
            {item.facts?.length ? (
              <dl className={cn("grid grid-cols-1 gap-1.5 sm:grid-cols-2", item.note ? "mt-2" : "mt-3")}>
                {item.facts.map((row) => (
                  <div
                    key={row.label}
                    className={cn(
                      "flex items-baseline justify-between gap-3 rounded-md px-2.5 py-1.5",
                      !tone && "bg-bg/50",
                    )}
                    style={tone ? { backgroundColor: tone.factBg } : undefined}
                  >
                    <dt className={cn("shrink-0 text-xs", !tone && "text-faint")} style={tone ? { color: tone.factMuted } : undefined}>
                      {row.label}
                    </dt>
                    <dd
                      className={cn("text-right text-xs leading-relaxed text-pretty", !tone && "text-muted")}
                      style={tone ? { color: tone.factFg } : undefined}
                    >
                      {row.value}
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

function GroupGuide({ intro, groups, themed }: { intro: string; groups: GuideGroup[]; themed?: boolean }) {
  return (
    <>
      <p className="text-sm leading-relaxed text-pretty text-muted">{intro}</p>
      <div className="mt-5 flex flex-col gap-6">
        {groups.map((group) => (
          <GuideSection key={group.title} group={group} themed={themed} />
        ))}
      </div>
    </>
  );
}
