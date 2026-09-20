import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { SKILLS } from "@/data/catalog";
import { RYUHA_GROUPS, RYUHA_INTRO, SENKI_GROUPS, SENKI_INTRO, type GuideGroup, type GuideTopic } from "@/data/guide";
import { SkillExplain } from "@/components/skill-chip";
import { cn } from "@/lib/utils";

const TOPICS: { id: GuideTopic; title: string; blurb: string }[] = [
  { id: "skills", title: "特技", blurb: "武將固有被動。開場、戰鬥、移動與槽類效果。" },
  { id: "senki", title: "戰器", blurb: "對戰中僅能使用一次的裝備技。主效果與追加條件。" },
  { id: "ryuha", title: "流派", blurb: "壱・弐・参の型。表為永久，裏多為時限。" },
];

export function GuidePage() {
  const [topic, setTopic] = useState<GuideTopic | null>(null);

  if (!topic) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <p className="text-sm leading-relaxed text-pretty text-muted">請選擇要查閱的資料。</p>
        <div className="mt-4 flex flex-col gap-2">
          {TOPICS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTopic(item.id)}
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
        onClick={() => setTopic(null)}
        className="mb-4 inline-flex h-8 items-center gap-1 rounded-md bg-surface-2 px-2.5 text-xs text-fg"
      >
        <ChevronLeft className="size-3.5" />
        返回資料
      </button>
      {topic === "skills" ? <SkillsGuide /> : null}
      {topic === "senki" ? <GroupGuide intro={SENKI_INTRO} groups={SENKI_GROUPS} /> : null}
      {topic === "ryuha" ? <GroupGuide intro={RYUHA_INTRO} groups={RYUHA_GROUPS} /> : null}
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

function GroupGuide({ intro, groups }: { intro: string; groups: GuideGroup[] }) {
  return (
    <>
      <p className="text-sm leading-relaxed text-pretty text-muted">{intro}</p>
      <div className="mt-5 flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.title}>
            <h3 className="font-display text-base text-fg">{group.title}</h3>
            {group.blurb ? <p className="mt-1 text-xs leading-relaxed text-pretty text-muted">{group.blurb}</p> : null}
            <div className="mt-3 flex flex-col gap-2">
              {group.items.map((item) => (
                <article key={item.name} className="rounded-lg bg-surface-2 p-3">
                  <p className="font-display text-sm text-fg">{item.name}</p>
                  {item.note ? <p className="mt-1 text-sm leading-relaxed text-pretty text-fg">{item.note}</p> : null}
                  {item.facts?.length ? (
                    <dl className={cn("grid grid-cols-1 gap-1.5 sm:grid-cols-2", item.note ? "mt-2" : "mt-3")}>
                      {item.facts.map((row) => (
                        <div key={row.label} className="flex items-baseline justify-between gap-3 rounded-md bg-bg/50 px-2.5 py-1.5">
                          <dt className="shrink-0 text-xs text-faint">{row.label}</dt>
                          <dd className="text-right text-xs leading-relaxed text-pretty text-muted">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
