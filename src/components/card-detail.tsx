import { ExternalLink } from "lucide-react";
import {
  cardTanken,
  cardSpecial,
  displayArea,
  displayCats,
  displayEffects,
  displayMainStratDesc,
  formatStratDuration,
  formationMorale,
  kokouTiers,
  konshinTiers,
  officialUrl,
  recastTiers,
  schoolTiers,
  senkiTiers,
  shukuseiTiers,
  spinTiers,
  splitEffectValue,
  useCountTiers,
  type Card,
  type KokouTiers,
  type KonshinTier,
  type RecastCol,
  type SenkiCol,
  type SchoolCol,
  type ShukuseiTier,
  type SpecialBlock,
  type SpinTiers,
  type StatLine,
  type Tanken,
  type UseCountTier,
} from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { CardIdentity } from "@/components/card-identity";
import { cn } from "@/lib/utils";

function MoraleCost({ cost }: { cost: number | string }) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-xs text-faint">消耗士氣:</span>
      <span className="font-display text-2xl tabular-nums leading-none text-fg">{cost}</span>
    </span>
  );
}

export function StratTitle({ card }: { card: Card }) {
  const cats = displayCats(card);
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-xl leading-tight text-fg">{card.stratName}</span>
        <MoraleCost cost={card.stratCost} />
      </div>
      {cats.length ? <p className="mt-1 text-xs text-muted">{cats.join(" · ")}</p> : null}
    </div>
  );
}

export function CardDetail({ card }: { card: Card }) {
  const duration = formatStratDuration(card);
  const konshin = konshinTiers(card);
  const kokou = konshin ? null : kokouTiers(card);
  const shukusei = konshin || kokou ? null : shukuseiTiers(card);
  const useCount = konshin || kokou || shukusei ? null : useCountTiers(card);
  const senki = konshin || kokou || shukusei || useCount ? null : senkiTiers(card);
  const school = konshin || kokou || shukusei || useCount || senki ? null : schoolTiers(card);
  const recast = konshin || kokou || shukusei || useCount || senki || school ? null : recastTiers(card);
  const spin = konshin || kokou || shukusei || useCount || senki || school || recast ? null : spinTiers(card);
  const effects = konshin || kokou || shukusei || useCount || senki || school || recast || spin ? [] : displayEffects(card);
  const formation = formationMorale(card);
  const area = displayArea(card);
  const desc = displayMainStratDesc(card);
  const tankens = cardTanken(card);
  const special = school || recast ? null : cardSpecial(card);
  const meta = [duration.seconds, duration.dep, duration.extra].filter(Boolean);
  const hasData = Boolean(konshin || kokou || shukusei || useCount || senki || school || recast || spin || effects.length || formation || area || duration.label);

  return (
    <div className="flex flex-col gap-3 pb-8">
      <CardIdentity card={card} />

      <section className="rounded-lg border border-white/10 bg-black/35 p-4">
        <StratTitle card={card} />
        {desc ? <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-pretty text-fg">{desc}</p> : null}
      </section>

      {hasData ? (
        <section className="rounded-lg border border-white/10 bg-black/35 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="shrink-0 text-xs text-faint">時長</p>
            <p className="min-w-0 text-right font-display text-3xl tabular-nums leading-tight text-fg">
              {duration.label}
              {duration.cap ? (
                <span className="ml-1.5 align-baseline text-xs font-sans font-normal tracking-wide text-faint">上限</span>
              ) : null}
            </p>
          </div>
          {meta.length ? (
            <p className="mt-1.5 text-right text-xs leading-relaxed text-pretty tabular-nums text-muted">
              {meta.join(" · ")}
            </p>
          ) : null}

          {konshin ? (
            <KonshinGrid tiers={konshin} />
          ) : kokou ? (
            <KokouGrid data={kokou} />
          ) : shukusei ? (
            <ShukuseiGrid tiers={shukusei} />
          ) : useCount ? (
            <UseCountGrid tiers={useCount} />
          ) : senki ? (
            <SenkiGrid cols={senki} />
          ) : school ? (
            <SchoolGrid cols={school} />
          ) : recast ? (
            <RecastGrid cols={recast} />
          ) : spin ? (
            <SpinGrid data={spin} />
          ) : effects.length ? (
            <EffectList rows={effects} />
          ) : null}

          {formation ? <FormationMoraleBox normal={formation.normal} reduced={formation.reduced} /> : null}

          {area ? (
            <p className="mt-3 text-sm text-muted">
              <span className="text-xs text-faint">範圍　</span>
              {area}
            </p>
          ) : null}
        </section>
      ) : null}

      {special ? <SpecialBox block={special} /> : null}

      {tankens.map((tanken) => (
        <TankenBox key={tanken.name} tanken={tanken} />
      ))}

      <div className="flex gap-2">
        <Button variant="ghost" asChild>
          <a href={officialUrl(card)} target="_blank" rel="noreferrer">
            <ExternalLink />
            官方
          </a>
        </Button>
        {card.dbUrl ? (
          <Button variant="ghost" asChild>
            <a href={card.dbUrl} target="_blank" rel="noreferrer">
              <ExternalLink />
              數值
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function TankenBox({ tanken }: { tanken: Tanken }) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/35 p-4">
      <p className="text-xs text-faint">短計</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-xl leading-tight text-fg">{tanken.name}</span>
        {tanken.cost ? <MoraleCost cost={tanken.cost} /> : null}
      </div>
      {tanken.text ? <p className="mt-3 text-sm leading-relaxed text-pretty text-fg">{tanken.text}</p> : null}
      {tanken.rows.length ? <EffectList rows={tanken.rows} /> : null}
    </section>
  );
}

function SpecialBox({ block }: { block: SpecialBlock }) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/35 p-4">
      <p className="text-xs text-faint">特殊效果</p>
      <ul className="mt-3 space-y-1.5">
        {block.items.map((item) => (
          <li key={`${item.key ?? ""}-${item.text}`} className="rounded-md bg-surface-2 px-2.5 py-1.5">
            <p className="flex gap-2">
              <span className="text-faint">·</span>
              <span className="min-w-0 text-sm leading-relaxed text-pretty text-fg">
                {item.key ? (
                  <>
                    <span className="text-xs text-muted">{item.key}</span>
                    <span>　{item.text}</span>
                  </>
                ) : (
                  item.text
                )}
              </span>
            </p>
            {item.rows?.length ? (
              <div className="pl-4">
                <EffectList rows={item.rows} compact />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EffectList({ rows, compact }: { rows: StatLine[]; compact?: boolean }) {
  return (
    <dl className={cn(compact ? "mt-1.5" : "mt-4", "grid grid-cols-1 gap-1.5")}>
      {rows.map((row) => (
        <EffectRow key={`${row.label}-${row.value}`} row={row} />
      ))}
    </dl>
  );
}

function EffectRow({ row }: { row: StatLine }) {
  const { note, lines } = splitEffectValue(row.value);
  const listed = note || lines.length > 1;
  if (!listed) {
    return (
      <div className="flex items-baseline justify-between gap-3 rounded-md bg-surface-2 px-2.5 py-1.5">
        <dt className="shrink-0 text-xs text-faint">{row.label}</dt>
        <dd className="text-right text-sm leading-relaxed text-pretty tabular-nums text-fg">{row.value}</dd>
      </div>
    );
  }
  return (
    <div className="rounded-md bg-surface-2 px-2.5 py-1.5">
      <dt className="text-xs text-faint">{row.label}</dt>
      <dd className="mt-1">
        {note ? <p className="mb-0.5 text-xs leading-relaxed text-muted">{note}</p> : null}
        <ul className="space-y-0.5">
          {lines.map((line) => (
            <li key={line} className="text-sm leading-relaxed tabular-nums text-fg">
              <span className="text-faint">· </span>
              {line}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

function KonshinGrid({ tiers }: { tiers: KonshinTier[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">發動時所持士氣愈接近所需，效果愈強。</p>
      <div className="mt-2 flex flex-col gap-2">
        {tiers.map((tier) => (
          <section
            key={tier.id}
            className={cn(
              "rounded-md px-2.5 py-2",
              tier.id === "strong" ? "bg-faction-shi/25" : "bg-surface-2",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3
                className={cn(
                  "font-display text-sm leading-tight",
                  tier.id === "strong" ? "text-fg" : "text-muted",
                )}
              >
                {tier.title}
              </h3>
              <p className="text-xs tabular-nums text-faint">{tier.morale}</p>
            </div>
            <TierRows id={tier.id} rows={tier.rows} />
          </section>
        ))}
      </div>
    </div>
  );
}

function UseCountGrid({ tiers }: { tiers: UseCountTier[] }) {
  const moraleVaries = new Set(tiers.map((tier) => tier.morale).filter((m) => m != null)).size > 1;
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">
        {moraleVaries ? "使用次數愈多，效果愈強，所需士氣亦會上升。" : "使用次數愈多，效果愈強。"}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {tiers.map((tier) => (
          <section
            key={tier.id}
            className={cn("rounded-md px-2.5 py-2", tier.highlight ? "bg-faction-ao/25" : "bg-surface-2")}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className={cn("font-display text-sm leading-tight", tier.highlight ? "text-fg" : "text-muted")}>
                {tier.title}
              </h3>
              {tier.morale != null ? (
                <span className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-xs text-faint">消耗士氣</span>
                  <span className="font-display text-xl tabular-nums leading-none text-fg">{tier.morale}</span>
                </span>
              ) : null}
            </div>
            <TierRows id={tier.id} rows={tier.rows} />
          </section>
        ))}
      </div>
    </div>
  );
}

function FormationMoraleBox({ normal, reduced }: { normal: number; reduced: number }) {
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">受到友軍陣形效果時，所需士氣下降。</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <section className="rounded-md bg-surface-2 px-2.5 py-2">
          <h3 className="font-display text-sm leading-tight text-muted">平常</h3>
          <p className="mt-1 font-display text-2xl tabular-nums leading-none text-fg">{normal}</p>
        </section>
        <section className="rounded-md bg-faction-ao/25 px-2.5 py-2">
          <h3 className="font-display text-sm leading-tight text-fg">陣形中</h3>
          <p className="mt-1 font-display text-2xl tabular-nums leading-none text-fg">{reduced}</p>
        </section>
      </div>
    </div>
  );
}

function SpinGrid({ data }: { data: SpinTiers }) {
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">向左或向右旋轉後斬擊，效果不同。</p>
      {data.shared.length ? (
        <div className="mt-2 rounded-md bg-surface-2 px-2.5 py-2">
          <p className="text-xs text-faint">基本</p>
          <TierRows id="spin-shared" rows={data.shared} />
        </div>
      ) : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {data.cols.map((col) => (
          <section key={col.id} className="min-w-0 rounded-md bg-surface-2 px-2.5 py-2">
            <h3 className="font-display text-sm leading-tight text-fg">{col.title}</h3>
            <TierRows id={col.id} rows={col.rows} />
          </section>
        ))}
      </div>
    </div>
  );
}

function RecastGrid({ cols }: { cols: RecastCol[] }) {
  const retreat = cols.some((col) => col.title === "撤退中發動");
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">
        {retreat ? "撤退中亦可發動，效果有別於在場時。" : "計略效果中可再發動一次，條件與效果有別於初次。"}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {cols.map((col) => (
          <section
            key={col.id}
            className={cn("rounded-md px-2.5 py-2", col.highlight ? "bg-faction-gen/25" : "bg-surface-2")}
          >
            <h3 className={cn("font-display text-sm leading-tight", col.highlight ? "text-fg" : "text-muted")}>
              {col.title}
            </h3>
            {col.note ? <p className="mt-0.5 text-xs leading-relaxed text-pretty text-muted">{col.note}</p> : null}
            <TierRows id={col.id} rows={col.rows} />
          </section>
        ))}
      </div>
    </div>
  );
}

function SchoolGrid({ cols }: { cols: SchoolCol[] }) {
  const byRyuha = cols.some((col) => /^(部隊|士氣|城塞|琥煌)$/.test(col.title));
  const byTroop = cols.some((col) => /隊/.test(col.title) && !byRyuha);
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">
        {byRyuha ? "依所選流派，效果完全不同。" : byTroop ? "依對象部隊數，效果不同。" : "依對象兵種，效果不同。"}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {cols.map((col) => (
          <section key={col.id} className="rounded-md bg-surface-2 px-2.5 py-2">
            <h3 className="font-display text-sm leading-tight text-fg">{col.title}</h3>
            {col.note ? <p className="mt-0.5 text-xs leading-relaxed text-pretty text-muted">{col.note}</p> : null}
            <TierRows id={col.id} rows={col.rows} />
          </section>
        ))}
      </div>
    </div>
  );
}

function SenkiGrid({ cols }: { cols: SenkiCol[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">自軍尚未解放戰器時，與已解放時效果不同。</p>
      <div className="mt-2 flex flex-col gap-2">
        {cols.map((col) => (
          <section
            key={col.id}
            className={cn("rounded-md px-2.5 py-2", col.highlight ? "bg-faction-gen/25" : "bg-surface-2")}
          >
            <h3 className={cn("font-display text-sm leading-tight", col.highlight ? "text-fg" : "text-muted")}>
              {col.title}
            </h3>
            <TierRows id={col.id} rows={col.rows} />
          </section>
        ))}
      </div>
    </div>
  );
}

function ShukuseiGrid({ tiers }: { tiers: ShukuseiTier[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">進入宿星（槽 200%）時，效果同消耗士氣會改變。</p>
      <div className="mt-2 flex flex-col gap-2">
        {tiers.map((tier) => (
          <section
            key={tier.id}
            className={cn("rounded-md px-2.5 py-2", tier.id === "star" ? "bg-faction-ko/30" : "bg-surface-2")}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3
                className={cn(
                  "font-display text-sm leading-tight",
                  tier.id === "star" ? "text-fg" : "text-muted",
                )}
              >
                {tier.title}
              </h3>
              <span className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-xs text-faint">消耗士氣</span>
                <span className="font-display text-xl tabular-nums leading-none text-fg">{tier.morale}</span>
              </span>
            </div>
            <TierRows id={tier.id} rows={tier.rows} />
          </section>
        ))}
      </div>
    </div>
  );
}

function KokouGrid({ data }: { data: KokouTiers }) {
  const cols = [...data.cols].reverse();
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">{data.note}</p>
      {data.shared.length ? (
        <div className="mt-2 rounded-md bg-surface-2 px-2.5 py-2">
          <p className="text-xs text-faint">各劍共通</p>
          <TierRows id="shared" rows={data.shared} />
        </div>
      ) : null}
      {data.extra ? (
        <div className="mt-2 rounded-md bg-surface-2 px-2.5 py-2">
          <p className="text-xs text-faint">{data.extra.title}</p>
          <TierRows id="extra" rows={data.extra.rows} />
        </div>
      ) : null}

      <div className="mt-2 flex flex-col gap-2">
        {cols.map((col) => (
          <section
            key={col.id}
            className={cn("rounded-md px-2.5 py-2", col.highlight ? "bg-faction-ko/30" : "bg-surface-2")}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className={cn("min-h-4 font-display text-sm leading-tight", col.highlight ? "text-fg" : "text-muted")}>
                {col.swords == null ? (
                  col.title
                ) : col.swords <= 0 ? (
                  "不消耗"
                ) : (
                  <KokouSwords n={col.swords} />
                )}
              </h3>
            </div>
            <TierRows id={col.id} rows={col.rows} />
          </section>
        ))}
      </div>
    </div>
  );
}

function KokouSwords({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`${n}劍`}>
      {Array.from({ length: n }, (_, i) => (
        <KokouSwordMark key={i} />
      ))}
    </span>
  );
}

/** 🗡️-shaped pip：長劍身、琥色偏亮。 */
function KokouSwordMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-5 shrink-0 drop-shadow-[0_0_3px_#ffb340]" aria-hidden>
      <g transform="rotate(45 16 16)">
        <path d="M16 .4 18.15 7.8 18.45 20.6H13.55L13.85 7.8Z" fill="#ffc45c" />
        <path d="M16 1.6 16.7 20.6h-1.4Z" fill="#fff6d4" />
        <rect x="9.4" y="20.15" width="13.2" height="2.05" rx=".85" fill="#ffb340" />
        <rect x="14.2" y="22" width="3.6" height="5.6" rx=".95" fill="#f08c18" />
        <circle cx="16" cy="28.6" r="2.25" fill="#ffc45c" />
        <circle cx="16" cy="28.6" r="1" fill="#fff3c4" />
      </g>
    </svg>
  );
}

function TierRows({ id, rows }: { id: string; rows: StatLine[] }) {
  if (!rows.length) return <p className="mt-2 text-xs text-faint">—</p>;
  return (
    <dl className="mt-1.5 grid grid-cols-1 gap-1.5">
      {rows.map((row) => (
        <EffectRow key={`${id}-${row.label}-${row.value}`} row={row} />
      ))}
    </dl>
  );
}
