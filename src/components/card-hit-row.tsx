import {
  COLOR_BAR,
  COLOR_CLASS,
  formatStratDuration,
  type Card,
} from "@/data/catalog";
import { CostPips, RarityMark } from "@/components/card-identity";
import { SkillList } from "@/components/skill-chip";
import { UnitIcon } from "@/components/unit-icon";
import { useScout } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CardHitRow({
  card,
  active,
  onOpen,
}: {
  card: Card;
  active: boolean;
  onOpen: () => void;
}) {
  const dur = formatStratDuration(card);
  const inDeck = useScout((s) => s.deck.includes(card.id));
  const toggleDeck = useScout((s) => s.toggleDeck);
  return (
    <div
      className={cn(
        "list-row mb-1 flex w-full items-stretch gap-1 rounded-sm bg-white/[0.06] py-1 pr-1 pl-2",
        active ? "bg-white/[0.14]" : "hover:bg-white/[0.09]",
      )}
    >
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left">
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
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-faint">
            <span className="shrink-0 text-muted">{card.period}</span>
            <span className="min-w-[2.5rem] flex-1 truncate text-fg">{card.stratName}</span>
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
      <button
        type="button"
        data-no-swipe=""
        aria-pressed={inDeck}
        aria-label={inDeck ? `移出卡組 ${card.name}` : `加入卡組 ${card.name}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleDeck(card.id);
        }}
        className={cn(
          "my-0.5 flex w-11 shrink-0 items-center justify-center rounded-md text-xs font-semibold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          inDeck ? "bg-cost text-black" : "bg-white/10 text-fg",
        )}
      >
        {inDeck ? "已入" : "卡組"}
      </button>
    </div>
  );
}
