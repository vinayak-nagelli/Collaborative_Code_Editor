import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  FileCode,
  Link2,
  AlertTriangle,
  Clock,
  Trash2,
  X,
  ExternalLink,
  ChevronDown,
  Layers,
  ListTodo,
} from "lucide-react";
import toast from "react-hot-toast";
import useTaskStore from "../store/taskStore";
import useRequirementStore from "../store/requirementStore";
import useFileStore from "../store/fileStore";
import useEditorStore from "../store/editorStore";
import UserAvatar from "./UserAvatar";

const STATUS_COLUMNS = [
  { id: "todo", label: "To Do", color: "border-zinc-500/30 text-zinc-400 bg-zinc-500/10" },
  { id: "in_progress", label: "In Progress", color: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  { id: "in_review", label: "Review", color: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
  { id: "blocked", label: "Blocked", color: "border-red-500/30 text-red-400 bg-red-500/10" },
  { id: "done", label: "Done", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
];

const PRIORITY_BADGES = {
  low: "text-zinc-400 bg-zinc-500/10 border-zinc-600/30",
  medium: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  high: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  urgent: "text-red-400 bg-red-500/15 border-red-500/30 font-semibold",
};

export default function TasksPanel({ projectId, canEdit }) {
  const {
    tasks,
    fetchTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    linkFile,
    unlinkFile,
    deleteTask,
    isLoading,
  } = useTaskStore();

  const { requirements, fetchRequirements } = useRequirementStore();
  const { files } = useFileStore();
  const { openFile, activeFileId, openTabs } = useEditorStore();

  const [search, setSearch] = useState("");
  const [selectedReqFilter, setSelectedReqFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [tempBlockerReason, setTempBlockerReason] = useState("");
  const [taskToBlock, setTaskToBlock] = useState(null);

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newRequirementId, setNewRequirementId] = useState("");
  const [newStatus, setNewStatus] = useState("todo");

  useEffect(() => {
    if (projectId) {
      fetchTasks(projectId);
      fetchRequirements(projectId);
    }
  }, [projectId, fetchTasks, fetchRequirements]);

  const activeFile = files.find((f) => f._id === activeFileId);

  const filteredTasks = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedReqFilter !== "all") {
      const rId = t.requirementId?._id || t.requirementId;
      if (rId !== selectedReqFilter) return false;
    }
    if (selectedStatusFilter !== "all" && t.status !== selectedStatusFilter) {
      return false;
    }
    return true;
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    try {
      await createTask(projectId, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        requirementId: newRequirementId || null,
        status: newStatus,
        linkedFiles: activeFile ? [{ fileId: activeFile._id, filePath: activeFile.path }] : [],
      });
      toast.success("Task created");
      setModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewRequirementId("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (taskId, newStatusValue) => {
    if (!canEdit) return;
    if (newStatusValue === "blocked") {
      setTaskToBlock(taskId);
      setTempBlockerReason("");
      setBlockerModalOpen(true);
      return;
    }
    try {
      await updateTaskStatus(projectId, taskId, newStatusValue);
      toast.success("Status updated");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleConfirmBlocker = async () => {
    if (!taskToBlock) return;
    try {
      await updateTask(projectId, taskToBlock, {
        status: "blocked",
        blockerReason: tempBlockerReason.trim() || "Blocked (no reason specified)",
      });
      setBlockerModalOpen(false);
      setTaskToBlock(null);
      toast.success("Task marked as blocked");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleLinkActiveFile = async (taskId) => {
    if (!activeFile) {
      toast.error("No file is currently active in the editor");
      return;
    }
    try {
      await linkFile(projectId, taskId, activeFile._id, activeFile.path);
      toast.success(`Linked ${activeFile.name} to task`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUnlinkFile = async (taskId, fileId) => {
    try {
      await unlinkFile(projectId, taskId, fileId);
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

  const handleDelete = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask(projectId, taskId);
      toast.success("Task deleted");
      if (selectedTask?._id === taskId) setSelectedTask(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-panel text-text-primary select-none text-xs">
      {/* Header */}
      <div className="h-9 px-3 border-b border-border flex items-center justify-between shrink-0">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-text-secondary flex items-center gap-1.5">
          <CheckSquare size={14} className="text-accent" />
          Tasks & Traceability
        </span>
        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              onClick={() => setModalOpen(true)}
              className="p-1 hover:bg-bg-elevated rounded text-text-secondary hover:text-text-primary transition-colors"
              title="Add Task"
            >
              <Plus size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-2 border-b border-border/50 flex flex-col gap-1.5 shrink-0 bg-bg-base/40">
        <div className="relative">
          <Search size={13} className="absolute left-2 top-2 text-text-muted" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-elevated border border-border-subtle rounded pl-7 pr-2 py-1 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-1">
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="flex-1 bg-bg-elevated border border-border-subtle rounded px-1.5 py-0.5 text-[10px] text-text-secondary outline-none"
          >
            <option value="all">All Statuses</option>
            {STATUS_COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select
            value={selectedReqFilter}
            onChange={(e) => setSelectedReqFilter(e.target.value)}
            className="flex-1 bg-bg-elevated border border-border-subtle rounded px-1.5 py-0.5 text-[10px] text-text-secondary outline-none truncate"
          >
            <option value="all">All Requirements</option>
            {requirements.map((r) => (
              <option key={r._id} value={r._id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/30">
        {isLoading && tasks.length === 0 ? (
          <div className="p-4 text-center text-text-muted">Loading tasks…</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-6 text-center text-text-muted flex flex-col items-center gap-2">
            <ListTodo size={24} className="opacity-40" />
            <p className="text-[11px]">No tasks found.</p>
            {canEdit && (
              <button
                onClick={() => setModalOpen(true)}
                className="text-accent hover:underline text-[11px]"
              >
                + Create task
              </button>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const req = task.requirementId;
            const isSelected = selectedTask?._id === task._id;

            return (
              <div
                key={task._id}
                onClick={() => setSelectedTask(task)}
                className={`p-2.5 cursor-pointer hover:bg-bg-elevated/60 transition-colors ${
                  isSelected ? "bg-bg-elevated border-l-2 border-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className={`font-medium text-text-primary truncate flex-1 leading-tight ${task.status === "done" ? "line-through text-text-muted" : ""}`}>
                    {task.title}
                  </span>
                  <select
                    value={task.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleStatusChange(task._id, e.target.value);
                    }}
                    disabled={!canEdit}
                    onClick={(e) => e.stopPropagation()}
                    className={`px-1 py-0.5 rounded border text-[9px] uppercase tracking-wider outline-none cursor-pointer ${
                      STATUS_COLUMNS.find((c) => c.id === task.status)?.color || ""
                    }`}
                  >
                    {STATUS_COLUMNS.map((c) => (
                      <option key={c.id} value={c.id} className="bg-bg-panel text-text-primary">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority & Requirement Badges */}
                <div className="flex items-center flex-wrap gap-1.5 text-[10px] mb-1.5">
                  <span className={`px-1 rounded border text-[9px] capitalize ${PRIORITY_BADGES[task.priority] || ""}`}>
                    {task.priority}
                  </span>

                  {req && (
                    <span
                      title={`Requirement: ${req.title}`}
                      className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] truncate max-w-[130px]"
                    >
                      <Layers size={9} />
                      <span className="truncate">{req.title}</span>
                    </span>
                  )}

                  {task.status === "blocked" && task.blockerReason && (
                    <span
                      title={task.blockerReason}
                      className="flex items-center gap-1 text-status-error text-[9px]"
                    >
                      <AlertTriangle size={10} />
                      Blocked
                    </span>
                  )}
                </div>

                {/* Linked Code Files (Traceability) */}
                {task.linkedFiles && task.linkedFiles.length > 0 && (
                  <div className="flex items-center flex-wrap gap-1 mt-1">
                    {task.linkedFiles.map((f, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFile(f);
                        }}
                        title={`Open file: ${f.filePath}`}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-panel hover:bg-bg-base border border-border-subtle text-[9px] text-text-secondary hover:text-accent font-mono transition-colors"
                      >
                        <FileCode size={10} className="text-accent" />
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

      {/* Task Details Drawer */}
      {selectedTask && (
        <div className="p-3 border-t border-border bg-bg-elevated/95 shrink-0 max-h-72 overflow-y-auto">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`px-1.5 py-0.2 rounded border text-[9px] uppercase ${STATUS_COLUMNS.find((c) => c.id === selectedTask.status)?.color}`}>
                  {selectedTask.status}
                </span>
                <span className={`px-1.5 py-0.2 rounded border text-[9px] capitalize ${PRIORITY_BADGES[selectedTask.priority]}`}>
                  {selectedTask.priority}
                </span>
              </div>
              <h4 className="font-semibold text-text-primary text-xs leading-snug">{selectedTask.title}</h4>
            </div>
            <div className="flex items-center gap-1">
              {canEdit && (
                <button
                  onClick={() => handleDelete(selectedTask._id)}
                  className="text-text-muted hover:text-status-error p-1"
                  title="Delete Task"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setSelectedTask(null)}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {selectedTask.description && (
            <p className="text-[11px] text-text-secondary mb-2 leading-relaxed">
              {selectedTask.description}
            </p>
          )}

          {selectedTask.status === "blocked" && selectedTask.blockerReason && (
            <div className="p-2 mb-2 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] flex items-start gap-1.5">
              <AlertTriangle size={12} className="shrink-0 mt-0.5 text-status-error" />
              <div>
                <span className="font-semibold block">Blocker:</span>
                {selectedTask.blockerReason}
              </div>
            </div>
          )}

          {/* Traceability: Requirement */}
          {selectedTask.requirementId && (
            <div className="mb-2 p-1.5 rounded bg-bg-panel border border-border-subtle">
              <span className="text-[9px] text-text-muted uppercase font-semibold block mb-0.5">
                Linked Requirement
              </span>
              <span className="text-[11px] text-text-primary font-medium">
                {selectedTask.requirementId.title || "Requirement"}
              </span>
            </div>
          )}

          {/* Traceability: Linked Code Files */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Linked Code Files ({selectedTask.linkedFiles?.length || 0})
              </span>
              {canEdit && activeFile && (
                <button
                  onClick={() => handleLinkActiveFile(selectedTask._id)}
                  title={`Link currently open file (${activeFile.name})`}
                  className="flex items-center gap-1 text-[10px] text-accent hover:underline"
                >
                  <Link2 size={10} />
                  Link Active File
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1">
              {(selectedTask.linkedFiles || []).length === 0 ? (
                <span className="text-[10px] text-text-muted italic">No files linked yet.</span>
              ) : (
                selectedTask.linkedFiles.map((fileRef, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2 py-1 bg-bg-panel rounded border border-border-subtle text-[11px]"
                  >
                    <button
                      onClick={() => handleOpenFile(fileRef)}
                      className="flex items-center gap-1.5 text-text-secondary hover:text-accent font-mono truncate"
                      title="Open file in editor"
                    >
                      <FileCode size={12} className="text-accent shrink-0" />
                      <span className="truncate">{fileRef.filePath}</span>
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleUnlinkFile(selectedTask._id, fileRef.fileId?._id || fileRef.fileId)}
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

      {/* New Task Modal */}
      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-bg-panel border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
              <div className="h-10 px-4 border-b border-border flex items-center justify-between bg-bg-elevated">
                <span className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                  <CheckSquare size={15} className="text-accent" />
                  New Task
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
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Write JWT auth unit test suite"
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
                    rows={2}
                    placeholder="Implementation notes, AC references..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      Link to Requirement
                    </label>
                    <select
                      value={newRequirementId}
                      onChange={(e) => setNewRequirementId(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none truncate"
                    >
                      <option value="">None (Independent)</option>
                      {requirements.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.title}
                        </option>
                      ))}
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

                {activeFile && (
                  <div className="p-2 rounded bg-bg-elevated border border-border-subtle flex items-center justify-between text-[11px] text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <Link2 size={12} className="text-accent" />
                      Auto-link active file: <code className="text-text-primary font-mono">{activeFile.name}</code>
                    </span>
                  </div>
                )}

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
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Mark as Blocked Modal */}
      {blockerModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-bg-panel border border-border rounded-lg shadow-xl p-4 flex flex-col gap-3">
              <h4 className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-status-error" />
                Specify Blocker Reason
              </h4>
              <input
                type="text"
                placeholder="e.g. Waiting on Redis dependency / API spec"
                value={tempBlockerReason}
                onChange={(e) => setTempBlockerReason(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBlockerModalOpen(false)}
                  className="px-3 py-1 text-xs text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBlocker}
                  className="px-3 py-1 bg-status-error hover:bg-red-600 text-white font-medium text-xs rounded"
                >
                  Mark Blocked
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
