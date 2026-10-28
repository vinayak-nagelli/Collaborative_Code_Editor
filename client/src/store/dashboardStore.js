import { create } from "zustand";
import api from "../services/api";

export const useDashboardStore = create((set, get) => ({
  healthScore: 100,
  metrics: null,
  activeBlockers: [],
  teamWorkload: [],
  performanceAnalytics: null,
  isLoading: false,
  error: null,
  isDashboardOpen: false,

  openDashboard() {
    set({ isDashboardOpen: true });
  },

  closeDashboard() {
    set({ isDashboardOpen: false });
  },

  async fetchHealth(projectId) {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/projects/${projectId}/dashboard/health`);
      set({
        healthScore: data.healthScore,
        metrics: data.metrics,
        activeBlockers: data.activeBlockers,
        teamWorkload: data.teamWorkload,
        performanceAnalytics: data.performanceAnalytics,
        isLoading: false,
      });
      return data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },
}));


export default useDashboardStore;
