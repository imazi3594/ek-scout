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
  type UnitName,
} from "@/data/catalog";
import { CardHitRow } from "@/components/card-hit-row";
import { UnitIcon } from "@/components/unit-icon";
import { DECK_MAX_COST, deckSkillLabel, summarizeDeck } from "@/lib/deck";
import { useScout } from "@/lib/store";
import { cn } from "@/lib/utils";

export function DeckSim({
  onBack,
  onBrowse,
  onOpenCard,
}: {
  onBack: () => void;
  onBrowse: () => void;
  onOpenCard: (id: string) => void;
}) {
  const ids = useScout((s) => s.deck);
  const selectedId = useScout((s) => s.selectedId);
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
  const deckSkills = SKILLS.filter((skill) => (summary.skills.get(skill.id) ?? 0) > 0);
  const colors = COLORS.filter((color) => (summary.colors.get(color) ?? 0) > 0);
  const units = UNITS.filter((unit) => (summary.units.get(unit) ?? 0) > 0);

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
        <section className="deck-pane deck-pane-stats px-3 py-1.5" aria-label="卡組統計">
          <div className="flex h-8 min-w-0 items-center gap-x-3 overflow-x-auto text-xs whitespace-nowrap">
            <Metric
              label="成本"
              value={`${formatCost(summary.cost)}/${DECK_MAX_COST}`}
              hot={summary.remain <= 0 && summary.count > 0}
            />
            {summary.remain > 0 ? <Metric label="剩餘" value={formatCost(summary.remain)} /> : null}
            <Metric
              label="最大士氣"
              value={summary.morale == null ? "—" : String(summary.morale)}
            />
            {summary.morale == null ? <span className="text-faint">尚未組卡</span> : null}
          </div>
          {cards.length ? (
            <div className="flex flex-col">
              <DataLine label="勢力">
                {colors.length ? (
                  colors.map((color) => (
                    <span
                      key={color}
                      className={cn(
                        "inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-xs font-medium",
                        COLOR_CLASS[color],
                      )}
                    >
                      {color}
                      <span className="tabular-nums">{summary.colors.get(color)}</span>
                    </span>
                  ))
                ) : (
                  <EmptyMark />
                )}
              </DataLine>
              <DataLine label="時代">
                {periods.length ? (
                  periods.map((period) => (
                    <span key={period} className="text-xs text-fg">
                      {period} <span className="tabular-nums">{summary.periods.get(period)}</span>
                    </span>
                  ))
                ) : (
                  <EmptyMark />
                )}
              </DataLine>
              <DataLine label="兵種">
                {units.length ? (
                  units.map((unit) => (
                    <span key={unit} className="inline-flex items-center gap-1 text-xs text-fg">
                      <UnitIcon unit={unit} title={unit} className="size-4" />
                      {unitLabel(unit)}{" "}
                      <span className="tabular-nums">{summary.units.get(unit)}</span>
                    </span>
                  ))
                ) : (
                  <EmptyMark />
                )}
              </DataLine>
              <DataLine label="特技">
                {deckSkills.length ? (
                  deckSkills.map((skill) => (
                    <span
                      key={skill.id}
                      className="inline-flex h-5 items-center rounded-sm border border-black bg-cost px-1.5 text-xs font-medium text-black"
                    >
                      {deckSkillLabel(skill.name, summary.skills.get(skill.id) ?? 0)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted">無特技</span>
                )}
              </DataLine>
            </div>
          ) : (
            <p className="py-1 text-xs text-muted">到速查或最近，按列尾的「卡組」加入武將。</p>
          )}
        </section>

        <section className="deck-pane deck-pane-cards" aria-label="卡組">
          {cards.length ? (
            <ul className="px-2 py-2">
              {cards.map((card, index) => (
                <li key={card.id} className="flex items-center gap-2">
                  <span className="mb-1 w-6 shrink-0 text-center font-display text-2xl leading-none tabular-nums text-fg">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardHitRow
                      card={card}
                      active={card.id === selectedId}
                      onOpen={() => onOpenCard(card.id)}
                    />
                  </div>
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

function Metric({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-faint">{label}</span>
      <span
        className={cn("font-display text-sm tabular-nums", hot ? "text-faction-ko" : "text-fg")}
      >
        {value}
      </span>
    </span>
  );
}

function DataLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-8 min-w-0 items-center gap-2">
      <h3 className="w-8 shrink-0 text-xs text-faint">{label}</h3>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap">
        {children}
      </div>
    </div>
  );
}

function EmptyMark() {
  return <span className="text-xs text-muted">無</span>;
}

function unitLabel(unit: UnitName): string {
  if (unit === "鉄砲隊") return "鉄砲";
  return unit;
}
