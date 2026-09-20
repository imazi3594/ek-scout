import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENT = 50;

type ScoutState = {
  query: string;
  selectedId: string | null;
  recents: string[];
  setQuery: (q: string) => void;
  select: (id: string | null) => void;
  touchRecent: (id: string) => void;
};

export const useScout = create<ScoutState>()(
  persist(
    (set, get) => ({
      query: "",
      selectedId: null,
      recents: [],
      setQuery: (query) => set({ query }),
      select: (selectedId) => {
        if (selectedId) get().touchRecent(selectedId);
        set({ selectedId });
      },
      touchRecent: (id) => {
        const next = [id, ...get().recents.filter((x) => x !== id)].slice(0, MAX_RECENT);
        set({ recents: next });
      },
    }),
    {
      name: "eiketsu-scout",
      skipHydration: true,
      partialize: (s) => ({
        recents: s.recents,
      }),
    },
  ),
);
