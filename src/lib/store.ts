import { create } from "zustand";

interface AppState {
  // Current view
  view: "home" | "create" | "tournament" | "bracket";
  selectedTournamentId: string | null;
  setView: (view: "home" | "create" | "tournament" | "bracket") => void;
  selectTournament: (id: string) => void;
  goHome: () => void;

  // Refresh trigger
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "home",
  selectedTournamentId: null,

  setView: (view) => set({ view }),
  selectTournament: (id) =>
    set({ selectedTournamentId: id, view: "tournament" }),
  goHome: () => set({ view: "home", selectedTournamentId: null }),

  refreshKey: 0,
  triggerRefresh: () =>
    set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));
