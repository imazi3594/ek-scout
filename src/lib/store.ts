import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CARD_BY_ID, type Card } from "@/data/catalog";
import { applyDeckToggle, sanitizeDeck, type DeckNoteTone } from "@/lib/deck";

const MAX_RECENT = 50;

export type DeckNote = { key: number; text: string; tone: DeckNoteTone };

type ScoutState = {
  query: string;
  selectedId: string | null;
  recents: string[];
  deck: string[];
  deckNote: DeckNote | null;
  setQuery: (q: string) => void;
  select: (id: string | null) => void;
  touchRecent: (id: string) => void;
  toggleDeck: (id: string) => void;
  removeDeck: (id: string) => void;
  clearDeck: () => void;
  clearDeckNote: (key: number) => void;
};

let deckNoteSeq = 0;

function note(text: string, tone: DeckNoteTone): DeckNote {
  deckNoteSeq += 1;
  return { key: deckNoteSeq, text, tone };
}

function cardsFromIds(value: unknown): Card[] {
  if (!Array.isArray(value)) return [];
  const cards: Card[] = [];
  for (const id of value) {
    if (typeof id !== "string") continue;
    const card = CARD_BY_ID[id];
    if (card) cards.push(card);
  }
  return sanitizeDeck(cards);
}

function idsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string").slice(0, MAX_RECENT);
}

export const useScout = create<ScoutState>()(
  persist(
    (set, get) => ({
      query: "",
      selectedId: null,
      recents: [],
      deck: [],
      deckNote: null,
      setQuery: (query) => set({ query }),
      select: (selectedId) => {
        if (selectedId) get().touchRecent(selectedId);
        set({ selectedId });
      },
      touchRecent: (id) => {
        const next = [id, ...get().recents.filter((x) => x !== id)].slice(0, MAX_RECENT);
        set({ recents: next });
      },
      toggleDeck: (id) => {
        const card = CARD_BY_ID[id];
        if (!card) return;
        const cards = cardsFromIds(get().deck);
        const result = applyDeckToggle(cards, card);
        set({
          deck: result.deck.map((item) => item.id),
          deckNote: note(result.note, result.tone),
        });
      },
      removeDeck: (id) => {
        set({
          deck: cardsFromIds(get().deck)
            .filter((card) => card.id !== id)
            .map((card) => card.id),
        });
      },
      clearDeck: () => set({ deck: [] }),
      clearDeckNote: (key) => {
        if (get().deckNote?.key === key) set({ deckNote: null });
      },
    }),
    {
      name: "eiketsu-scout",
      skipHydration: true,
      partialize: (s) => ({
        recents: s.recents,
        deck: s.deck,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as { recents?: unknown; deck?: unknown };
        return {
          ...current,
          recents: Array.isArray(saved.recents) ? idsFrom(saved.recents) : current.recents,
          deck: cardsFromIds(saved.deck).map((card) => card.id),
        };
      },
    },
  ),
);
