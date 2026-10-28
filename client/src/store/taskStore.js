import { create } from "zustand";
import api from "../services/api";

export const useTaskStore = create((set, get) => ({
  tasks: [],
  selectedTask: null,
  isLoading: false,
  error: null,

  async fetchTasks(projectId, filter = {}) {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/projects/${projectId}/tasks`, { params: filter });
      set({ tasks: data.tasks, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  async fetchTaskDetails(projectId, taskId) {
    try {
      const { data } = await api.get(`/projects/${projectId}/tasks/${taskId}`);
      set({ selectedTask: data.task });
      return data.task;
    } catch (err) {
      set({ error: err.message });
    }
  },

  async createTask(projectId, taskData) {
    const { data } = await api.post(`/projects/${projectId}/tasks`, taskData);
    set({ tasks: [data.task, ...get().tasks] });
    return data.task;
  },

  async updateTask(projectId, taskId, updates) {
    const { data } = await api.put(`/projects/${projectId}/tasks/${taskId}`, updates);
    set({
      tasks: get().tasks.map((t) => (t._id === taskId ? data.task : t)),
      selectedTask: get().selectedTask?._id === taskId ? data.task : get().selectedTask,
    });
    return data.task;
  },

  async updateTaskStatus(projectId, taskId, status) {
    // Optimistic update for fluid drag/drop or column change
    const prevTasks = get().tasks;
    set({
      tasks: prevTasks.map((t) => (t._id === taskId ? { ...t, status } : t)),
    });
    try {
      const { data } = await api.put(`/projects/${projectId}/tasks/${taskId}`, { status });
      set({
        tasks: get().tasks.map((t) => (t._id === taskId ? data.task : t)),
        selectedTask: get().selectedTask?._id === taskId ? data.task : get().selectedTask,
      });
      return data.task;
    } catch (err) {
      // Revert if failed
      set({ tasks: prevTasks, error: err.message });
      throw err;
    }
  },

  async linkFile(projectId, taskId, fileId, filePath) {
    const { data } = await api.post(`/projects/${projectId}/tasks/${taskId}/link-file`, {
      fileId,
      filePath,
    });
    set({
      tasks: get().tasks.map((t) => (t._id === taskId ? data.task : t)),
      selectedTask: get().selectedTask?._id === taskId ? data.task : get().selectedTask,
    });
    return data.task;
  },

  async unlinkFile(projectId, taskId, fileId) {
    const { data } = await api.delete(
      `/projects/${projectId}/tasks/${taskId}/unlink-file/${fileId}`
    );
    set({
      tasks: get().tasks.map((t) => (t._id === taskId ? data.task : t)),
      selectedTask: get().selectedTask?._id === taskId ? data.task : get().selectedTask,
    });
    return data.task;
  },

  async deleteTask(projectId, taskId) {
    await api.delete(`/projects/${projectId}/tasks/${taskId}`);
    set({
      tasks: get().tasks.filter((t) => t._id !== taskId),
      selectedTask: get().selectedTask?._id === taskId ? null : get().selectedTask,
    });
  },

  selectTask(task) {
    set({ selectedTask: task });
  },

  // Socket handlers for live multi-user sync
  onTaskCreated(task) {
    const exists = get().tasks.some((t) => t._id === task._id);
    if (!exists) {
      set({ tasks: [task, ...get().tasks] });
    }
  },

  onTaskUpdated(task) {
    set({
      tasks: get().tasks.map((t) => (t._id === task._id ? task : t)),
      selectedTask: get().selectedTask?._id === task._id ? task : get().selectedTask,
    });
  },

  onTaskDeleted({ _id }) {
    set({
      tasks: get().tasks.filter((t) => t._id !== _id),
      selectedTask: get().selectedTask?._id === _id ? null : get().selectedTask,
    });
  },
}));

export default useTaskStore;
