import { useEffect, useRef, useState, type CSSProperties } from "react";
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

type PixelSprite = { cols: number; rows: number; on: Uint8Array };

export function PixelUnitTrail({ unit }: { unit: UnitName }) {
  const sprite = usePixelSprite(unit);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !sprite) return;
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || 400;
    const h = parent?.clientHeight || 800;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#6a655e";
    const block = 3;
    const iconW = sprite.cols * block;
    const iconH = sprite.rows * block;
    const pitchX = iconW + 22;
    const pitchY = Math.round(pitchX * 0.86);
    const reach = Math.hypot(w, h);
    const cols = Math.ceil(reach / pitchX) + 2;
    const rows = Math.ceil(reach / pitchY) + 2;
    const ox = w / 2;
    const oy = h * 0.72;
    const cos = Math.SQRT1_2;
    const sin = Math.SQRT1_2;
    const fadeTop = h * 0.46;
    for (let row = -rows; row <= rows; row++) {
      const stagger = row % 2 === 0 ? 0 : pitchX / 2;
      for (let col = -cols; col <= cols; col++) {
        const gx = col * pitchX + stagger;
        const gy = row * pitchY;
        const x = ox + (gx - gy) * cos;
        const y = oy + (gx + gy) * sin;
        if (y < fadeTop - iconH || y > h + iconH) continue;
        const fade = Math.min(1, Math.max(0, (y - fadeTop) / (h * 0.28)));
        ctx.globalAlpha = 0.22 * fade;
        const left = Math.round(x - iconW / 2);
        const top = Math.round(y - iconH / 2);
        for (let py = 0; py < sprite.rows; py++) {
          for (let px = 0; px < sprite.cols; px++) {
            if (!sprite.on[py * sprite.cols + px]) continue;
            ctx.fillRect(left + px * block, top + py * block, block, block);
          }
        }
      }
    }
  }, [sprite]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function usePixelSprite(unit: UnitName) {
  const [sprite, setSprite] = useState<PixelSprite | null>(null);
  useEffect(() => {
    let gone = false;
    const img = new Image();
    img.onload = () => {
      if (gone) return;
      try {
        const sample = document.createElement("canvas");
        sample.width = img.width;
        sample.height = img.height;
        const sctx = sample.getContext("2d", { willReadFrequently: true });
        if (!sctx) return;
        sctx.drawImage(img, 0, 0);
        const data = sctx.getImageData(0, 0, img.width, img.height).data;
        let minX = img.width;
        let minY = img.height;
        let maxX = 0;
        let maxY = 0;
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            if (data[(y * img.width + x) * 4 + 3] > 96) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < minX) return;
        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        const cols = 16;
        const rows = Math.max(1, Math.round((cols * bh) / bw));
        const on = new Uint8Array(cols * rows);
        for (let y = 0; y < rows; y++) {
          const y0 = minY + Math.floor((y * bh) / rows);
          const y1 = minY + Math.floor(((y + 1) * bh) / rows);
          for (let x = 0; x < cols; x++) {
            const x0 = minX + Math.floor((x * bw) / cols);
            const x1 = minX + Math.floor(((x + 1) * bw) / cols);
            let hit = false;
            for (let sy = y0; sy < y1 && !hit; sy++) {
              for (let sx = x0; sx < x1; sx++) {
                if (data[(sy * img.width + sx) * 4 + 3] > 96) {
                  hit = true;
                  break;
                }
              }
            }
            if (hit) on[y * cols + x] = 1;
          }
        }
        if (!gone) setSprite({ cols, rows, on });
      } catch {
        if (!gone) setSprite(null);
      }
    };
    img.src = `${import.meta.env.BASE_URL}units/${FILE[unit]}`;
    return () => {
      gone = true;
    };
  }, [unit]);
  return sprite;
}
