import { create } from "zustand";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true, // true while we check for an existing session on boot
  error: null,

  async checkAuth() {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.user, isLoading: false });
      connectSocket();
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  async register(name, email, password) {
    set({ error: null });
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      set({ user: data.user });
      connectSocket();
      return true;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  async login(email, password) {
    set({ error: null });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      set({ user: data.user });
      connectSocket();
      return true;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      disconnectSocket();
      set({ user: null });
    }
  },

  clearError() {
    set({ error: null });
  },
}));

export default useAuthStore;
