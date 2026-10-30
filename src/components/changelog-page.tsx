import { ChevronLeft } from "lucide-react";
import { CHANGELOG } from "@/data/changelog";

export function ChangelogPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-surface-2 px-2.5 text-xs text-fg"
        >
          <ChevronLeft className="size-3.5" />
          返回關於
        </button>
      </div>

      <h2 className="font-display text-2xl tracking-tight">更新日誌</h2>
      <p className="mt-2 text-sm leading-relaxed text-pretty text-muted">近期較大改動一覽。</p>

      <ol className="mt-6 flex flex-col gap-3">
        {CHANGELOG.map((entry) => (
          <li
            key={`${entry.date}-${entry.title}`}
            className="rounded-lg border border-white/10 bg-black/35 px-3.5 py-3.5"
          >
            <p className="text-xs tabular-nums text-faint">{entry.date.replaceAll("-", "/")}</p>
            <p className="mt-1.5 text-sm font-semibold text-fg">{entry.title}</p>
            {entry.features?.length ? (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
                {entry.features.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {entry.cards?.length ? (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
                {entry.cards.map((card) => (
                  <li key={card}>{card}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
