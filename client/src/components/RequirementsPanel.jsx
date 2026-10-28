import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ListChecks,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  Trash2,
  X,
  FileCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import useRequirementStore from "../store/requirementStore";
import useTaskStore from "../store/taskStore";
import UserAvatar from "./UserAvatar";

const TYPE_COLORS = {
  feature: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  bugfix: "bg-red-500/15 text-red-400 border-red-500/30",
  improvement: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  technical: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const STATUS_COLORS = {
  draft: "bg-zinc-500/20 text-zinc-400 border-zinc-600/30",
  active: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  implemented: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  verified: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  closed: "bg-zinc-700/30 text-zinc-500 border-zinc-700/30",
};

const PRIORITY_COLORS = {
  low: "text-zinc-400",
  medium: "text-blue-400",
  high: "text-amber-400",
  urgent: "text-red-400 font-semibold",
};

export default function RequirementsPanel({ projectId, canEdit, onOpenTaskBoard }) {
  const {
    requirements,
    fetchRequirements,
    createRequirement,
    updateRequirement,
    toggleCriterion,
    deleteRequirement,
    isLoading,
  } = useRequirementStore();

  const { createTask } = useTaskStore();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [newCriteriaText, setNewCriteriaText] = useState("");

  // New requirement form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("feature");
  const [newPriority, setNewPriority] = useState("medium");
  const [newCriteriaList, setNewCriteriaList] = useState([]);
  const [tempCriterion, setTempCriterion] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchRequirements(projectId);
    }
  }, [projectId, fetchRequirements]);

  const filtered = requirements.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const handleAddCriterionToNew = () => {
    if (!tempCriterion.trim()) return;
    setNewCriteriaList([...newCriteriaList, { text: tempCriterion.trim(), completed: false }]);
    setTempCriterion("");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    try {
      await createRequirement(projectId, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        type: newType,
        priority: newPriority,
        acceptanceCriteria: newCriteriaList,
      });
      toast.success("Requirement created");
      setModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewCriteriaList([]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddCriterionToExisting = async () => {
    if (!newCriteriaText.trim() || !selectedReq) return;
    const updatedCriteria = [
      ...(selectedReq.acceptanceCriteria || []),
      { text: newCriteriaText.trim(), completed: false },
    ];
    try {
      const updated = await updateRequirement(projectId, selectedReq._id, {
        acceptanceCriteria: updatedCriteria,
      });
      setSelectedReq(updated);
      setNewCriteriaText("");
      toast.success("Criterion added");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleCriterion = async (critId) => {
    if (!canEdit || !selectedReq) return;
    try {
      const updated = await toggleCriterion(projectId, selectedReq._id, critId);
      setSelectedReq(updated);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedReq || !canEdit) return;
    try {
      const updated = await updateRequirement(projectId, selectedReq._id, { status: newStatus });
      setSelectedReq(updated);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (reqId) => {
    if (!confirm("Are you sure you want to delete this requirement?")) return;
    try {
      await deleteRequirement(projectId, reqId);
      toast.success("Requirement deleted");
      if (selectedReq?._id === reqId) setSelectedReq(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-panel text-text-primary select-none text-xs">
      {/* Header */}
      <div className="h-9 px-3 border-b border-border flex items-center justify-between shrink-0">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-text-secondary flex items-center gap-1.5">
          <ListChecks size={14} className="text-accent" />
          Requirements
        </span>
        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              onClick={() => setModalOpen(true)}
              className="p-1 hover:bg-bg-elevated rounded text-text-secondary hover:text-text-primary transition-colors"
              title="Add Requirement"
            >
              <Plus size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-2 border-b border-border/50 flex flex-col gap-1.5 shrink-0 bg-bg-base/40">
        <div className="relative">
          <Search size={13} className="absolute left-2 top-2 text-text-muted" />
          <input
            type="text"
            placeholder="Filter requirements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-elevated border border-border-subtle rounded pl-7 pr-2 py-1 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-1">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-bg-elevated border border-border-subtle rounded px-1.5 py-0.5 text-[10px] text-text-secondary outline-none"
          >
            <option value="all">All Types</option>
            <option value="feature">Feature</option>
            <option value="bugfix">Bugfix</option>
            <option value="improvement">Improvement</option>
            <option value="technical">Technical</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-bg-elevated border border-border-subtle rounded px-1.5 py-0.5 text-[10px] text-text-secondary outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="implemented">Implemented</option>
            <option value="verified">Verified</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Requirements List */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/30">
        {isLoading && requirements.length === 0 ? (
          <div className="p-4 text-center text-text-muted">Loading requirements…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-text-muted flex flex-col items-center gap-2">
            <Layers size={24} className="opacity-40" />
            <p className="text-[11px]">No requirements found.</p>
            {canEdit && (
              <button
                onClick={() => setModalOpen(true)}
                className="text-accent hover:underline text-[11px]"
              >
                + Create first requirement
              </button>
            )}
          </div>
        ) : (
          filtered.map((req) => {
            const completedCriteria = req.acceptanceCriteria?.filter((c) => c.completed).length || 0;
            const totalCriteria = req.acceptanceCriteria?.length || 0;
            const isSelected = selectedReq?._id === req._id;

            return (
              <div
                key={req._id}
                onClick={() => setSelectedReq(req)}
                className={`p-2.5 cursor-pointer hover:bg-bg-elevated/60 transition-colors ${
                  isSelected ? "bg-bg-elevated border-l-2 border-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="font-medium text-text-primary truncate flex-1 leading-tight">
                    {req.title}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded border text-[9px] uppercase tracking-wider shrink-0 ${
                      STATUS_COLORS[req.status] || "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-text-muted mb-1.5">
                  <span
                    className={`px-1 rounded border text-[9px] capitalize ${
                      TYPE_COLORS[req.type] || ""
                    }`}
                  >
                    {req.type}
                  </span>
                  <span className={`capitalize ${PRIORITY_COLORS[req.priority]}`}>
                    {req.priority}
                  </span>
                  {totalCriteria > 0 && (
                    <span className="flex items-center gap-1 text-[10px]">
                      <CheckCircle2 size={10} className="text-emerald-400" />
                      {completedCriteria}/{totalCriteria}
                    </span>
                  )}
                </div>

                {req.taskStats && req.taskStats.total > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <div className="flex-1 h-1 bg-border rounded-full overflow-hidden flex">
                      <div
                        style={{
                          width: `${(req.taskStats.done / req.taskStats.total) * 100}%`,
                        }}
                        className="bg-emerald-500 h-full"
                        title={`${req.taskStats.done} Done`}
                      />
                      <div
                        style={{
                          width: `${(req.taskStats.in_progress / req.taskStats.total) * 100}%`,
                        }}
                        className="bg-blue-500 h-full"
                        title={`${req.taskStats.in_progress} In Progress`}
                      />
                    </div>
                    <span>{req.taskStats.done}/{req.taskStats.total} tasks</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detail Slideover / Modal for Selected Requirement */}
      {selectedReq && (
        <div className="p-3 border-t border-border bg-bg-elevated/95 shrink-0 max-h-72 overflow-y-auto">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-1.5 py-0.5 rounded border text-[9px] uppercase font-medium ${TYPE_COLORS[selectedReq.type]}`}>
                  {selectedReq.type}
                </span>
                <select
                  value={selectedReq.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={!canEdit}
                  className="bg-bg-panel border border-border-subtle rounded text-[10px] px-1.5 py-0.5 text-text-secondary outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="implemented">Implemented</option>
                  <option value="verified">Verified</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <h4 className="font-semibold text-text-primary text-xs">{selectedReq.title}</h4>
            </div>
            <div className="flex items-center gap-1">
              {canEdit && (
                <button
                  onClick={() => handleDelete(selectedReq._id)}
                  className="text-text-muted hover:text-status-error p-1"
                  title="Delete Requirement"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setSelectedReq(null)}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {selectedReq.description && (
            <p className="text-[11px] text-text-secondary mb-3 leading-relaxed">
              {selectedReq.description}
            </p>
          )}

          {/* Acceptance Criteria */}
          <div className="mb-3">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-text-muted block mb-1.5">
              Acceptance Criteria
            </span>
            <div className="flex flex-col gap-1">
              {(selectedReq.acceptanceCriteria || []).map((crit) => (
                <div
                  key={crit.id}
                  onClick={() => handleToggleCriterion(crit.id)}
                  className={`flex items-start gap-1.5 p-1 rounded hover:bg-bg-panel cursor-pointer text-[11px] ${
                    crit.completed ? "text-text-muted line-through" : "text-text-primary"
                  }`}
                >
                  {crit.completed ? (
                    <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <Circle size={13} className="text-text-muted mt-0.5 shrink-0" />
                  )}
                  <span>{crit.text}</span>
                </div>
              ))}

              {canEdit && (
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="text"
                    placeholder="Add criterion..."
                    value={newCriteriaText}
                    onChange={(e) => setNewCriteriaText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCriterionToExisting()}
                    className="flex-1 bg-bg-panel border border-border-subtle rounded px-2 py-0.5 text-[11px] text-text-primary outline-none focus:border-accent"
                  />
                  <button
                    onClick={handleAddCriterionToExisting}
                    className="px-2 py-0.5 bg-accent text-white rounded text-[10px]"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}      {/* Create Requirement Modal */}
      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-bg-panel border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
              <div className="h-10 px-4 border-b border-border flex items-center justify-between bg-bg-elevated">
                <span className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                  <ListChecks size={15} className="text-accent" />
                  New Requirement
                </span>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-4 flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement Google OAuth login"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Details, user stories, background context..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      Type
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none"
                    >
                      <option value="feature">Feature</option>
                      <option value="bugfix">Bugfix</option>
                      <option value="improvement">Improvement</option>
                      <option value="technical">Technical Task</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Acceptance criteria in new modal */}
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Acceptance Criteria
                  </label>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Must support refresh token rotation"
                      value={tempCriterion}
                      onChange={(e) => setTempCriterion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCriterionToNew();
                        }
                      }}
                      className="flex-1 bg-bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={handleAddCriterionToNew}
                      className="px-2.5 py-1 bg-bg-elevated hover:bg-border border border-border-subtle rounded text-xs text-text-primary"
                    >
                      Add
                    </button>
                  </div>
                  {newCriteriaList.length > 0 && (
                    <ul className="space-y-1 max-h-24 overflow-y-auto">
                      {newCriteriaList.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between text-[11px] text-text-secondary bg-bg-base/60 px-2 py-0.5 rounded"
                        >
                          <span className="truncate">{c.text}</span>
                          <button
                            type="button"
                            onClick={() => setNewCriteriaList(newCriteriaList.filter((_, idx) => idx !== i))}
                            className="text-text-muted hover:text-status-error ml-1"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white font-medium text-xs rounded transition-colors"
                  >
                    Create Requirement
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
