import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import {
  CARD_BY_ID,
  COLOR_BAR,
  COLOR_CLASS,
  COLORS,
  PERIODS,
  SKILLS,
  UNITS,
  formatCost,
  type Card,
  type ColorName,
  type UnitName,
} from "@/data/catalog";
import { CostPips, RarityMark } from "@/components/card-identity";
import { SkillChip, SkillList } from "@/components/skill-chip";
import { UnitIcon } from "@/components/unit-icon";
import { DECK_MAX_CARDS, DECK_MAX_COST, summarizeDeck } from "@/lib/deck";
import { useScout } from "@/lib/store";
import { cn } from "@/lib/utils";

export function DeckSim({ onBack, onBrowse }: { onBack: () => void; onBrowse: () => void }) {
  const ids = useScout((s) => s.deck);
  const removeDeck = useScout((s) => s.removeDeck);
  const clearDeck = useScout((s) => s.clearDeck);
  const [askClear, setAskClear] = useState(false);
  const cards = useMemo(
    () => ids.map((id) => CARD_BY_ID[id]).filter((card): card is Card => Boolean(card)),
    [ids],
  );
  const summary = useMemo(() => summarizeDeck(cards), [cards]);
  const periods = useMemo(() => {
    const known = new Set<string>(PERIODS);
    const extra = [...summary.periods.keys()].filter((period) => !known.has(period));
    return [...PERIODS, ...extra].filter((period) => (summary.periods.get(period) ?? 0) > 0);
  }, [summary]);
  const factionLabel =
    summary.factions >= 4
      ? "4 個以上勢力"
      : summary.factions > 0
        ? `${summary.factions} 個勢力`
        : "";
  const deckSkills = SKILLS.filter((skill) => (summary.skills.get(skill.id) ?? 0) > 0);

  return (
    <div className="deck-layout relative bg-bg">
      <div className="flex h-1.5 shrink-0" aria-hidden>
        {COLORS.map((color) => (
          <span key={color} className={cn("h-full flex-1", COLOR_BAR[color])} />
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md bg-surface-2 px-2 text-xs text-fg"
        >
          <ChevronLeft className="size-3.5" />
          返回
        </button>
        <h2 className="min-w-0 flex-1 truncate font-display text-lg text-fg">卡組模擬器</h2>
        <button
          type="button"
          onClick={onBrowse}
          className="plain-press h-8 shrink-0 rounded-md bg-surface-2 px-2.5 text-xs text-fg"
        >
          速查
        </button>
        <button
          type="button"
          onClick={() => setAskClear(true)}
          disabled={!cards.length}
          className="plain-press h-8 shrink-0 rounded-md bg-faction-hi px-2.5 text-xs font-medium text-white disabled:opacity-40"
        >
          清空
        </button>
      </div>

      <div className="deck-body">
        <section className="deck-pane deck-pane-cards" aria-label="卡組">
          <div className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-3">
            <dl className="grid grid-cols-4 gap-1">
              <Stat
                label="張數"
                value={`${summary.count}/${DECK_MAX_CARDS}`}
                hot={summary.count >= DECK_MAX_CARDS}
              />
              <Stat
                label="成本"
                value={
                  <>
                    {formatCost(summary.cost)}
                    <span className="text-xs font-normal text-muted">/{DECK_MAX_COST}</span>
                  </>
                }
                hot={summary.remain <= 0 && summary.count > 0}
              />
              <Stat label="剩餘" value={formatCost(summary.remain)} />
              <Stat
                label="最大士氣"
                value={summary.morale == null ? "—" : String(summary.morale)}
              />
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-faint">
              勢力ボーナス：1 個 12、2 個 10、3 個 8、4 個以上 6。
              {summary.morale == null ? "尚未組卡。" : `現為${factionLabel}。`}
            </p>
            {summary.count > 0 ? (
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full" aria-hidden>
                {COLORS.map((color) => {
                  const count = summary.colors.get(color) ?? 0;
                  if (!count) return null;
                  return (
                    <span
                      key={color}
                      className={cn("h-full", COLOR_BAR[color])}
                      style={{ width: `${(count / summary.count) * 100}%` }}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>

          {cards.length ? (
            <ul className="px-2 py-2">
              {cards.map((card, index) => (
                <li
                  key={card.id}
                  className="mb-1 flex items-center gap-2 rounded-sm bg-white/[0.06] py-1.5 pr-1 pl-2"
                >
                  <span
                    className={cn("w-1 shrink-0 self-stretch rounded-full", COLOR_BAR[card.color])}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5 text-xs">
                      <span className="shrink-0 tabular-nums text-faint">{index + 1}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-sm px-1 py-px font-medium",
                          COLOR_CLASS[card.color],
                        )}
                      >
                        {card.no}
                      </span>
                      <UnitIcon unit={card.unit} title={card.unit} className="size-4 shrink-0" />
                      <RarityMark rarity={card.rarity} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-bold text-fg">{card.name}</span>
                      <CostPips cost={card.cost} small />
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-faint">
                      <span className="shrink-0 text-muted">{card.period}</span>
                      {card.skills.length ? (
                        <span className="ml-auto flex shrink-0">
                          <SkillList ids={card.skills} short />
                        </span>
                      ) : (
                        <span className="ml-auto text-faint">無特技</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDeck(card.id)}
                    className="plain-press h-11 shrink-0 rounded-md bg-surface-3 px-2.5 text-xs text-fg"
                    aria-label={`移出卡組 ${card.name}`}
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm leading-relaxed text-pretty text-muted">卡組是空的。</p>
              <button
                type="button"
                onClick={onBrowse}
                className="plain-press mt-3 inline-flex h-10 items-center rounded-md bg-surface-2 px-4 text-sm text-fg"
              >
                到速查加入
              </button>
            </div>
          )}
        </section>

        <section className="deck-pane px-4 py-4" aria-label="卡組統計">
          {cards.length ? (
            <div className="flex flex-col gap-5">
              <div>
                <DeckRule label="勢力" />
                <ul className="mt-2 grid grid-cols-4 gap-1.5">
                  {COLORS.map((color) => (
                    <ColorCount key={color} color={color} count={summary.colors.get(color) ?? 0} />
                  ))}
                </ul>
              </div>
              <div>
                <DeckRule label="時代" />
                <ul className="mt-2 flex flex-col gap-1">
                  {periods.map((period) => (
                    <li
                      key={period}
                      className="flex items-center justify-between rounded-md bg-surface-2 px-2.5 py-2"
                    >
                      <span className="text-sm text-fg">{period}</span>
                      <span className="font-display text-base tabular-nums text-fg">
                        {summary.periods.get(period)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <DeckRule label="兵種" />
                <ul className="mt-2 grid grid-cols-5 gap-1">
                  {UNITS.map((unit) => {
                    const count = summary.units.get(unit) ?? 0;
                    return (
                      <li
                        key={unit}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-md bg-surface-2 px-1 py-2",
                          count === 0 && "opacity-40",
                        )}
                      >
                        <UnitIcon unit={unit} title={unit} className="size-6" />
                        <span className="text-center text-[10px] leading-tight text-muted">
                          {unitLabel(unit)}
                        </span>
                        <span className="font-display text-base leading-none tabular-nums text-fg">
                          {count}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <DeckRule label="特技" />
                <div className="mt-2">
                  {deckSkills.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {deckSkills.map((skill) => (
                        <SkillChip
                          key={skill.id}
                          id={skill.id}
                          count={summary.skills.get(skill.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">無特技</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="px-2 py-6 text-center text-sm leading-relaxed text-pretty text-muted">
              到速查或最近，按列尾的「卡組」加入武將。這裡會列出勢力、時代、兵種與特技。
            </p>
          )}
        </section>
      </div>

      {askClear ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 px-6">
          <div className="w-full max-w-xs rounded-lg bg-surface-2 px-4 py-4 text-center">
            <p className="text-sm text-fg">確定清空卡組？</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setAskClear(false)}
                className="plain-press h-10 flex-1 rounded-md bg-surface-3 text-sm text-fg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  clearDeck();
                  setAskClear(false);
                }}
                className="plain-press h-10 flex-1 rounded-md bg-faction-hi text-sm font-medium text-white"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, hot }: { label: string; value: ReactNode; hot?: boolean }) {
  return (
    <div className="min-w-0 rounded-md bg-surface-2 px-1.5 py-2">
      <dt className="truncate text-[11px] text-faint">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate font-display text-lg leading-none tabular-nums",
          hot ? "text-faction-ko" : "text-fg",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function DeckRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="shrink-0 text-xs text-faint">{label}</h3>
      <span className="h-px min-w-4 flex-1 bg-border" aria-hidden />
    </div>
  );
}

function ColorCount({ color, count }: { color: ColorName; count: number }) {
  return (
    <li
      className={cn(
        "flex items-center justify-between rounded-md bg-surface-2 px-2 py-1.5",
        count === 0 && "opacity-40",
      )}
    >
      <span className={cn("rounded-sm px-1.5 py-px text-xs font-medium", COLOR_CLASS[color])}>
        {color}
      </span>
      <span className="font-display text-base tabular-nums text-fg">{count}</span>
    </li>
  );
}

function unitLabel(unit: UnitName): string {
  if (unit === "鉄砲隊") return "鉄砲";
  return unit;
}
