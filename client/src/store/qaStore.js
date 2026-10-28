import { create } from "zustand";
import api from "../services/api";

export const useQAStore = create((set, get) => ({
  testCases: [],
  bugs: [],
  selectedTest: null,
  selectedBug: null,
  isLoadingTests: false,
  isLoadingBugs: false,
  error: null,

  // ==================== TEST CASES ====================
  async fetchTestCases(projectId, filter = {}) {
    set({ isLoadingTests: true, error: null });
    try {
      const { data } = await api.get(`/projects/${projectId}/qa/tests`, { params: filter });
      set({ testCases: data.testCases, isLoadingTests: false });
    } catch (err) {
      set({ error: err.message, isLoadingTests: false });
    }
  },

  async createTestCase(projectId, testData) {
    const { data } = await api.post(`/projects/${projectId}/qa/tests`, testData);
    set({ testCases: [data.testCase, ...get().testCases] });
    return data.testCase;
  },

  async updateTestCase(projectId, testId, updates) {
    const { data } = await api.put(`/projects/${projectId}/qa/tests/${testId}`, updates);
    set({
      testCases: get().testCases.map((t) => (t._id === testId ? data.testCase : t)),
      selectedTest: get().selectedTest?._id === testId ? data.testCase : get().selectedTest,
    });
    return data.testCase;
  },

  async runTestCase(projectId, testId, status, notes = "") {
    const { data } = await api.patch(`/projects/${projectId}/qa/tests/${testId}/run`, {
      status,
      notes,
    });
    set({
      testCases: get().testCases.map((t) => (t._id === testId ? data.testCase : t)),
      selectedTest: get().selectedTest?._id === testId ? data.testCase : get().selectedTest,
    });
    return data.testCase;
  },

  async deleteTestCase(projectId, testId) {
    await api.delete(`/projects/${projectId}/qa/tests/${testId}`);
    set({
      testCases: get().testCases.filter((t) => t._id !== testId),
      selectedTest: get().selectedTest?._id === testId ? null : get().selectedTest,
    });
  },

  selectTest(test) {
    set({ selectedTest: test });
  },

  // ==================== BUGS ====================
  async fetchBugs(projectId, filter = {}) {
    set({ isLoadingBugs: true, error: null });
    try {
      const { data } = await api.get(`/projects/${projectId}/qa/bugs`, { params: filter });
      set({ bugs: data.bugs, isLoadingBugs: false });
    } catch (err) {
      set({ error: err.message, isLoadingBugs: false });
    }
  },

  async createBug(projectId, bugData) {
    const { data } = await api.post(`/projects/${projectId}/qa/bugs`, bugData);
    set({ bugs: [data.bug, ...get().bugs] });
    return data.bug;
  },

  async updateBug(projectId, bugId, updates) {
    const { data } = await api.put(`/projects/${projectId}/qa/bugs/${bugId}`, updates);
    set({
      bugs: get().bugs.map((b) => (b._id === bugId ? data.bug : b)),
      selectedBug: get().selectedBug?._id === bugId ? data.bug : get().selectedBug,
    });
    return data.bug;
  },

  async linkFileToBug(projectId, bugId, fileId, filePath) {
    const { data } = await api.post(`/projects/${projectId}/qa/bugs/${bugId}/link-file`, {
      fileId,
      filePath,
    });
    set({
      bugs: get().bugs.map((b) => (b._id === bugId ? data.bug : b)),
      selectedBug: get().selectedBug?._id === bugId ? data.bug : get().selectedBug,
    });
    return data.bug;
  },

  async unlinkFileFromBug(projectId, bugId, fileId) {
    const { data } = await api.delete(`/projects/${projectId}/qa/bugs/${bugId}/unlink-file/${fileId}`);
    set({
      bugs: get().bugs.map((b) => (b._id === bugId ? data.bug : b)),
      selectedBug: get().selectedBug?._id === bugId ? data.bug : get().selectedBug,
    });
    return data.bug;
  },

  async deleteBug(projectId, bugId) {
    await api.delete(`/projects/${projectId}/qa/bugs/${bugId}`);
    set({
      bugs: get().bugs.filter((b) => b._id !== bugId),
      selectedBug: get().selectedBug?._id === bugId ? null : get().selectedBug,
    });
  },

  selectBug(bug) {
    set({ selectedBug: bug });
  },

  // Socket handlers
  onTestCreated(test) {
    if (!get().testCases.some((t) => t._id === test._id)) {
      set({ testCases: [test, ...get().testCases] });
    }
  },
  onTestUpdated(test) {
    set({
      testCases: get().testCases.map((t) => (t._id === test._id ? test : t)),
      selectedTest: get().selectedTest?._id === test._id ? test : get().selectedTest,
    });
  },
  onTestDeleted({ _id }) {
    set({
      testCases: get().testCases.filter((t) => t._id !== _id),
      selectedTest: get().selectedTest?._id === _id ? null : get().selectedTest,
    });
  },
  onBugCreated(bug) {
    if (!get().bugs.some((b) => b._id === bug._id)) {
      set({ bugs: [bug, ...get().bugs] });
    }
  },
  onBugUpdated(bug) {
    set({
      bugs: get().bugs.map((b) => (b._id === bug._id ? bug : b)),
      selectedBug: get().selectedBug?._id === bug._id ? bug : get().selectedBug,
    });
  },
  onBugDeleted({ _id }) {
    set({
      bugs: get().bugs.filter((b) => b._id !== _id),
      selectedBug: get().selectedBug?._id === _id ? null : get().selectedBug,
    });
  },
}));

export default useQAStore;
