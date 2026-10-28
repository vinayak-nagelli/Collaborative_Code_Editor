import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FlaskConical,
  Bug,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  Play,
  RotateCcw,
  Layers,
  FileCode,
  Link2,
  Trash2,
  X,
  ChevronRight,
  ShieldAlert,
  CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import useQAStore from "../store/qaStore";
import useRequirementStore from "../store/requirementStore";
import useTaskStore from "../store/taskStore";
import useFileStore from "../store/fileStore";
import useEditorStore from "../store/editorStore";

const TEST_STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-zinc-500/10 text-zinc-400 border-zinc-600/30", icon: Clock },
  ready: { label: "Ready", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: Play },
  passed: { label: "Passed", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
  blocked: { label: "Blocked", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: AlertOctagon },
};

const BUG_SEVERITY_CONFIG = {
  low: "bg-zinc-500/10 text-zinc-400 border-zinc-600/30",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  high: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/40 font-semibold",
};

const BUG_STATUS_CONFIG = {
  open: "border-red-500/30 text-red-400 bg-red-500/10",
  in_progress: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  resolved: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  verified: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  closed: "border-zinc-600/30 text-zinc-400 bg-zinc-500/10",
  reopened: "border-orange-500/30 text-orange-400 bg-orange-500/10",
};

export default function QAPanel({ projectId, canEdit }) {
  const [activeTab, setActiveTab] = useState("tests"); // "tests" | "bugs"

  const {
    testCases,
    bugs,
    fetchTestCases,
    createTestCase,
    updateTestCase,
    runTestCase,
    deleteTestCase,
    fetchBugs,
    createBug,
    updateBug,
    linkFileToBug,
    unlinkFileFromBug,
    deleteBug,
    isLoadingTests,
    isLoadingBugs,
  } = useQAStore();

  const { requirements, fetchRequirements } = useRequirementStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { files } = useFileStore();
  const { openFile, activeFileId } = useEditorStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedBug, setSelectedBug] = useState(null);

  // Modals state
  const [createTestModalOpen, setCreateTestModalOpen] = useState(false);
  const [createBugModalOpen, setCreateBugModalOpen] = useState(false);

  // New Test form state
  const [testTitle, setTestTitle] = useState("");
  const [testDesc, setTestDesc] = useState("");
  const [testPreconditions, setTestPreconditions] = useState("");
  const [testType, setTestType] = useState("manual");
  const [testPriority, setTestPriority] = useState("medium");
  const [testReqId, setTestReqId] = useState("");
  const [testSteps, setTestSteps] = useState([{ action: "", expectedResult: "" }]);

  // New Bug form state
  const [bugTitle, setBugTitle] = useState("");
  const [bugDesc, setBugDesc] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [bugSeverity, setBugSeverity] = useState("medium");
  const [bugReqId, setBugReqId] = useState("");
  const [bugTestId, setBugTestId] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchTestCases(projectId);
      fetchBugs(projectId);
      fetchRequirements(projectId);
      fetchTasks(projectId);
    }
  }, [projectId, fetchTestCases, fetchBugs, fetchRequirements, fetchTasks]);

  const activeFile = files.find((f) => f._id === activeFileId);

  // Filtered lists
  const filteredTests = testCases.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  const filteredBugs = bugs.filter((b) => {
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.description?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

  // Test Case handlers
  const handleAddStepRow = () => {
    setTestSteps([...testSteps, { action: "", expectedResult: "" }]);
  };

  const handleCreateTestSubmit = async (e) => {
    e.preventDefault();
    if (!testTitle.trim()) {
      toast.error("Please enter a test title");
      return;
    }
    try {
      await createTestCase(projectId, {
        title: testTitle.trim(),
        description: testDesc.trim(),
        preconditions: testPreconditions.trim(),
        type: testType,
        priority: testPriority,
        requirementId: testReqId || null,
        steps: testSteps.filter((s) => s.action.trim().length > 0),
      });
      toast.success("Test case created");
      setCreateTestModalOpen(false);
      setTestTitle("");
      setTestDesc("");
      setTestPreconditions("");
      setTestSteps([{ action: "", expectedResult: "" }]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRunTest = async (testId, status) => {
    if (!canEdit) return;
    try {
      const updated = await runTestCase(projectId, testId, status);
      if (selectedTest?._id === testId) setSelectedTest(updated);
      toast.success(`Marked as ${status}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm("Delete this test case?")) return;
    try {
      await deleteTestCase(projectId, testId);
      toast.success("Test case deleted");
      if (selectedTest?._id === testId) setSelectedTest(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Bug handlers
  const handleCreateBugSubmit = async (e) => {
    e.preventDefault();
    if (!bugTitle.trim()) {
      toast.error("Please enter a bug title");
      return;
    }
    try {
      await createBug(projectId, {
        title: bugTitle.trim(),
        description: bugDesc.trim(),
        stepsToReproduce: bugSteps.trim(),
        severity: bugSeverity,
        requirementId: bugReqId || null,
        testCaseId: bugTestId || null,
        affectedFiles: activeFile ? [{ fileId: activeFile._id, filePath: activeFile.path }] : [],
      });
      toast.success("Bug report created");
      setCreateBugModalOpen(false);
      setBugTitle("");
      setBugDesc("");
      setBugSteps("");
      setBugTestId("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBugStatusChange = async (bugId, newStatus) => {
    if (!canEdit) return;
    try {
      const updated = await updateBug(projectId, bugId, { status: newStatus });
      if (selectedBug?._id === bugId) setSelectedBug(updated);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleLinkActiveFileToBug = async (bugId) => {
    if (!activeFile) {
      toast.error("No file is currently active in the editor");
      return;
    }
    try {
      await linkFileToBug(projectId, bugId, activeFile._id, activeFile.path);
      toast.success(`Linked ${activeFile.name} to bug`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUnlinkFileFromBug = async (bugId, fileId) => {
    try {
      await unlinkFileFromBug(projectId, bugId, fileId);
      toast.success("File unlinked");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenFile = (fileRef) => {
    const fId = fileRef.fileId?._id || fileRef.fileId;
    const file = files.find((f) => f._id === fId);
    if (file) {
      openFile(file);
      toast.success(`Opened ${file.name}`);
    } else {
      toast.error("File not found in project");
    }
  };

  const handleDeleteBug = async (bugId) => {
    if (!confirm("Delete this bug report?")) return;
    try {
      await deleteBug(projectId, bugId);
      toast.success("Bug deleted");
      if (selectedBug?._id === bugId) setSelectedBug(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleFileBugFromTest = (test) => {
    setBugTitle(`Bug: ${test.title} failed`);
    setBugDesc(`Discovered during test run. Preconditions: ${test.preconditions || "None"}`);
    setBugTestId(test._id);
    setBugReqId(test.requirementId?._id || test.requirementId || "");
    setActiveTab("bugs");
    setCreateBugModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-bg-panel text-text-primary select-none text-xs">
      {/* Header & Sub-nav Tabs */}
      <div className="h-9 px-2 border-b border-border flex items-center justify-between shrink-0 bg-bg-panel">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab("tests");
              setStatusFilter("all");
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === "tests" ? "bg-bg-elevated text-accent" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <FlaskConical size={13} />
            Tests ({testCases.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("bugs");
              setStatusFilter("all");
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === "bugs" ? "bg-bg-elevated text-status-error" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Bug size={13} />
            Bugs ({bugs.length})
          </button>
        </div>

        {canEdit && (
          <button
            onClick={() => (activeTab === "tests" ? setCreateTestModalOpen(true) : setCreateBugModalOpen(true))}
            className="p-1 hover:bg-bg-elevated rounded text-text-secondary hover:text-text-primary transition-colors"
            title={activeTab === "tests" ? "New Test Case" : "Report Bug"}
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="p-2 border-b border-border/50 flex flex-col gap-1.5 shrink-0 bg-bg-base/40">
        <div className="relative">
          <Search size={13} className="absolute left-2 top-2 text-text-muted" />
          <input
            type="text"
            placeholder={activeTab === "tests" ? "Filter tests..." : "Filter bugs..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-elevated border border-border-subtle rounded pl-7 pr-2 py-1 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-1">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 bg-bg-elevated border border-border-subtle rounded px-1.5 py-0.5 text-[10px] text-text-secondary outline-none"
          >
            <option value="all">All Statuses</option>
            {activeTab === "tests"
              ? Object.entries(TEST_STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))
              : Object.keys(BUG_STATUS_CONFIG).map((k) => (
                  <option key={k} value={k} className="capitalize">{k.replace("_", " ")}</option>
                ))}
          </select>
        </div>
      </div>

      {/* ==================== TESTS TAB ==================== */}
      {activeTab === "tests" && (
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/30">
          {isLoadingTests && testCases.length === 0 ? (
            <div className="p-4 text-center text-text-muted">Loading test cases…</div>
          ) : filteredTests.length === 0 ? (
            <div className="p-6 text-center text-text-muted flex flex-col items-center gap-2">
              <FlaskConical size={24} className="opacity-40" />
              <p className="text-[11px]">No test cases found.</p>
              {canEdit && (
                <button
                  onClick={() => setCreateTestModalOpen(true)}
                  className="text-accent hover:underline text-[11px]"
                >
                  + Create test case
                </button>
              )}
            </div>
          ) : (
            filteredTests.map((test) => {
              const statusCfg = TEST_STATUS_CONFIG[test.status] || TEST_STATUS_CONFIG.draft;
              const StatusIcon = statusCfg.icon;
              const isSelected = selectedTest?._id === test._id;

              return (
                <div
                  key={test._id}
                  onClick={() => setSelectedTest(test)}
                  className={`p-2.5 cursor-pointer hover:bg-bg-elevated/60 transition-colors ${
                    isSelected ? "bg-bg-elevated border-l-2 border-accent" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-medium text-text-primary truncate flex-1 leading-tight">
                      {test.title}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] uppercase tracking-wider flex items-center gap-1 shrink-0 ${statusCfg.color}`}>
                      <StatusIcon size={10} />
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-text-muted mb-1.5">
                    <span className="capitalize px-1 rounded bg-bg-base/70 border border-border-subtle text-[9px]">
                      {test.type}
                    </span>
                    <span className="capitalize">{test.priority} priority</span>
                    {test.steps?.length > 0 && <span>{test.steps.length} steps</span>}

                    {test.requirementId && (
                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] truncate max-w-[120px]">
                        <Layers size={9} />
                        <span className="truncate">{test.requirementId.title}</span>
                      </span>
                    )}
                  </div>

                  {/* Quick Execution Buttons */}
                  {canEdit && (
                    <div className="flex items-center gap-1 mt-1 pt-1 border-t border-border/20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunTest(test._id, "passed");
                        }}
                        className="flex-1 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium"
                      >
                        ✔ Pass
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunTest(test._id, "failed");
                        }}
                        className="flex-1 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-medium"
                      >
                        ✕ Fail
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunTest(test._id, "blocked");
                        }}
                        className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]"
                      >
                        Block
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==================== BUGS TAB ==================== */}
      {activeTab === "bugs" && (
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/30">
          {isLoadingBugs && bugs.length === 0 ? (
            <div className="p-4 text-center text-text-muted">Loading bug reports…</div>
          ) : filteredBugs.length === 0 ? (
            <div className="p-6 text-center text-text-muted flex flex-col items-center gap-2">
              <Bug size={24} className="opacity-40" />
              <p className="text-[11px]">No bugs reported.</p>
              {canEdit && (
                <button
                  onClick={() => setCreateBugModalOpen(true)}
                  className="text-status-error hover:underline text-[11px]"
                >
                  + Report first bug
                </button>
              )}
            </div>
          ) : (
            filteredBugs.map((bug) => {
              const isSelected = selectedBug?._id === bug._id;

              return (
                <div
                  key={bug._id}
                  onClick={() => setSelectedBug(bug)}
                  className={`p-2.5 cursor-pointer hover:bg-bg-elevated/60 transition-colors ${
                    isSelected ? "bg-bg-elevated border-l-2 border-status-error" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-medium text-text-primary truncate flex-1 leading-tight">
                      {bug.title}
                    </span>
                    <select
                      value={bug.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleBugStatusChange(bug._id, e.target.value);
                      }}
                      disabled={!canEdit}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-1 py-0.2 rounded border text-[9px] uppercase tracking-wider outline-none cursor-pointer ${
                        BUG_STATUS_CONFIG[bug.status] || ""
                      }`}
                    >
                      {Object.keys(BUG_STATUS_CONFIG).map((k) => (
                        <option key={k} value={k} className="bg-bg-panel text-text-primary">
                          {k.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5 text-[10px] mb-1.5">
                    <span className={`px-1 rounded border text-[9px] uppercase ${BUG_SEVERITY_CONFIG[bug.severity] || ""}`}>
                      {bug.severity}
                    </span>

                    {bug.requirementId && (
                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] truncate max-w-[120px]">
                        <Layers size={9} />
                        <span className="truncate">{bug.requirementId.title}</span>
                      </span>
                    )}

                    {bug.testCaseId && (
                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] truncate max-w-[120px]">
                        <FlaskConical size={9} />
                        <span className="truncate">{bug.testCaseId.title}</span>
                      </span>
                    )}
                  </div>

                  {/* Affected Files */}
                  {bug.affectedFiles && bug.affectedFiles.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1 mt-1">
                      {bug.affectedFiles.map((f, i) => (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFile(f);
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-panel hover:bg-bg-base border border-border-subtle text-[9px] text-text-secondary hover:text-accent font-mono transition-colors"
                        >
                          <FileCode size={10} className="text-status-error" />
                          <span className="truncate max-w-[110px]">{f.filePath.split("/").pop()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Selected Test Detail Drawer */}
      {selectedTest && activeTab === "tests" && (
        <div className="p-3 border-t border-border bg-bg-elevated/95 shrink-0 max-h-72 overflow-y-auto">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`px-1.5 py-0.2 rounded border text-[9px] uppercase ${TEST_STATUS_CONFIG[selectedTest.status]?.color}`}>
                  {selectedTest.status}
                </span>
                <span className="capitalize text-[10px] text-text-secondary">{selectedTest.priority} priority</span>
              </div>
              <h4 className="font-semibold text-text-primary text-xs leading-snug">{selectedTest.title}</h4>
            </div>
            <div className="flex items-center gap-1">
              {canEdit && (
                <button
                  onClick={() => handleDeleteTest(selectedTest._id)}
                  className="text-text-muted hover:text-status-error p-1"
                  title="Delete Test Case"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setSelectedTest(null)}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {selectedTest.description && (
            <p className="text-[11px] text-text-secondary mb-2">{selectedTest.description}</p>
          )}

          {selectedTest.preconditions && (
            <div className="p-1.5 mb-2 rounded bg-bg-panel border border-border-subtle text-[10px]">
              <span className="font-semibold text-text-muted uppercase block">Preconditions</span>
              <span className="text-text-secondary">{selectedTest.preconditions}</span>
            </div>
          )}

          {/* Steps */}
          {selectedTest.steps && selectedTest.steps.length > 0 && (
            <div className="mb-2">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-text-muted block mb-1">
                Steps ({selectedTest.steps.length})
              </span>
              <div className="space-y-1">
                {selectedTest.steps.map((s, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-bg-panel border border-border-subtle text-[11px]">
                    <div className="font-medium text-text-primary mb-0.5">
                      {idx + 1}. {s.action}
                    </div>
                    {s.expectedResult && (
                      <div className="text-[10px] text-text-muted">
                        Expected: <span className="text-text-secondary">{s.expectedResult}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traceability: Requirement */}
          {selectedTest.requirementId && (
            <div className="mb-2 p-1.5 rounded bg-bg-panel border border-border-subtle text-[10px]">
              <span className="text-text-muted uppercase font-semibold block mb-0.5">Linked Requirement</span>
              <span className="text-text-primary font-medium">{selectedTest.requirementId.title}</span>
            </div>
          )}

          {/* Action to file bug if failed */}
          {canEdit && selectedTest.status === "failed" && (
            <button
              onClick={() => handleFileBugFromTest(selectedTest)}
              className="w-full mt-2 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded text-[11px] font-medium flex items-center justify-center gap-1.5"
            >
              <Bug size={12} />
              File Bug from this Failure
            </button>
          )}
        </div>
      )}

      {/* Selected Bug Detail Drawer */}
      {selectedBug && activeTab === "bugs" && (
        <div className="p-3 border-t border-border bg-bg-elevated/95 shrink-0 max-h-72 overflow-y-auto">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`px-1.5 py-0.2 rounded border text-[9px] uppercase ${BUG_SEVERITY_CONFIG[selectedBug.severity]}`}>
                  {selectedBug.severity}
                </span>
                <span className={`px-1.5 py-0.2 rounded border text-[9px] uppercase ${BUG_STATUS_CONFIG[selectedBug.status]}`}>
                  {selectedBug.status}
                </span>
              </div>
              <h4 className="font-semibold text-text-primary text-xs leading-snug">{selectedBug.title}</h4>
            </div>
            <div className="flex items-center gap-1">
              {canEdit && (
                <button
                  onClick={() => handleDeleteBug(selectedBug._id)}
                  className="text-text-muted hover:text-status-error p-1"
                  title="Delete Bug"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setSelectedBug(null)}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {selectedBug.description && (
            <p className="text-[11px] text-text-secondary mb-2">{selectedBug.description}</p>
          )}

          {selectedBug.stepsToReproduce && (
            <div className="p-1.5 mb-2 rounded bg-bg-panel border border-border-subtle text-[10px]">
              <span className="font-semibold text-text-muted uppercase block">Steps to Reproduce</span>
              <pre className="text-text-secondary font-mono whitespace-pre-wrap">{selectedBug.stepsToReproduce}</pre>
            </div>
          )}

          {/* Traceability: Affected Files */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Affected Files ({selectedBug.affectedFiles?.length || 0})
              </span>
              {canEdit && activeFile && (
                <button
                  onClick={() => handleLinkActiveFileToBug(selectedBug._id)}
                  title={`Link currently open file (${activeFile.name})`}
                  className="flex items-center gap-1 text-[10px] text-accent hover:underline"
                >
                  <Link2 size={10} />
                  Link Active File
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1">
              {(selectedBug.affectedFiles || []).length === 0 ? (
                <span className="text-[10px] text-text-muted italic">No affected files linked.</span>
              ) : (
                selectedBug.affectedFiles.map((fileRef, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2 py-1 bg-bg-panel rounded border border-border-subtle text-[11px]"
                  >
                    <button
                      onClick={() => handleOpenFile(fileRef)}
                      className="flex items-center gap-1.5 text-text-secondary hover:text-accent font-mono truncate"
                      title="Open file in editor"
                    >
                      <FileCode size={12} className="text-status-error shrink-0" />
                      <span className="truncate">{fileRef.filePath}</span>
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleUnlinkFileFromBug(selectedBug._id, fileRef.fileId?._id || fileRef.fileId)}
                        className="text-text-muted hover:text-status-error ml-2"
                        title="Unlink file"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE TEST MODAL ==================== */}
      {createTestModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-bg-panel border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
              <div className="h-10 px-4 border-b border-border flex items-center justify-between bg-bg-elevated">
                <span className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                  <FlaskConical size={15} className="text-accent" />
                  New Test Case
                </span>
                <button
                  onClick={() => setCreateTestModalOpen(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleCreateTestSubmit} className="p-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verify JWT token refresh flow"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Preconditions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. User is registered and logged in"
                    value={testPreconditions}
                    onChange={(e) => setTestPreconditions(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      Type
                    </label>
                    <select
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-xs text-text-primary outline-none"
                    >
                      <option value="manual">Manual</option>
                      <option value="unit">Unit</option>
                      <option value="integration">Integration</option>
                      <option value="e2e">E2E</option>
                      <option value="security">Security</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      Priority
                    </label>
                    <select
                      value={testPriority}
                      onChange={(e) => setTestPriority(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-xs text-text-primary outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      Requirement
                    </label>
                    <select
                      value={testReqId}
                      onChange={(e) => setTestReqId(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-xs text-text-primary outline-none truncate"
                    >
                      <option value="">None</option>
                      {requirements.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Steps Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-text-secondary">
                      Test Steps
                    </label>
                    <button
                      type="button"
                      onClick={handleAddStepRow}
                      className="text-[10px] text-accent hover:underline flex items-center gap-1"
                    >
                      + Add Step
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {testSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted w-4 shrink-0 text-center">{idx + 1}.</span>
                        <input
                          type="text"
                          placeholder="Action..."
                          value={step.action}
                          onChange={(e) => {
                            const updated = [...testSteps];
                            updated[idx].action = e.target.value;
                            setTestSteps(updated);
                          }}
                          className="flex-1 bg-bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
                        />
                        <input
                          type="text"
                          placeholder="Expected result..."
                          value={step.expectedResult}
                          onChange={(e) => {
                            const updated = [...testSteps];
                            updated[idx].expectedResult = e.target.value;
                            setTestSteps(updated);
                          }}
                          className="flex-1 bg-bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
                        />
                        {testSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setTestSteps(testSteps.filter((_, i) => i !== idx))}
                            className="text-text-muted hover:text-status-error px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setCreateTestModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white font-medium text-xs rounded transition-colors"
                  >
                    Create Test Case
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ==================== CREATE BUG MODAL ==================== */}
      {createBugModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-bg-panel border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
              <div className="h-10 px-4 border-b border-border flex items-center justify-between bg-bg-elevated">
                <span className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                  <Bug size={15} className="text-status-error" />
                  Report Bug
                </span>
                <button
                  onClick={() => setCreateBugModalOpen(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleCreateBugSubmit} className="p-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Bug Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Expired JWT returns 500 instead of 401"
                    value={bugTitle}
                    onChange={(e) => setBugTitle(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Steps to Reproduce
                  </label>
                  <textarea
                    rows={3}
                    placeholder="1. Login&#10;2. Wait for token expiry&#10;3. Request /api/files..."
                    value={bugSteps}
                    onChange={(e) => setBugSteps(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent resize-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      Severity
                    </label>
                    <select
                      value={bugSeverity}
                      onChange={(e) => setBugSeverity(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-xs text-text-primary outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      Requirement
                    </label>
                    <select
                      value={bugReqId}
                      onChange={(e) => setBugReqId(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-xs text-text-primary outline-none truncate"
                    >
                      <option value="">None</option>
                      {requirements.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeFile && (
                  <div className="p-2 rounded bg-bg-elevated border border-border-subtle flex items-center justify-between text-[11px] text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <Link2 size={12} className="text-status-error" />
                      Auto-link active file: <code className="text-text-primary font-mono">{activeFile.name}</code>
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setCreateBugModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-status-error hover:bg-red-600 text-white font-medium text-xs rounded transition-colors"
                  >
                    Report Bug
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
