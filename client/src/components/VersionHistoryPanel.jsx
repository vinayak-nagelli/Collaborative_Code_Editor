import { useEffect, useState } from "react";
import { History, RotateCcw, X, BookmarkPlus, Eye, EyeOff, ShieldCheck, Clock } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { getSocket } from "../services/socket";

export default function VersionHistoryPanel({ projectId, fileId, fileName, canEdit, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [checkpointMsg, setCheckpointMsg] = useState("");
  const [savingCheckpoint, setSavingCheckpoint] = useState(false);
  const [showCheckpointInput, setShowCheckpointInput] = useState(false);

  const fetchVersions = () => {
    if (!fileId) return;
    setLoading(true);
    api
      .get(`/files/${fileId}/versions`)
      .then(({ data }) => setVersions(data.versions || []))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVersions();
  }, [fileId]);

  const handleCreateCheckpoint = async (e) => {
    e.preventDefault();
    if (!checkpointMsg.trim()) return;
    try {
      setSavingCheckpoint(true);
      await api.post(`/files/${fileId}/snapshot`, { message: checkpointMsg.trim() });
      toast.success("Checkpoint saved! You can revert to this anytime.");
      setCheckpointMsg("");
      setShowCheckpointInput(false);
      fetchVersions();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to create checkpoint");
    } finally {
      setSavingCheckpoint(false);
    }
  };

  const restore = (versionId, isOriginal) => {
    if (!canEdit) return toast.error("Read-only access");
    if (!window.confirm(isOriginal ? "Are you sure you want to revert this file back to its Original Form?" : "Revert file to this previous snapshot? All collaborators will see this change live.")) {
      return;
    }
    setRestoringId(versionId);
    getSocket().emit("restore-version", { projectId, fileId, versionId }, (res) => {
      setRestoringId(null);
      if (!res?.ok) return toast.error(res?.error || "Restore failed");
      toast.success(isOriginal ? "Reverted to Original Form!" : "Reverted to selected snapshot! Merged live for all collaborators.");
      fetchVersions();
    });
  };

  if (!fileId) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-84 bg-bg-panel/95 backdrop-blur-md border-l border-border flex flex-col z-20 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-bg-surface/50">
        <div className="flex items-center gap-2">
          <History size={14} className="text-accent" />
          <span className="text-xs font-semibold text-text-primary tracking-wide">Version Timeline & Revert</span>
        </div>
        <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Active File Subheader & Quick Checkpoint Action */}
      <div className="px-3.5 py-2 border-b border-border bg-bg-elevated/40 flex items-center justify-between gap-2">
        <div className="truncate text-[11px] font-mono text-text-secondary flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {fileName}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCheckpointInput((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover font-medium px-2 py-0.5 rounded bg-accent/10 border border-accent/20 transition-all"
            title="Save manual milestone or baseline to revert later"
          >
            <BookmarkPlus size={11} /> Save Checkpoint
          </button>
        )}
      </div>

      {/* Manual Checkpoint Form */}
      {showCheckpointInput && (
        <form onSubmit={handleCreateCheckpoint} className="p-3 bg-bg-elevated/80 border-b border-border space-y-2 animate-in fade-in duration-150">
          <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Save Checkpoint / Original Form</label>
          <input
            type="text"
            value={checkpointMsg}
            onChange={(e) => setCheckpointMsg(e.target.value)}
            placeholder="e.g. Original Form, Pre-refactor backup"
            className="w-full text-xs px-2.5 py-1.5 rounded bg-bg-surface border border-border focus:border-accent text-text-primary outline-none"
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowCheckpointInput(false)}
              className="text-[11px] px-2 py-1 text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingCheckpoint || !checkpointMsg.trim()}
              className="text-[11px] px-2.5 py-1 bg-accent hover:bg-accent-hover text-white rounded font-medium disabled:opacity-50 transition-colors"
            >
              {savingCheckpoint ? "Saving…" : "Save Snapshot"}
            </button>
          </div>
        </form>
      )}

      {/* Snapshot List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && (
          <div className="p-4 text-center text-xs text-text-muted flex items-center justify-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Loading version history…
          </div>
        )}

        {!loading && versions.length === 0 && (
          <div className="p-6 text-center text-text-muted space-y-2">
            <Clock size={24} className="mx-auto text-text-muted/60" />
            <p className="text-xs">No saved snapshots yet.</p>
            <p className="text-[11px] text-text-muted/80">
              Snapshots are automatically created during collaborative edits, or you can click "Save Checkpoint" above!
            </p>
          </div>
        )}

        {!loading &&
          versions.map((v, idx) => {
            const isOldest = idx === versions.length - 1;
            const isLatest = idx === 0;
            const isPreviewing = previewId === v._id;

            return (
              <div
                key={v._id}
                className={`p-2.5 rounded-lg border transition-all ${
                  isOldest
                    ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50"
                    : "bg-bg-elevated/40 border-border/70 hover:border-border hover:bg-bg-elevated/70"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-text-primary">
                        {new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      {isOldest && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                          Original Form
                        </span>
                      )}
                      {isLatest && versions.length > 1 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent/20 text-accent font-medium">
                          Latest Edit
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {new Date(v.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>

                  {/* Actions: Preview & Revert */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewId(isPreviewing ? null : v._id)}
                      className={`p-1 rounded text-text-muted hover:text-text-primary transition-colors ${isPreviewing ? "bg-bg-hover text-accent" : ""}`}
                      title="Preview snapshot content"
                    >
                      {isPreviewing ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>

                    {canEdit && (
                      <button
                        onClick={() => restore(v._id, isOldest)}
                        disabled={restoringId === v._id}
                        title={isOldest ? "Revert to Original Form" : "Revert file to this state"}
                        className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium transition-all ${
                          isOldest
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                            : "bg-accent/20 hover:bg-accent text-accent hover:text-white border border-accent/30"
                        } disabled:opacity-50`}
                      >
                        <RotateCcw size={11} className={restoringId === v._id ? "animate-spin" : ""} />
                        <span>{isOldest ? "Revert to Original" : "Revert"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Author & Message */}
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: v.editedBy?.color || "#38bdf8" }} />
                    <span className="text-text-secondary font-medium">{v.editedBy?.name || "Collaborator"}</span>
                  </div>
                </div>

                {v.message && (
                  <div className="mt-1 text-[11px] text-accent font-medium italic bg-accent/5 px-2 py-0.5 rounded border border-accent/10">
                    "{v.message}"
                  </div>
                )}

                {/* Collapsible Content Preview */}
                {isPreviewing && (
                  <div className="mt-2 p-2 rounded bg-bg-surface border border-border text-[10px] font-mono text-text-secondary overflow-x-auto max-h-36 whitespace-pre">
                    {v.content || "// (Empty file content)"}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Footer Info Notice */}
      <div className="p-2.5 border-t border-border bg-bg-surface/60 text-[10px] text-text-muted flex items-start gap-1.5">
        <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
        <span>CRDT-Safe Revert: Restoring merges cleanly across all collaborators without desync or data loss.</span>
      </div>
    </div>
  );
}
