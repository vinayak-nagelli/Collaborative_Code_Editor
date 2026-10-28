import { create } from "zustand";

// fileId -> Set(lineNumber)
export const useBreakpointsStore = create((set, get) => ({
  breakpoints: {},

  toggle(fileId, line) {
    const current = new Set(get().breakpoints[fileId] || []);
    current.has(line) ? current.delete(line) : current.add(line);
    set({ breakpoints: { ...get().breakpoints, [fileId]: current } });
  },

  get(fileId) {
    return get().breakpoints[fileId] || new Set();
  },
}));

export default useBreakpointsStore;
