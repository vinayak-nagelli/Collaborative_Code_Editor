import { create } from "zustand";
import api from "../services/api";
import { getSocket } from "../services/socket";

export const useFileStore = create((set, get) => ({
  files: [], // flat list; tree is derived in the FileExplorer component
  isLoading: false,

  async fetchFiles(projectId) {
    set({ isLoading: true });
    const { data } = await api.get(`/projects/${projectId}/files`);
    set({ files: data.files, isLoading: false });
  },

  async createFile(projectId, { name, type, parentId }) {
    const { data } = await api.post(`/projects/${projectId}/files`, { name, type, parentId });
    set({ files: [...get().files, data.file] });
    getSocket().emit(type === "folder" ? "folder-created" : "file-created", {
      projectId,
      file: data.file,
    });
    return data.file;
  },

  async renameFile(fileId, name) {
    const { data } = await api.put(`/files/${fileId}`, { name });
    get().replaceFileInTree(data.file);
    return data.file;
  },

  async moveFile(fileId, parentId) {
    const { data } = await api.put(`/files/${fileId}`, { parentId });
    // A move can change many descendant paths — simplest correct approach
    // is to refetch the tree for the active project after a move.
    return data.file;
  },

  async deleteFile(projectId, fileId) {
    const { data } = await api.delete(`/files/${fileId}`);
    const deletedIds = new Set(data.deletedIds);
    set({ files: get().files.filter((f) => !deletedIds.has(f._id)) });
    getSocket().emit("file-deleted", { projectId, fileId, deletedIds: data.deletedIds });
  },

  async duplicateFile(fileId) {
    const { data } = await api.post(`/files/${fileId}/duplicate`);
    set({ files: [...get().files, data.file] });
    return data.file;
  },

  // --- socket-driven mutations (called from Workspace's socket listeners) ---
  addFileFromSocket(file) {
    if (get().files.some((f) => f._id === file._id)) return;
    set({ files: [...get().files, file] });
  },

  removeFilesFromSocket(deletedIds) {
    const idSet = new Set(deletedIds);
    set({ files: get().files.filter((f) => !idSet.has(f._id)) });
  },

  replaceFileInTree(updated) {
    set({ files: get().files.map((f) => (f._id === updated._id ? updated : f)) });
  },
}));

export default useFileStore;
