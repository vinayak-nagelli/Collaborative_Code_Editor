import { create } from "zustand";

// fileId -> [{ severity, message, startLineNumber, startColumn }]
export const useProblemsStore = create((set, get) => ({
  problemsByFile: {},

  setProblems(fileId, markers) {
    set({ problemsByFile: { ...get().problemsByFile, [fileId]: markers } });
  },

  clearProblems(fileId) {
    const next = { ...get().problemsByFile };
    delete next[fileId];
    set({ problemsByFile: next });
  },

  allProblems() {
    return Object.entries(get().problemsByFile).flatMap(([fileId, markers]) =>
      markers.map((m) => ({ fileId, ...m }))
    );
  },
}));

export default useProblemsStore;
