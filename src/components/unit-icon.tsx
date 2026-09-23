import type { CSSProperties } from "react";
import type { UnitName } from "@/data/catalog";
import { cn } from "@/lib/utils";

const PICTURE: ReadonlySet<UnitName> = new Set(["剣豪", "鉄砲隊"]);

const FILE: Record<UnitName, string> = {
  騎兵: "cavalry.png",
  槍兵: "spear.png",
  弓兵: "bow.png",
  剣豪: "sword.png",
  鉄砲隊: "gun.png",
};

export function UnitIcon({
  unit,
  className,
  title,
  style,
}: {
  unit: UnitName;
  className?: string;
  title?: string;
  style?: CSSProperties;
}) {
  const src = `${import.meta.env.BASE_URL}units/${FILE[unit]}`;
  if (PICTURE.has(unit)) {
    return (
      <img
        src={src}
        alt={title ?? ""}
        aria-hidden={title ? undefined : true}
        className={cn("inline-block size-5 shrink-0 object-contain", className)}
        style={style}
      />
    );
  }
  return (
    <span
      className={cn("inline-block size-5 shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        ...style,
      }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
