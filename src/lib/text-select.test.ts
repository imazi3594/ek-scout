import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TEXT_SELECT_KEY, readTextSelect, writeTextSelect } from "./text-select.ts";

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("text select preference", () => {
  it("stays off when nothing is saved", () => {
    assert.equal(readTextSelect(memory()), false);
    assert.equal(readTextSelect(null), false);
    assert.equal(readTextSelect(undefined), false);
  });

  it("turns on only for the stored on value", () => {
    const storage = memory();
    storage.setItem(TEXT_SELECT_KEY, "1");
    assert.equal(readTextSelect(storage), true);

    storage.setItem(TEXT_SELECT_KEY, "0");
    assert.equal(readTextSelect(storage), false);
    storage.setItem(TEXT_SELECT_KEY, "true");
    assert.equal(readTextSelect(storage), false);
  });

  it("persists on and clears the key when turned off", () => {
    const storage = memory();
    writeTextSelect(storage, true);
    assert.equal(storage.getItem(TEXT_SELECT_KEY), "1");
    assert.equal(readTextSelect(storage), true);

    writeTextSelect(storage, false);
    assert.equal(storage.getItem(TEXT_SELECT_KEY), null);
    assert.equal(readTextSelect(storage), false);
  });

  it("ignores a storage that throws", () => {
    const broken = {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
      removeItem() {
        throw new Error("denied");
      },
    };
    assert.equal(readTextSelect(broken), false);
    assert.doesNotThrow(() => writeTextSelect(broken, true));
    assert.doesNotThrow(() => writeTextSelect(broken, false));
    assert.doesNotThrow(() => writeTextSelect(null, true));
  });
});

describe("selection css", () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles.css"), "utf8");

  it("keeps the public default locked and opens selection only with the owner flag", () => {
    const bodyStart = css.indexOf("  body {");
    const overrideStart = css.indexOf("html[data-text]");
    assert.ok(bodyStart !== -1 && overrideStart > bodyStart);
    const locked = css.slice(bodyStart, overrideStart);
    assert.match(locked, /user-select:\s*none/);
    assert.match(locked, /-webkit-user-select:\s*none/);
    assert.match(locked, /-webkit-touch-callout:\s*none/);

    const override = css.slice(overrideStart, css.indexOf("input,", overrideStart));
    assert.match(override, /html\[data-text\],\s*html\[data-text\] body/);
    assert.match(override, /user-select:\s*text/);
    assert.match(override, /-webkit-touch-callout:\s*default/);
  });
});
