import { create } from "zustand";
import api from "../services/api";

export const useProjectStore = create((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  async fetchProjects(filter) {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/projects", { params: filter ? { filter } : {} });
      set({ projects: data.projects, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  async createProject({ name, description, template }) {
    const { data } = await api.post("/projects", { name, description, template });
    set({ projects: [data.project, ...get().projects] });
    return data.project;
  },

  async joinProject(inviteCode) {
    const { data } = await api.post(`/projects/join/${inviteCode}`);
    return data.project;
  },

  async previewInvite(inviteCode) {
    const { data } = await api.get(`/projects/join/${inviteCode}`);
    return data.project;
  },

  async toggleStar(projectId) {
    await api.post(`/projects/${projectId}/star`);
    set({
      projects: get().projects.map((p) =>
        p._id === projectId ? { ...p, _starToggled: true } : p
      ),
    });
    get().fetchProjects();
  },

  async deleteProject(projectId) {
    await api.delete(`/projects/${projectId}`);
    set({ projects: get().projects.filter((p) => p._id !== projectId) });
  },
}));

export default useProjectStore;
