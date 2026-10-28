import { useState } from "react";
import { X, Copy, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

export default function InviteModal({ open, onClose, project, onCopy }) {
  const [inviteCode, setInviteCode] = useState(project?.inviteCode);
  const [inviteEnabled, setInviteEnabled] = useState(project?.inviteEnabled ?? true);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const link = `${window.location.origin}/join/${inviteCode}`;

  const regenerate = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/projects/${project._id}/invite`, { action: "regenerate" });
      setInviteCode(data.inviteCode);
      toast.success("Invite link regenerated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async () => {
    setBusy(true);
    const action = inviteEnabled ? "disable" : "enable";
    try {
      await api.post(`/projects/${project._id}/invite`, { action });
      setInviteEnabled(!inviteEnabled);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
    onCopy?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg-elevated border border-border rounded-md p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Invite collaborators</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-text-secondary mb-4">
          Anyone with this link can join <span className="text-text-primary">{project?.name}</span>. Max{" "}
          {project?.maxMembers || 4} collaborators.
        </p>

        <div className="flex items-center gap-2 mb-3">
          <input
            readOnly
            value={inviteEnabled ? link : "Invite link disabled"}
            className="flex-1 bg-bg-base border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary truncate"
          />
          <button
            disabled={!inviteEnabled}
            onClick={copy}
            className="flex items-center gap-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs font-medium px-2.5 py-1.5 rounded shrink-0"
          >
            <Copy size={12} />
            Copy
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <button
            disabled={busy}
            onClick={regenerate}
            className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary"
          >
            <RefreshCw size={12} />
            Regenerate link
          </button>
          <button
            disabled={busy}
            onClick={toggleEnabled}
            className="text-text-secondary hover:text-text-primary"
          >
            {inviteEnabled ? "Disable link" : "Enable link"}
          </button>
        </div>
      </div>
    </div>
  );
}
