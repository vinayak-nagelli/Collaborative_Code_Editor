import { useEffect, useState } from "react";
import { GitCommit, RotateCw, Upload, Download, Link } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

const STATUS_STYLE = { M: "text-status-warning", A: "text-status-success", D: "text-status-error" };

export default function SourceControlPanel({ projectId, canEdit }) {
  const [changes, setChanges] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [log, setLog] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [showRemoteInput, setShowRemoteInput] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/projects/${projectId}/changes`);
      setChanges(data.changes);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadLog = async () => {
    const { data } = await api.get(`/projects/${projectId}/commits`);
    setLog(data.commits);
    setShowLog(true);
  };

  const setRemote = async () => {
    if (!remoteUrl.trim()) return toast.error("Enter a remote URL");
    try {
      const { data } = await api.post(`/projects/${projectId}/git/remote`, { url: remoteUrl.trim() });
      toast.success(`Remote set: ${data.remote}`);
      setShowRemoteInput(false);
      setRemoteUrl("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const doPush = async () => {
    setPushing(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/git/push`, { message: message || "Sync from CollabIDE" });
      toast.success(data.committed ? "Committed and pushed" : "Pushed (nothing new to commit)");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPushing(false);
    }
  };

  const doPull = async () => {
    setPulling(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/git/pull`);
      toast.success(`Pulled — ${data.created} added, ${data.updated} updated`);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPulling(false);
    }
  };

  const commit = async () => {
    if (!message.trim()) return toast.error("Enter a commit message");
    setCommitting(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/commit`, { message });
      toast.success(`Committed ${data.committedFiles} file${data.committedFiles === 1 ? "" : "s"}`);
      setMessage("");
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <span className="text-[11px] font-semibold text-text-secondary tracking-wide uppercase">Source Control</span>
        <button onClick={load} title="Refresh" className="text-text-muted hover:text-text-primary">
          <RotateCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {canEdit && (
        <div className="p-2 border-b border-border space-y-1.5">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message (Ctrl+Enter to commit)"
            rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) commit(); }}
            className="w-full bg-bg-base border border-border-subtle rounded px-2 py-1.5 text-xs outline-none resize-none focus:border-accent"
          />
          <button
            onClick={commit}
            disabled={committing || changes.length === 0}
            className="w-full flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs py-1.5 rounded"
          >
            <GitCommit size={12} />
            Commit {changes.length > 0 ? `(${changes.length})` : ""}
          </button>
          <div className="flex gap-1.5">
            <button
              title="Push — commits any pending changes, then pushes to the configured remote"
              onClick={doPush}
              disabled={pushing}
              className="flex-1 flex items-center justify-center gap-1 border border-border-subtle rounded py-1 text-text-secondary hover:bg-bg-hover disabled:opacity-50"
            >
              <Upload size={11} className={pushing ? "animate-pulse" : ""} /> Push
            </button>
            <button
              title="Pull — fetches and merges from the remote, syncing changes back into the live file tree"
              onClick={doPull}
              disabled={pulling}
              className="flex-1 flex items-center justify-center gap-1 border border-border-subtle rounded py-1 text-text-secondary hover:bg-bg-hover disabled:opacity-50"
            >
              <Download size={11} className={pulling ? "animate-pulse" : ""} /> Pull
            </button>
            <button
              title="Set the git remote URL (supports https://user:token@host/repo.git for authenticated remotes)"
              onClick={() => setShowRemoteInput((v) => !v)}
              className="flex items-center justify-center border border-border-subtle rounded py-1 px-2 text-text-secondary hover:bg-bg-hover"
            >
              <Link size={11} />
            </button>
          </div>
          {showRemoteInput && (
            <div className="flex gap-1.5 pt-1">
              <input
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://user:token@github.com/you/repo.git"
                onKeyDown={(e) => e.key === "Enter" && setRemote()}
                className="flex-1 bg-bg-base border border-border-subtle rounded px-2 py-1 text-[11px] outline-none focus:border-accent"
              />
              <button onClick={setRemote} className="text-[11px] bg-accent hover:bg-accent-hover text-white px-2 rounded">
                Save
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="text-[11px] text-text-muted uppercase tracking-wide">Changes</span>
          <button onClick={loadLog} className="text-[11px] text-accent hover:underline">History</button>
        </div>

        {changes.length === 0 && !loading && (
          <div className="px-2 py-3 text-text-muted text-[11px]">No changes since the last commit.</div>
        )}

        {changes.map((c) => (
          <div key={c.fileId} className="flex items-center gap-2 px-2 py-1 hover:bg-bg-hover">
            <span className={`font-bold w-3 ${STATUS_STYLE[c.status]}`}>{c.status}</span>
            <span className="text-text-primary truncate">{c.path}</span>
          </div>
        ))}

        {showLog && (
          <div className="border-t border-border mt-2 pt-2">
            <div className="px-2 pb-1 text-[11px] text-text-muted uppercase tracking-wide">Commit Log</div>
            {log.length === 0 && <div className="px-2 text-[11px] text-text-muted">No commits yet.</div>}
            {log.map((c) => (
              <div key={c._id} className="px-2 py-1.5 border-b border-border/50">
                <div className="text-text-primary">{c.message}</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {c.fileId?.path} · {c.editedBy?.name || "unknown"} · {new Date(c.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
