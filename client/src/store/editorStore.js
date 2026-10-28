import { create } from "zustand";
import { getSocket } from "../services/socket";

export const useEditorStore = create((set, get) => ({
  openTabs: [], // [{ fileId, name, language }]
  activeFileId: null,

  openFile(file) {
    const exists = get().openTabs.some((t) => t.fileId === file._id);
    if (!exists) {
      set({ openTabs: [...get().openTabs, { fileId: file._id, name: file.name, language: file.language }] });
    }
    set({ activeFileId: file._id });

    // Broadcast to collaborators: "I am now viewing this file"
    try {
      const socket = getSocket();
      // Extract projectId from URL path: /workspace/:projectId
      const projectId = window.location.pathname.split("/workspace/")[1]?.split("/")[0];
      if (socket?.connected && projectId) {
        socket.emit("file-opened", { projectId, fileId: file._id, fileName: file.name });
      }
    } catch (_) {
      // Socket not ready — presence update skipped gracefully
    }
  },

  closeTab(fileId) {
    const tabs = get().openTabs.filter((t) => t.fileId !== fileId);
    let active = get().activeFileId;
    if (active === fileId) {
      active = tabs.length ? tabs[tabs.length - 1].fileId : null;
    }
    set({ openTabs: tabs, activeFileId: active });
  },

  closeOthers(fileId) {
    const tab = get().openTabs.find((t) => t.fileId === fileId);
    set({ openTabs: tab ? [tab] : [], activeFileId: tab ? fileId : null });
  },

  closeAll() {
    set({ openTabs: [], activeFileId: null });
  },

  closeToRight(fileId) {
    const tabs = get().openTabs;
    const idx = tabs.findIndex((t) => t.fileId === fileId);
    if (idx === -1) return;
    const kept = tabs.slice(0, idx + 1);
    const activeStillOpen = kept.some((t) => t.fileId === get().activeFileId);
    set({ openTabs: kept, activeFileId: activeStillOpen ? get().activeFileId : fileId });
  },

  setActiveTab(fileId) {
    set({ activeFileId: fileId });
  },

  renameTab(fileId, name) {
    set({ openTabs: get().openTabs.map((t) => (t.fileId === fileId ? { ...t, name } : t)) });
  },

  removeTabIfOpen(fileId) {
    if (get().openTabs.some((t) => t.fileId === fileId)) get().closeTab(fileId);
  },
}));

export default useEditorStore;
