import { createContext, useContext, useRef, useState } from "react";
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
  deckCostView,
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
  type DeckCostView,
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
import charts from "@/data/damage-charts.json";

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
  const deck = school ? null : deckCostView(card);
  const recast = konshin || kokou || shukusei || useCount || senki || school || deck ? null : recastTiers(card);
  const spin = konshin || kokou || shukusei || useCount || senki || school || deck || recast ? null : spinTiers(card);
  const effects = konshin || kokou || shukusei || useCount || senki || school || deck || recast || spin ? [] : displayEffects(card);
  const intelChart = DAMAGE_CHARTS[card.no];
  const splitKonshin = Boolean(
    konshin && intelChart?.rows.some((row) => row.label.startsWith("強") || row.label.startsWith("弱")),
  );
  const oshiGauge = parseOshiGauge(card);
  const hurtPower = isHurtPowerCard(card);
  const shownEffects = effects.filter((row) => {
    if (intelChart && isDamagePlaceholder(row)) return false;
    if (oshiGauge && /黃熾槽/.test(row.value)) return false;
    if (hurtPower && row.label === "武力" && /%/.test(row.value)) return false;
    return true;
  });
  const formation = formationMorale(card);
  const area = displayArea(card);
  const desc = displayMainStratDesc(card);
  const tankens = cardTanken(card);
  const special = deck || school || recast ? null : cardSpecial(card);
  const meta = [duration.seconds, duration.dep, duration.extra].filter(Boolean);
  const hasData = Boolean(konshin || kokou || shukusei || useCount || senki || school || deck || recast || spin || effects.length || formation || area || duration.label);

  return (
    <DamageChartContext.Provider value={intelChart ?? null}>
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
            <KonshinGrid tiers={konshin} href={card.dbUrl} />
          ) : kokou ? (
            <KokouGrid data={kokou} href={card.dbUrl} />
          ) : shukusei ? (
            <ShukuseiGrid tiers={shukusei} href={card.dbUrl} />
          ) : useCount ? (
            <UseCountGrid tiers={useCount} href={card.dbUrl} />
          ) : senki ? (
            <SenkiGrid cols={senki} href={card.dbUrl} />
          ) : school ? (
            <SchoolGrid
              cols={school}
              href={card.dbUrl}
              intro={
                /敵の兵種/.test(card.stratDesc ?? "")
                  ? "依場上武力最高的敵軍兵種，只獲得其中一種效果。"
                  : undefined
              }
            />
          ) : deck ? (
            <DeckCostPanel view={deck} />
          ) : recast ? (
            <RecastGrid cols={recast} href={card.dbUrl} />
          ) : spin ? (
            <SpinGrid data={spin} href={card.dbUrl} />
          ) : shownEffects.length ? (
            <EffectList rows={shownEffects} href={card.dbUrl} />
          ) : null}
          {oshiGauge ? <OshiGauge tracks={oshiGauge} /> : null}
          {hurtPower ? <GinchiyoCalc /> : null}
          {intelChart && !hurtPower && !tankens.some(tankenOwnsChart) && !splitKonshin ? (
            <IntelDamageTable chart={intelChart} />
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

      {special ? <SpecialBox block={special} href={card.dbUrl} /> : null}

      {tankens.map((tanken) => (
        <TankenBox
          key={tanken.name}
          tanken={tanken}
          href={card.dbUrl}
          chart={intelChart && tankenOwnsChart(tanken) ? intelChart : null}
        />
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
    </DamageChartContext.Provider>
  );
}

function tankenOwnsChart(tanken: Tanken) {
  return tanken.rows.some((row) => /^(知力傷害|武力傷害|伏兵)/.test(row.label) && /外部|表/.test(row.value));
}

function TankenBox({ tanken, href, chart }: { tanken: Tanken; href?: string; chart?: DamageChart | null }) {
  const rows = chart ? tanken.rows.filter((row) => !isDamagePlaceholder(row)) : tanken.rows;
  return (
    <section className="rounded-lg border border-white/10 bg-black/35 p-4">
      <p className="text-xs text-faint">短計</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-xl leading-tight text-fg">{tanken.name}</span>
        {tanken.cost ? <MoraleCost cost={tanken.cost} /> : null}
      </div>
      {tanken.text ? <p className="mt-3 text-sm leading-relaxed text-pretty text-fg">{tanken.text}</p> : null}
      {rows.length ? <EffectList rows={rows} href={href} /> : null}
      {chart ? <IntelDamageTable chart={chart} /> : null}
    </section>
  );
}

function SpecialBox({ block, href }: { block: SpecialBlock; href?: string }) {
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
                    {item.text ? <span>　{item.text}</span> : null}
                  </>
                ) : (
                  item.text
                )}
              </span>
            </p>
            {item.rows?.length ? (
              <div className="pl-4">
                <EffectList rows={item.rows} compact href={href} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

type DamageRow = { label: string; coef: number; fixed: number; melee?: boolean };
type DamageChart = { stat: "知力" | "武力"; base: number; rows: DamageRow[] };

const DAMAGE_CHARTS = charts as Record<string, DamageChart>;
const DamageChartContext = createContext<DamageChart | null>(null);

function chartForKonshin(chart: DamageChart, id: "strong" | "weak" | "none") {
  if (id === "none") return null;
  const mark = id === "strong" ? "強" : "弱";
  const rows = chart.rows
    .filter((row) => row.label.startsWith(mark))
    .map((row) => {
      const label = row.label.replace(/^[強弱]\s*/, "");
      return { ...row, label: label || "傷害" };
    });
  return rows.length ? { ...chart, rows } : null;
}

function isDamagePlaceholder(row: StatLine) {
  if (/^(知力傷害|武力傷害|固定傷害|傷害係數)/.test(row.label)) return true;
  if (/伏兵/.test(row.label) && /外部|表/.test(row.value)) return true;
  return false;
}

function intelDamage(self: number, enemy: number, row: DamageRow) {
  let n = (self / enemy) * row.coef + row.fixed;
  if (row.melee) n += Math.max(5.2 + (self - enemy) * 0.8, 1);
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const DAMAGE_SELF_MAX = 99;

function StatStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex h-9 items-center overflow-hidden rounded-md bg-surface-2">
      <button
        type="button"
        className="plain-press h-full w-9 text-base text-fg disabled:opacity-30"
        aria-label={`${label}減少`}
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        −
      </button>
      <input
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          onChange(digits === "" ? 1 : Math.min(DAMAGE_SELF_MAX, Math.max(1, Number(digits))));
        }}
        className="w-10 bg-transparent text-center text-sm tabular-nums text-fg outline-none"
      />
      <button
        type="button"
        className="plain-press h-full w-9 text-base text-fg disabled:opacity-30"
        aria-label={`${label}增加`}
        disabled={value >= DAMAGE_SELF_MAX}
        onClick={() => onChange(Math.min(DAMAGE_SELF_MAX, value + 1))}
      >
        ＋
      </button>
    </div>
  );
}

function IntelDamageTable({ chart }: { chart: DamageChart }) {
  const [self, setSelf] = useState(Math.min(DAMAGE_SELF_MAX, Math.max(1, chart.base)));
  const enemies = Array.from({ length: 15 }, (_, index) => index + 1);
  const stat = chart.stat === "武力" ? "武力" : "知力";
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">自{stat}</p>
        <StatStepper label={`自${stat}`} value={self} onChange={setSelf} />
      </div>
      <p className="mt-1.5 text-[11px] text-faint">
        {chart.rows.length === 1 ? `固定 ${chart.rows[0].fixed}　係數 ${chart.rows[0].coef}　` : ""}
        可左右滑動
      </p>
      <div className="mt-2 overflow-x-auto overscroll-x-contain">
        <table className="w-max border-separate border-spacing-0 text-center text-sm tabular-nums">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-bg px-2 py-1.5 text-left font-normal text-faint">敵{stat}</th>
              {enemies.map((enemy) => (
                <th key={enemy} className="min-w-11 px-2 py-1.5 font-normal text-muted">
                  {enemy}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row) => (
              <tr key={row.label}>
                <th className="sticky left-0 z-10 whitespace-nowrap bg-bg px-2 py-1.5 text-left font-normal text-faint">{row.label}</th>
                {enemies.map((enemy) => {
                  const value = intelDamage(self, enemy, row);
                  const kill = Number(value) >= 100;
                  return (
                    <td
                      key={enemy}
                      className={cn("min-w-11 px-2 py-1.5", kill ? "bg-[#e07a2f]/30 text-[#f0c9a0]" : "text-fg")}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type GaugePoint = { at: number; n: number; suffix: string; plus: boolean };
type GaugeTrack = { label: string; points: GaugePoint[] };

function isHurtPowerCard(card: Card) {
  return (card.effects ?? []).some((effect) => effect.label === "武力上昇" && /被ダメージに応じて/.test(effect.value));
}

const INTEL_POWER_BANDS: { min: number; max: number; power: number }[] = [
  { min: 24, max: 26, power: 6 },
  { min: 27, max: 33, power: 7 },
  { min: 34, max: 38, power: 8 },
  { min: 40, max: 44, power: 9 },
  { min: 48, max: 48, power: 10 },
  { min: 60, max: 60, power: 12 },
  { min: 76, max: 76, power: 14 },
];

function ginchiyoPower(damage: number): { power: number; estimated: boolean } {
  const n = Math.floor(damage + 1e-9);
  const hit = INTEL_POWER_BANDS.find((band) => n >= band.min && n <= band.max);
  if (hit) return { power: hit.power, estimated: false };
  const lower = [...INTEL_POWER_BANDS].reverse().find((band) => band.max < n);
  const upper = INTEL_POWER_BANDS.find((band) => band.min > n);
  if (lower && upper) {
    const power = lower.power + ((upper.power - lower.power) * (n - lower.max)) / (upper.min - lower.max);
    return { power: Math.floor(power + 1e-9), estimated: true };
  }
  if (lower) {
    const prev = INTEL_POWER_BANDS[INTEL_POWER_BANDS.indexOf(lower) - 1];
    const slope = prev ? (lower.power - prev.power) / (lower.min - prev.max) : 0;
    return { power: Math.max(0, Math.floor(lower.power + (n - lower.max) * slope + 1e-9)), estimated: true };
  }
  const first = INTEL_POWER_BANDS[0];
  const second = INTEL_POWER_BANDS[1];
  const slope = (second.power - first.power) / (second.min - first.min);
  return { power: Math.max(0, Math.floor(first.power + (n - first.min) * slope + 1e-9)), estimated: true };
}

function GinchiyoCalc() {
  const [self, setSelf] = useState(5);
  const enemies = Array.from({ length: 12 }, (_, index) => index + 1);
  const cells = enemies.map((enemy) => {
    const damage = (self / enemy) * 8 + 20;
    const shown = Math.round(damage * 10) / 10;
    return {
      enemy,
      damage: Number.isInteger(shown) ? String(shown) : shown.toFixed(1),
      power: ginchiyoPower(damage),
    };
  });
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">自知力</p>
        <StatStepper label="自知力" value={self} onChange={setSelf} />
      </div>
      <p className="mt-1.5 text-[11px] text-faint">傷害＝（自知力÷對象知力）×8＋20。推算數據以「?」標示。可左右滑動</p>
      <div className="mt-2 overflow-x-auto overscroll-x-contain">
        <table className="w-max border-separate border-spacing-0 text-center text-sm tabular-nums">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-bg px-2 py-1.5 text-left font-normal text-faint">對象知力</th>
              {cells.map((cell) => (
                <th key={cell.enemy} className="min-w-11 px-2 py-1.5 font-normal text-muted">
                  {cell.enemy}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="sticky left-0 z-10 whitespace-nowrap bg-bg px-2 py-1.5 text-left font-normal text-faint">傷害</th>
              {cells.map((cell) => (
                <td key={cell.enemy} className="min-w-11 px-2 py-1.5 text-fg">
                  {cell.damage}
                </td>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-10 whitespace-nowrap bg-bg px-2 py-1.5 text-left font-normal text-faint">武力</th>
              {cells.map((cell) => (
                <td
                  key={cell.enemy}
                  className={cn(
                    "min-w-11 whitespace-nowrap px-2 py-1.5",
                    cell.power.estimated ? "text-[#e0b15a]" : "text-fg",
                  )}
                >
                  {cell.power.estimated ? `+${cell.power.power}?` : `+${cell.power.power}`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function parseOshiGauge(card: Card): GaugeTrack[] | null {
  const labels: Record<string, string> = {
    武力上昇: "武力",
    速度上昇: "移速",
    槍撃ダメージ: "槍擊",
    射撃ダメージ: "射擊",
    走射ダメージ: "走射",
    突撃ダメージ: "突擊",
    斬撃ダメージ: "斬擊",
    兵力回復: "兵力",
  };
  const tracks: GaugeTrack[] = [];
  for (const effect of card.effects ?? []) {
    if (!/黄熾ゲージ/.test(effect.value)) continue;
    const label = labels[effect.label] ?? effect.label;
    const re = /黄熾ゲージが?(?:約)?(\d+(?:\.\d+)?)%?(?:[~～〜](?:約)?(\d+(?:\.\d+)?)%?)?\s*[:：]\s*/g;
    const marks = [...effect.value.matchAll(re)];
    const points: GaugePoint[] = [];
    marks.forEach((mark, index) => {
      const start = (mark.index ?? 0) + mark[0].length;
      const end = index + 1 < marks.length ? (marks[index + 1].index ?? effect.value.length) : effect.value.length;
      const raw = effect.value.slice(start, end).replace(/[▲▼]/g, "").trim();
      const num = raw.match(/[+-]?\d+(?:\.\d+)?/);
      if (!num) return;
      const n = Number(num[0]);
      const point = { at: Number(mark[1]), n, suffix: raw.includes("%") ? "%" : "", plus: n > 0 && !raw.startsWith("-") };
      points.push(point);
      if (mark[2]) points.push({ ...point, at: Number(mark[2]) });
    });
    points.sort((a, b) => a.at - b.at);
    if (points.length >= 2) tracks.push({ label, points });
  }
  return tracks.length ? tracks : null;
}

function gaugeText(track: GaugeTrack, pct: number) {
  const points = track.points;
  const last = points[points.length - 1];
  if (pct <= points[0].at) return formatGauge(points[0], false);
  if (pct >= last.at) return formatGauge(last, false);
  const next = points.findIndex((point) => point.at >= pct);
  const b = points[next];
  const a = points[next - 1];
  if (Math.abs(pct - a.at) < 0.01) return formatGauge(a, false);
  if (Math.abs(pct - b.at) < 0.01) return formatGauge(b, false);
  if (a.n === b.n) return formatGauge(a, false);
  const raw = a.n + ((b.n - a.n) * (pct - a.at)) / (b.at - a.at);
  const n = track.label === "武力" ? Math.floor(raw + 1e-9) : Math.round(raw * 10) / 10;
  return formatGauge({ ...a, n }, true);
}

function formatGauge(point: GaugePoint, approx: boolean) {
  const n = Number.isInteger(point.n) ? String(point.n) : point.n.toFixed(1);
  const body = `${point.plus && point.n > 0 ? "+" : ""}${n}${point.suffix}`;
  return approx ? `約${body}` : body;
}

function OshiGauge({ tracks }: { tracks: GaugeTrack[] }) {
  const [pct, setPct] = useState(80);
  const bar = useRef<HTMLDivElement>(null);
  const lit = pct >= 100 / 3;
  const seek = (clientX: number) => {
    const el = bar.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setPct(Math.round(ratio * 100));
  };
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted">黃熾槽(可左右滑動)</p>
        <p className={cn("font-display text-2xl tabular-nums leading-none", lit ? "text-[#f0d48a]" : "text-[#9a958e]")}>
          {pct}%
        </p>
      </div>
      <div
        ref={bar}
        role="slider"
        aria-label="黃熾槽"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        tabIndex={0}
        className="relative mt-2 h-12 touch-none cursor-pointer"
        data-no-swipe=""
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          seek(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          seek(event.clientX);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowUp") setPct((current) => Math.min(100, current + 1));
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") setPct((current) => Math.max(0, current - 1));
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 overflow-hidden rounded-[3px] border border-[#3a342c] bg-[#1a1816] shadow-[inset_0_3px_6px_rgba(0,0,0,0.65)]">
          <div
            className={cn(
              "h-full shadow-[inset_0_2px_0_rgba(255,255,255,0.28)]",
              lit ? "bg-gradient-to-b from-[#ffe7a3] to-[#d3922a]" : "bg-gradient-to-b from-[#8d8882] to-[#5c5853]",
            )}
            style={{ width: `${pct}%` }}
          />
          <div className="pointer-events-none absolute inset-y-0 left-1/3 w-0.5 bg-black/70" />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 z-10 -translate-x-1/2"
          style={{ left: `${pct}%` }}
        >
          <div
            className={cn("absolute left-1/2 top-0 -translate-x-1/2", lit ? "text-[#ffe7a3]" : "text-[#d5d0c8]")}
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "8px solid currentColor",
            }}
          />
          <div
            className={cn(
              "absolute bottom-0 left-1/2 top-2 w-0.5 -translate-x-1/2",
              lit ? "bg-[#ffe7a3]" : "bg-[#d5d0c8]",
            )}
          />
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-1.5">
        {tracks.map((track) => (
          <div key={track.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-muted">{track.label}</dt>
            <dd className="text-sm tabular-nums text-fg">{gaugeText(track, pct)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-faint">樣本之間按直線推算，僅供參考</p>
    </div>
  );
}

function EffectList({ rows, compact, href }: { rows: StatLine[]; compact?: boolean; href?: string }) {
  const chart = useContext(DamageChartContext);
  const shown = chart ? rows.filter((row) => !isDamagePlaceholder(row)) : rows;
  if (!shown.length) return null;
  return (
    <dl className={cn(compact ? "mt-1.5" : "mt-4", "grid grid-cols-1 gap-1.5")}>
      {shown.map((row) => (
        <EffectRow key={`${row.label}-${row.value}`} row={row} href={href} />
      ))}
    </dl>
  );
}

const EXT_REF = /(詳情請參閱外部網站|參閱外部網站)/g;

function ValueText({ text, href }: { text: string; href?: string }) {
  if (!href || !text.includes("參閱外部網站")) return <>{text}</>;
  const parts = text.split(EXT_REF);
  return (
    <>
      {parts.map((part, i) =>
        part === "參閱外部網站" || part === "詳情請參閱外部網站" ? (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline decoration-white/35 underline-offset-2"
          >
            {part}
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function EffectRow({ row, href }: { row: StatLine; href?: string }) {
  const { note, lines } = splitEffectValue(row.value);
  const listed = note || lines.length > 1;
  if (!listed) {
    return (
      <div className="flex items-baseline justify-between gap-3 rounded-md bg-surface-2 px-2.5 py-1.5">
        <dt className="shrink-0 text-xs text-faint">{row.label}</dt>
        <dd className="text-right text-sm leading-relaxed text-pretty tabular-nums text-fg">
          <ValueText text={row.value} href={href} />
        </dd>
      </div>
    );
  }
  return (
    <div className="rounded-md bg-surface-2 px-2.5 py-1.5">
      <dt className="text-xs text-faint">{row.label}</dt>
      <dd className="mt-1">
        {note ? (
          <p className="mb-0.5 text-xs leading-relaxed text-muted">
            <ValueText text={note} href={href} />
          </p>
        ) : null}
        <ul className="space-y-0.5">
          {lines.map((line) => (
            <li key={line} className="text-sm leading-relaxed tabular-nums text-fg">
              <span className="text-faint">· </span>
              <ValueText text={line} href={href} />
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

function KonshinGrid({ tiers, href }: { tiers: KonshinTier[]; href?: string }) {
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
            <TierRows id={tier.id} rows={tier.rows} href={href} />
            {tier.id === "strong" || tier.id === "weak" ? <KonshinDamage tier={tier.id} /> : null}
          </section>
        ))}
      </div>
    </div>
  );
}

function UseCountGrid({ tiers, href }: { tiers: UseCountTier[]; href?: string }) {
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
            <TierRows id={tier.id} rows={tier.rows} href={href} />
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

function SpinGrid({ data, href }: { data: SpinTiers; href?: string }) {
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">向左或向右旋轉後斬擊，效果不同。</p>
      {data.shared.length ? (
        <div className="mt-2 rounded-md bg-surface-2 px-2.5 py-2">
          <p className="text-xs text-faint">基本</p>
          <TierRows id="spin-shared" rows={data.shared} href={href} />
        </div>
      ) : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {data.cols.map((col) => (
          <section key={col.id} className="min-w-0 rounded-md bg-surface-2 px-2.5 py-2">
            <h3 className="font-display text-sm leading-tight text-fg">{col.title}</h3>
            <TierRows id={col.id} rows={col.rows} href={href} />
          </section>
        ))}
      </div>
    </div>
  );
}

function RecastGrid({ cols, href }: { cols: RecastCol[]; href?: string }) {
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
            <TierRows id={col.id} rows={col.rows} href={href} />
          </section>
        ))}
      </div>
    </div>
  );
}

function rowsWithoutNoteEcho(note: string, rows: StatLine[]): StatLine[] {
  const key = note.replace(/\s+/g, "");
  if (!key) return rows;
  return rows.filter((row) => row.value.replace(/\s+/g, "") !== key);
}

function leadingSharedRows(cols: SchoolCol[]): StatLine[] {
  if (cols.length < 2) return [];
  const first = cols[0].rows;
  let n = 0;
  while (n < first.length && cols.every((col) => col.rows.length > n + 1)) {
    const row = first[n];
    if (!cols.every((col) => col.rows[n]?.label === row.label && col.rows[n]?.value === row.value)) break;
    n += 1;
  }
  return first.slice(0, n);
}

function ladderBonus(bands: { min: number; max: number | null; bonus: string }[], cost: number) {
  const hit = [...bands]
    .reverse()
    .find((band) => cost + 1e-6 >= band.min && (band.max == null || cost <= band.max + 1e-6));
  return hit?.bonus ?? "未達";
}

function shiftCosts(
  fields: { id: string; min: number }[],
  costs: Record<string, number>,
  id: string,
  dir: number,
) {
  const round = (n: number) => Math.round(n * 2) / 2;
  const legal = (n: number) => {
    if (n < -1e-6 || n > 9 + 1e-6) return false;
    const snapped = round(n);
    if (Math.abs(snapped - n) > 1e-6) return false;
    return snapped === 0 || snapped >= 1;
  };
  const ids = fields.map((field) => field.id);
  const index = ids.indexOf(id);
  if (index < 0) return costs;
  const minOf = (fid: string) => fields.find((field) => field.id === fid)?.min ?? 0;
  const allowed = (fid: string, n: number) => legal(n) && n + 1e-6 >= minOf(fid);
  const others = [...ids.slice(index + 1), ...ids.slice(0, index)];
  const self = costs[id] ?? 3;
  for (const delta of dir > 0 ? [0.5, 1] : [-0.5, -1]) {
    const nextSelf = round(self + delta);
    if (!allowed(id, nextSelf)) continue;
    for (const oid of others) {
      const nextOther = round((costs[oid] ?? 0) - delta);
      if (!allowed(oid, nextOther)) continue;
      return { ...costs, [id]: nextSelf, [oid]: nextOther };
    }
  }
  return costs;
}

function CostLadderBox({ cols }: { cols: SchoolCol[] }) {
  const [costs, setCosts] = useState<Record<string, number>>(() =>
    Object.fromEntries(cols.filter((col) => col.ladder?.length).map((col) => [col.id, 3])),
  );
  const valueOf = (pattern: RegExp) => cols.flatMap((col) => col.rows).find((row) => pattern.test(row.label))?.value;
  const basics = [
    ["武力", valueOf(/武力/) ?? "+5"],
    ["移速", valueOf(/移速|速度/) ?? "+30%"],
  ];
  const fields = cols
    .filter((col) => col.ladder?.length)
    .map((col) => {
      const cavalry = /騎/.test(col.title);
      const spear = /槍|劍|剣/.test(col.title);
      return {
        id: col.id,
        label: cavalry ? "騎兵" : spear ? "槍兵・劍豪" : "弓兵・鐵砲隊",
        kind: cavalry ? "流派槽" : spear ? "兵力回復" : "攻城力",
        min: cavalry ? 3 : 0,
        ladder: col.ladder ?? [],
      };
    });
  return (
    <div className="mt-3 flex flex-col gap-3">
      <dl className="grid grid-cols-1 gap-1.5">
        {basics.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-sm tabular-nums text-fg">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <p className="text-xs leading-relaxed text-pretty text-muted">依對象友軍各兵種成本合計，獲得以下效果</p>
        {fields.map((field) => {
          const cost = costs[field.id] ?? 3;
          const shown = Number.isInteger(cost) ? String(cost) : cost.toFixed(1);
          const bonus = ladderBonus(field.ladder, cost);
          const canDown = shiftCosts(fields, costs, field.id, -1) !== costs;
          const canUp = shiftCosts(fields, costs, field.id, 1) !== costs;
          return (
            <div key={field.id} className="flex items-center gap-2">
              <span className="w-[5.5rem] shrink-0 text-xs leading-tight text-muted">{field.label}</span>
              <div className="inline-flex h-9 items-center overflow-hidden rounded-md bg-surface-2">
                <button
                  type="button"
                  className="plain-press h-full w-9 text-base text-fg disabled:opacity-30"
                  aria-label={`${field.label}減少`}
                  disabled={!canDown}
                  onClick={() => setCosts((current) => shiftCosts(fields, current, field.id, -1))}
                >
                  −
                </button>
                <span className="w-10 text-center text-sm tabular-nums text-fg">{shown}</span>
                <button
                  type="button"
                  className="plain-press h-full w-9 text-base text-fg disabled:opacity-30"
                  aria-label={`${field.label}增加`}
                  disabled={!canUp}
                  onClick={() => setCosts((current) => shiftCosts(fields, current, field.id, 1))}
                >
                  ＋
                </button>
              </div>
              <span className="min-w-0 flex-1 text-right text-xs tabular-nums text-fg">
                {bonus === "未達" ? bonus : `${field.kind} ${bonus}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function deckBonus(bands: { min: number; max: number | null; bonus: string }[], cost: number) {
  const hit = bands.filter((band) => cost + 1e-6 >= band.min).sort((a, b) => b.min - a.min)[0];
  return hit?.bonus ?? "未達";
}

function openingCosts(fields: { id: string; min: number }[]) {
  if (fields.length <= 1) return Object.fromEntries(fields.map((field) => [field.id, field.min]));
  const even = Math.round((9 / fields.length) * 2) / 2;
  const next: Record<string, number> = {};
  let used = 0;
  fields.forEach((field, index) => {
    if (index === fields.length - 1) {
      next[field.id] = Math.round((9 - used) * 2) / 2;
      return;
    }
    const value = Math.max(field.min, even);
    next[field.id] = value;
    used += value;
  });
  return next;
}

function stepAlone(cost: number, dir: number, min: number) {
  const round = (n: number) => Math.round(n * 2) / 2;
  for (const delta of dir > 0 ? [0.5, 1] : [-0.5, -1]) {
    const next = round(cost + delta);
    if (next < min - 1e-6 || next > 9 + 1e-6) continue;
    if (Math.abs(next - 0.5) < 1e-6) continue;
    if (next !== 0 && next < 1) continue;
    return next;
  }
  return cost;
}

function DeckCostPanel({ view }: { view: DeckCostView }) {
  const [costs, setCosts] = useState<Record<string, number>>(() => openingCosts(view.fields));
  const alone = view.fields.length < 2;
  return (
    <div className="mt-3 flex flex-col gap-3">
      {view.basics.length ? (
        <dl className="grid grid-cols-1 gap-1.5">
          {view.basics.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-muted">{row.label}</dt>
              <dd className="text-right text-sm tabular-nums text-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="flex flex-col gap-2">
        <p className="text-xs leading-relaxed text-pretty text-muted">{view.intro}</p>
        {view.fields.map((field) => {
          const cost = costs[field.id] ?? field.min;
          const shown = Number.isInteger(cost) ? String(cost) : cost.toFixed(1);
          const bonus = deckBonus(field.ladder, cost);
          const canDown = alone
            ? stepAlone(cost, -1, field.min) !== cost
            : shiftCosts(view.fields, costs, field.id, -1) !== costs;
          const canUp = alone
            ? stepAlone(cost, 1, field.min) !== cost
            : shiftCosts(view.fields, costs, field.id, 1) !== costs;
          return (
            <div key={field.id} className="flex items-center gap-2">
              <span className="w-[5.5rem] shrink-0 text-xs leading-tight text-muted">{field.label}</span>
              <div className="inline-flex h-9 items-center overflow-hidden rounded-md bg-surface-2">
                <button
                  type="button"
                  className="plain-press h-full w-9 text-base text-fg disabled:opacity-30"
                  aria-label={`${field.label}減少`}
                  disabled={!canDown}
                  onClick={() =>
                    setCosts((current) =>
                      alone
                        ? { ...current, [field.id]: stepAlone(current[field.id] ?? field.min, -1, field.min) }
                        : shiftCosts(view.fields, current, field.id, -1),
                    )
                  }
                >
                  −
                </button>
                <span className="w-10 text-center text-sm tabular-nums text-fg">{shown}</span>
                <button
                  type="button"
                  className="plain-press h-full w-9 text-base text-fg disabled:opacity-30"
                  aria-label={`${field.label}增加`}
                  disabled={!canUp}
                  onClick={() =>
                    setCosts((current) =>
                      alone
                        ? { ...current, [field.id]: stepAlone(current[field.id] ?? field.min, 1, field.min) }
                        : shiftCosts(view.fields, current, field.id, 1),
                    )
                  }
                >
                  ＋
                </button>
              </div>
              <span className="min-w-0 flex-1 text-right text-xs tabular-nums text-fg">
                {bonus === "未達" ? bonus : `${field.kind} ${bonus}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SchoolGrid({ cols, href, intro }: { cols: SchoolCol[]; href?: string; intro?: string }) {
  const shared = intro ? leadingSharedRows(cols) : [];
  const colsShown = shared.length
    ? cols.map((col) => ({ ...col, rows: col.rows.slice(shared.length) }))
    : cols;
  const byRyuha = colsShown.some((col) => /^(部隊|士氣|城塞|琥煌)$/.test(col.title));
  const byTroop = colsShown.some((col) => /隊/.test(col.title) && !byRyuha);
  if (colsShown.some((col) => col.ladder?.length)) {
    return <CostLadderBox cols={cols} />;
  }
  return (
    <div className="mt-4">
      {shared.length ? (
        <dl className="grid grid-cols-1 gap-1.5">
          {shared.map((row) => (
            <EffectRow key={`${row.label}-${row.value}`} row={row} href={href} />
          ))}
        </dl>
      ) : null}
      <p className={cn("text-xs leading-relaxed text-pretty text-muted", shared.length && "mt-3")}>
        {intro ?? (byRyuha ? "依所選流派，效果完全不同。" : byTroop ? "依對象部隊數，效果不同。" : "依對象兵種，效果不同。")}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {colsShown.map((col) => {
          const rows = rowsWithoutNoteEcho(col.note, col.rows);
          return (
            <section key={col.id} className="rounded-md bg-surface-2 px-2.5 py-2">
              <h3 className="font-display text-sm leading-tight text-fg">{col.title}</h3>
              {col.note ? <p className="mt-0.5 text-xs leading-relaxed text-pretty text-muted">{col.note}</p> : null}
              {rows.length ? <TierRows id={col.id} rows={rows} href={href} /> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SenkiGrid({ cols, href }: { cols: SenkiCol[]; href?: string }) {
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
            <TierRows id={col.id} rows={col.rows} href={href} />
          </section>
        ))}
      </div>
    </div>
  );
}

function ShukuseiGrid({ tiers, href }: { tiers: ShukuseiTier[]; href?: string }) {
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
            <TierRows id={tier.id} rows={tier.rows} href={href} />
          </section>
        ))}
      </div>
    </div>
  );
}

function KokouGrid({ data, href }: { data: KokouTiers; href?: string }) {
  const cols = [...data.cols].reverse();
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-pretty text-muted">{data.note}</p>
      {data.shared.length ? (
        <div className="mt-2 rounded-md bg-surface-2 px-2.5 py-2">
          <p className="text-xs text-faint">各劍共通</p>
          <TierRows id="shared" rows={data.shared} href={href} />
        </div>
      ) : null}
      {data.extra ? (
        <div className="mt-2 rounded-md bg-surface-2 px-2.5 py-2">
          <p className="text-xs text-faint">{data.extra.title}</p>
          <TierRows id="extra" rows={data.extra.rows} href={href} />
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
            <TierRows id={col.id} rows={col.rows} href={href} />
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

function KonshinDamage({ tier }: { tier: "strong" | "weak" }) {
  const chart = useContext(DamageChartContext);
  if (!chart) return null;
  const sliced = chartForKonshin(chart, tier);
  if (!sliced) return null;
  return <IntelDamageTable chart={sliced} />;
}

function TierRows({ id, rows, href }: { id: string; rows: StatLine[]; href?: string }) {
  const chart = useContext(DamageChartContext);
  const shown = chart ? rows.filter((row) => !isDamagePlaceholder(row)) : rows;
  if (!shown.length) return rows.length ? null : <p className="mt-2 text-xs text-faint">—</p>;
  return (
    <dl className="mt-1.5 grid grid-cols-1 gap-1.5">
      {shown.map((row) => (
        <EffectRow key={`${id}-${row.label}-${row.value}`} row={row} href={href} />
      ))}
    </dl>
  );
}
