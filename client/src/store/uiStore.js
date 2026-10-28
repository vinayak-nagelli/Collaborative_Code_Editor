import { create } from "zustand";

export const useUIStore = create((set) => ({
  isCreateModalOpen: false,
  isJoinModalOpen: false,

  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  openJoinModal: () => set({ isJoinModalOpen: true }),
  closeJoinModal: () => set({ isJoinModalOpen: false }),
}));

export default useUIStore;
