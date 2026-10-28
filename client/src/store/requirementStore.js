import { create } from "zustand";
import api from "../services/api";

export const useRequirementStore = create((set, get) => ({
  requirements: [],
  selectedRequirement: null,
  linkedTasks: [],
  isLoading: false,
  error: null,

  async fetchRequirements(projectId, filter = {}) {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/projects/${projectId}/requirements`, { params: filter });
      set({ requirements: data.requirements, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  async fetchRequirementDetails(projectId, reqId) {
    try {
      const { data } = await api.get(`/projects/${projectId}/requirements/${reqId}`);
      set({
        selectedRequirement: data.requirement,
        linkedTasks: data.linkedTasks || [],
      });
      return data;
    } catch (err) {
      set({ error: err.message });
    }
  },

  async createRequirement(projectId, reqData) {
    const { data } = await api.post(`/projects/${projectId}/requirements`, reqData);
    set({ requirements: [data.requirement, ...get().requirements] });
    return data.requirement;
  },

  async updateRequirement(projectId, reqId, updates) {
    const { data } = await api.put(`/projects/${projectId}/requirements/${reqId}`, updates);
    set({
      requirements: get().requirements.map((r) => (r._id === reqId ? data.requirement : r)),
      selectedRequirement:
        get().selectedRequirement?._id === reqId ? data.requirement : get().selectedRequirement,
    });
    return data.requirement;
  },

  async toggleCriterion(projectId, reqId, criterionId) {
    const { data } = await api.patch(
      `/projects/${projectId}/requirements/${reqId}/criteria/${criterionId}/toggle`
    );
    set({
      requirements: get().requirements.map((r) => (r._id === reqId ? data.requirement : r)),
      selectedRequirement:
        get().selectedRequirement?._id === reqId ? data.requirement : get().selectedRequirement,
    });
    return data.requirement;
  },

  async deleteRequirement(projectId, reqId) {
    await api.delete(`/projects/${projectId}/requirements/${reqId}`);
    set({
      requirements: get().requirements.filter((r) => r._id !== reqId),
      selectedRequirement:
        get().selectedRequirement?._id === reqId ? null : get().selectedRequirement,
    });
  },

  selectRequirement(req) {
    set({ selectedRequirement: req });
  },

  // Socket handlers for live multi-user sync
  onRequirementCreated(req) {
    const exists = get().requirements.some((r) => r._id === req._id);
    if (!exists) {
      set({ requirements: [req, ...get().requirements] });
    }
  },

  onRequirementUpdated(req) {
    set({
      requirements: get().requirements.map((r) => (r._id === req._id ? req : r)),
      selectedRequirement:
        get().selectedRequirement?._id === req._id ? req : get().selectedRequirement,
    });
  },

  onRequirementDeleted({ _id }) {
    set({
      requirements: get().requirements.filter((r) => r._id !== _id),
      selectedRequirement:
        get().selectedRequirement?._id === _id ? null : get().selectedRequirement,
    });
  },
}));

export default useRequirementStore;
