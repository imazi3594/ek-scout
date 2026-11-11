import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DECK_NOTE,
  applyDeckToggle,
  factionMorale,
  sanitizeDeck,
  summarizeDeck,
  type DeckCard,
} from "./deck.ts";

function card(partial: Partial<DeckCard> & Pick<DeckCard, "id" | "name" | "cost">): DeckCard {
  return {
    color: "蒼",
    period: "戦国",
    unit: "騎兵",
    skills: [],
    ...partial,
  };
}

describe("applyDeckToggle", () => {
  it("adds a card and removes that same card on the next tap", () => {
    const nobunaga = card({ id: "a", name: "織田信長", cost: 3 });
    const added = applyDeckToggle([], nobunaga);
    assert.equal(added.note, DECK_NOTE.added);
    assert.deepEqual(
      added.deck.map((item) => item.id),
      ["a"],
    );

    const removed = applyDeckToggle(added.deck, nobunaga);
    assert.equal(removed.note, DECK_NOTE.removed);
    assert.equal(removed.tone, "info");
    assert.deepEqual(removed.deck, []);
  });

  it("refuses a different printing of the same name", () => {
    const first = card({ id: "a", name: "織田信長", cost: 3, color: "蒼" });
    const second = card({ id: "b", name: "織田信長", cost: 2.5, color: "紫" });
    const result = applyDeckToggle([first], second);
    assert.equal(result.note, DECK_NOTE.name);
    assert.equal(result.tone, "warn");
    assert.deepEqual(
      result.deck.map((item) => item.id),
      ["a"],
    );
  });

  it("stops at 8 cards", () => {
    const deck = Array.from({ length: 8 }, (_, i) =>
      card({ id: `c${i}`, name: `武將${i}`, cost: 1 }),
    );
    const result = applyDeckToggle(deck, card({ id: "extra", name: "新人", cost: 1 }));
    assert.equal(result.note, DECK_NOTE.full);
    assert.equal(result.deck.length, 8);
  });

  it("allows cost 9 and refuses anything past it", () => {
    const deck = [
      card({ id: "a", name: "甲", cost: 2.5 }),
      card({ id: "b", name: "乙", cost: 2.5 }),
      card({ id: "c", name: "丙", cost: 2 }),
    ];
    const fit = applyDeckToggle(deck, card({ id: "d", name: "丁", cost: 2 }));
    assert.equal(fit.note, DECK_NOTE.added);
    assert.equal(summarizeDeck(fit.deck).cost, 9);
    assert.equal(summarizeDeck(fit.deck).remain, 0);

    const over = applyDeckToggle(deck, card({ id: "e", name: "戊", cost: 2.5 }));
    assert.equal(over.note, DECK_NOTE.cost);
    assert.equal(over.deck.length, 3);
  });

  it("names the same-name rule before the 8-card cap", () => {
    const deck = [
      card({ id: "dup", name: "織田信長", cost: 1 }),
      ...Array.from({ length: 7 }, (_, i) => card({ id: `c${i}`, name: `武將${i}`, cost: 1 })),
    ];
    const result = applyDeckToggle(deck, card({ id: "other", name: "織田信長", cost: 1 }));
    assert.equal(result.note, DECK_NOTE.name);
  });
});

describe("sanitizeDeck", () => {
  it("drops unknown duplicates, same names, and cards that break the cost cap", () => {
    const kept = sanitizeDeck([
      card({ id: "a", name: "織田信長", cost: 3 }),
      card({ id: "a", name: "織田信長", cost: 3 }),
      card({ id: "b", name: "織田信長", cost: 2 }),
      card({ id: "c", name: "豐臣秀吉", cost: 4 }),
      card({ id: "d", name: "德川家康", cost: 3 }),
    ]);
    assert.deepEqual(
      kept.map((item) => item.id),
      ["a", "c"],
    );
  });
});

describe("faction morale", () => {
  it("follows the official faction bonus and stays empty at zero", () => {
    assert.equal(factionMorale(0), null);
    assert.equal(factionMorale(1), 12);
    assert.equal(factionMorale(2), 10);
    assert.equal(factionMorale(3), 8);
    assert.equal(factionMorale(4), 6);
    assert.equal(factionMorale(7), 6);
    assert.equal(summarizeDeck([]).morale, null);
    const mixed = summarizeDeck([
      card({ id: "a", name: "甲", cost: 1, color: "蒼", skills: [6, 6] }),
      card({
        id: "b",
        name: "乙",
        cost: 1.5,
        color: "緋",
        skills: [12],
        period: "平安",
        unit: "槍兵",
      }),
    ]);
    assert.equal(mixed.morale, 10);
    assert.equal(mixed.factions, 2);
    assert.equal(mixed.skills.get(6), 2);
    assert.equal(mixed.skills.get(12), 1);
    assert.equal(mixed.periods.get("平安"), 1);
    assert.equal(mixed.units.get("槍兵"), 1);
  });
});
