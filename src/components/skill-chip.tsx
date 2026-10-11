import { SKILLS, skillById, skillCardFacts, type Card } from "@/data/catalog";
import { cn } from "@/lib/utils";

const TILE =
  "inline-flex items-center justify-center rounded-sm border border-black bg-cost font-medium text-black";

export function SkillChip({
  id,
  compact,
  short,
  count,
  active,
  onClick,
}: {
  id: number;
  compact?: boolean;
  short?: boolean;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const skill = SKILLS[id];
  if (!skill) return null;
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        TILE,
        short ? "size-5 px-0 text-[10px]" : compact ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-xs",
        onClick && "hover:brightness-110",
        active && "bg-black text-cost",
      )}
    >
      {short ? skill.short : skill.name}
      {!short && count != null && count > 1 ? <span className="ml-0.5 tabular-nums">×{count}</span> : null}
    </Comp>
  );
}

export function SkillList({ ids, compact, short }: { ids: number[]; compact?: boolean; short?: boolean }) {
  if (!ids.length) return <span className={cn("text-faint", compact || short ? "text-xs" : "text-sm")}>無特技</span>;
  const counts = new Map<number, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const entries = short
    ? ids.map((id, i) => [id, 1, i] as const)
    : [...counts.entries()].map(([id, n], i) => [id, n, i] as const);
  return (
    <div className={cn("flex flex-wrap", short ? "gap-0.5" : compact ? "gap-1" : "gap-1.5")}>
      {entries.map(([id, n, i]) => (
        <SkillChip key={`${id}-${i}`} id={id} compact={compact} short={short} count={n} />
      ))}
    </div>
  );
}

export function SkillExplain({ id, card, bodyOnly }: { id: number; card?: Card; bodyOnly?: boolean }) {
  const skill = skillById(id);
  const cardFacts = card ? skillCardFacts(card, id) : [];
  const tableFacts = card
    ? skill.facts.filter((row) => !cardFacts.some((c) => c.label === row.label))
    : skill.facts;
  return (
    <article className={bodyOnly ? "pt-3" : "rounded-lg bg-surface-2 p-3"}>
      {bodyOnly ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <SkillChip id={id} />
          {skill.durationC ? (
            <span className="ml-auto text-xs tabular-nums text-fg">{skill.durationC}</span>
          ) : null}
        </div>
      )}
      {bodyOnly && skill.durationC ? (
        <p className="mb-2 text-right text-xs tabular-nums text-fg">{skill.durationC}</p>
      ) : null}
      <p className={cn("text-sm leading-relaxed text-pretty text-fg", !bodyOnly && "mt-2")}>{skill.detail}</p>
      {cardFacts.length ? (
        <dl className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {cardFacts.map((row) => (
            <div key={`c-${row.label}`} className="flex items-start justify-between gap-3 rounded-md bg-surface-3 px-2.5 py-2">
              <dt className="flex h-6 shrink-0 items-center text-xs leading-none text-fg/60">{row.label}</dt>
              <dd className="text-right text-sm font-medium leading-6 tabular-nums text-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {tableFacts.length ? (
        <dl className={cn("grid grid-cols-1 gap-1.5 sm:grid-cols-2", cardFacts.length ? "mt-1.5" : "mt-3")}>
          {tableFacts.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 rounded-md bg-surface-3 px-2.5 py-2">
              <dt className="flex h-6 shrink-0 items-center text-xs leading-none text-fg/60">{row.label}</dt>
              <dd className="text-right text-sm font-medium leading-6 tabular-nums text-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="mt-2 text-sm leading-relaxed text-pretty text-muted">{skill.playTip}</p>
    </article>
  );
}
