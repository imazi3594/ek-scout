import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const message = errorMessage(error);
  const failedLoad = /dynamically imported module|Failed to fetch|Importing a module script failed/i.test(message);
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">{failedLoad ? "無法載入畫面" : "發生錯誤"}</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        {failedLoad ? "程式檔未能完整下載。請重新載入。" : message}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 h-10 rounded-md bg-zinc-900 px-4 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        重新載入
      </button>
    </main>
  );
}
