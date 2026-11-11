/** 英傑大戰卡組：最多 8 張。同名與成本超過 9 仍可加入，由畫面紅字警示。 */

export const DECK_MAX_CARDS = 8;
export const DECK_MAX_COST = 9;

export const DECK_NOTE = {
  added: "已加入卡組",
  removed: "已移出卡組",
  full: "卡組已滿（最多 8 張）",
} as const;

export const DECK_WARN = {
  cost: "成本超過 9",
  name: "含同名武將",
} as const;

export type DeckNoteTone = "info" | "warn";

export type DeckCard = {
  id: string;
  name: string;
  cost: number;
  color: string;
  period: string;
  unit: string;
  skills: number[];
};

export function roundCost(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/** 這張卡為何不能加入。同 id 已在組內時不算違規，交給切換邏輯移出。 */
export function deckRefusal(cards: DeckCard[], card: DeckCard): "full" | null {
  const others = cards.filter((item) => item.id !== card.id);
  if (others.length >= DECK_MAX_CARDS) return "full";
  return null;
}

/** 特技列：個數一律寫出，單次也是「x 1」。 */
export function deckSkillLabel(name: string, count: number): string {
  return `${name} x ${count}`;
}

export type DeckWarnings = {
  overCost: boolean;
  duplicateNames: string[];
};

/** 同名、成本超過 9 不擋加入，只回傳要標紅的項目。 */
export function deckWarnings(cards: DeckCard[]): DeckWarnings {
  const cost = roundCost(cards.reduce((sum, card) => sum + card.cost, 0));
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card.name, (counts.get(card.name) ?? 0) + 1);
  return {
    overCost: cost > DECK_MAX_COST,
    duplicateNames: [...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name),
  };
}

export function applyDeckToggle<T extends DeckCard>(
  cards: T[],
  card: T,
): { deck: T[]; note: string; tone: DeckNoteTone } {
  if (cards.some((item) => item.id === card.id)) {
    return {
      deck: cards.filter((item) => item.id !== card.id),
      note: DECK_NOTE.removed,
      tone: "info",
    };
  }
  if (deckRefusal(cards, card)) return { deck: cards, note: DECK_NOTE.full, tone: "warn" };
  return { deck: [...cards, card], note: DECK_NOTE.added, tone: "info" };
}

/** 同一張卡只留一張，超過 8 張的丢掉。同名與超成本保留。 */
export function sanitizeDeck<T extends DeckCard>(cards: T[]): T[] {
  const kept: T[] = [];
  for (const card of cards) {
    if (kept.some((item) => item.id === card.id)) continue;
    if (deckRefusal(kept, card)) continue;
    kept.push(card);
  }
  return kept;
}

/** 官方勢力ボーナス。空卡組不給數字。 */
export function factionMorale(factions: number): number | null {
  if (!Number.isFinite(factions) || factions <= 0) return null;
  if (factions === 1) return 12;
  if (factions === 2) return 10;
  if (factions === 3) return 8;
  return 6;
}

export type DeckSummary = {
  count: number;
  cost: number;
  remain: number;
  factions: number;
  morale: number | null;
  colors: Map<string, number>;
  periods: Map<string, number>;
  units: Map<string, number>;
  skills: Map<number, number>;
};

function countBy(cards: DeckCard[], pick: (card: DeckCard) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const card of cards) {
    const key = pick(card);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function summarizeDeck(cards: DeckCard[]): DeckSummary {
  const cost = roundCost(cards.reduce((sum, card) => sum + card.cost, 0));
  const colors = countBy(cards, (card) => card.color);
  const factions = [...colors.values()].filter((n) => n > 0).length;
  const skills = new Map<number, number>();
  for (const card of cards) {
    for (const id of card.skills) skills.set(id, (skills.get(id) ?? 0) + 1);
  }
  return {
    count: cards.length,
    cost,
    remain: roundCost(Math.max(0, DECK_MAX_COST - cost)),
    factions,
    morale: cards.length ? factionMorale(factions) : null,
    colors,
    periods: countBy(cards, (card) => card.period),
    units: countBy(cards, (card) => card.unit),
    skills,
  };
}
