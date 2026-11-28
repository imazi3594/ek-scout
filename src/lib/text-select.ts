/** Owner-only text selection. Missing key means off, which is the public default. */
export const TEXT_SELECT_KEY = "ek-select";

type TextSelectStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readTextSelect(storage: Pick<Storage, "getItem"> | null | undefined): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(TEXT_SELECT_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeTextSelect(
  storage: TextSelectStorage | null | undefined,
  enabled: boolean,
): void {
  if (!storage) return;
  try {
    if (enabled) storage.setItem(TEXT_SELECT_KEY, "1");
    else storage.removeItem(TEXT_SELECT_KEY);
  } catch {
    // Private mode or a full quota should not block the in-page toggle.
  }
}

function browserStorage(): TextSelectStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Reflects the saved choice on <html data-text>. Absent keeps the CSS lock. */
export function applyTextSelect(enabled: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.toggleAttribute("data-text", enabled);
  if (!enabled) window.getSelection()?.removeAllRanges();
}

export function currentTextSelect(): boolean {
  return readTextSelect(browserStorage());
}

export function restoreTextSelect(): boolean {
  const enabled = currentTextSelect();
  applyTextSelect(enabled);
  return enabled;
}

export function toggleTextSelect(): boolean {
  const next = !readTextSelect(browserStorage());
  writeTextSelect(browserStorage(), next);
  applyTextSelect(next);
  return next;
}
