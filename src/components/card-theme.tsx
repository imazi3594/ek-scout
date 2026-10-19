import type { CSSProperties } from "react";
import type { Card, ColorName, UnitName } from "@/data/catalog";
import { UnitIcon } from "@/components/unit-icon";
import { cn } from "@/lib/utils";

const FACTION: Record<ColorName, string> = {
  蒼: "var(--color-faction-ao)",
  緋: "var(--color-faction-hi)",
  碧: "var(--color-faction-heki)",
  玄: "var(--color-faction-gen)",
  紫: "var(--color-faction-shi)",
  琥: "var(--color-faction-ko)",
  黄: "var(--color-faction-ou)",
};

const UNIT_WASH: Record<UnitName, { angle: string; rotate: string }> = {
  騎兵: { angle: "100deg", rotate: "-12deg" },
  槍兵: { angle: "42deg", rotate: "28deg" },
  弓兵: { angle: "50deg", rotate: "36deg" },
  剣豪: { angle: "-38deg", rotate: "-22deg" },
  鉄砲隊: { angle: "8deg", rotate: "4deg" },
};

const RARITY_WASH: Partial<Record<Card["rarity"], string>> = {
  R: "radial-gradient(130% 90% at 50% -10%, rgb(232 236 244 / 0.2), transparent 58%)",
  SR: "radial-gradient(130% 90% at 50% -10%, rgb(226 193 90 / 0.22), transparent 60%)",
  ER: "linear-gradient(165deg, rgb(255 107 138 / 0.16), rgb(255 209 102 / 0.1) 32%, rgb(126 231 135 / 0.08) 55%, rgb(110 203 255 / 0.14) 78%, rgb(201 160 255 / 0.16))",
};

export function CardThemeBackdrop({ card }: { card: Card }) {
  const color = FACTION[card.color];
  const { angle, rotate } = UNIT_WASH[card.unit];
  const rarityWash = RARITY_WASH[card.rarity];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: [
            `radial-gradient(90% 70% at 0% 0%, color-mix(in srgb, ${color} 52%, transparent), transparent 60%)`,
            `radial-gradient(80% 60% at 100% 100%, color-mix(in srgb, ${color} 30%, transparent), transparent 58%)`,
            `linear-gradient(${angle}, color-mix(in srgb, ${color} 34%, transparent) 0%, transparent 48%, color-mix(in srgb, ${color} 18%, transparent) 100%)`,
          ].join(","),
        }}
      />
      {rarityWash ? <div className="absolute inset-0" style={{ background: rarityWash }} /> : null}
      <div className="card-cyber absolute inset-0" />
      <pre className="card-code absolute top-3 left-3 max-w-[min(18rem,72%)] font-mono text-[10px] leading-[1.45] text-[#9c958a] [mask-image:linear-gradient(115deg,#000_18%,transparent_82%)]">
        {`const card = {\n  no: ${JSON.stringify(card.no)},\n  name: ${JSON.stringify(card.name)},\n  faction: ${JSON.stringify(card.color)},\n  era: ${JSON.stringify(card.period)},\n  unit: ${JSON.stringify(card.unit)},\n  rarity: ${JSON.stringify(card.rarity)},\n  cost: ${card.cost},\n  pow: ${card.power},\n  int: ${card.intel},\n  strat: ${JSON.stringify(card.stratName)},\n  morale: ${card.stratCost},\n}`}
      </pre>
      <UnitIcon
        unit={card.unit}
        className="absolute -right-8 -bottom-6 size-[min(16rem,70vw)] opacity-[0.18] lg:-right-10 lg:size-[24rem] lg:opacity-[0.22]"
        style={{ color, transform: `rotate(${rotate})` } satisfies CSSProperties}
      />
    </div>
  );
}

export function HomeWash({ faded = false }: { faded?: boolean }) {
  const src = `${import.meta.env.BASE_URL}home-wash.jpg`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        src={src}
        alt=""
        className={cn("absolute inset-0 size-full object-cover object-center", faded ? "opacity-40" : "opacity-100")}
      />
      <div className={cn("absolute inset-0", faded ? "bg-bg/55" : "bg-gradient-to-b from-black/30 via-transparent to-black/50")} />
    </div>
  );
}
