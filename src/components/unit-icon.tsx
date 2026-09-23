import type { CSSProperties } from "react";
import type { UnitName } from "@/data/catalog";
import { cn } from "@/lib/utils";

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
