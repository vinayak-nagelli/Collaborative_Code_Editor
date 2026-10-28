import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import useUIStore from "../store/uiStore";

function extractInviteCode(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/\/join\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : trimmed;
}

export default function JoinProjectModal() {
  const { isJoinModalOpen, closeJoinModal } = useUIStore();
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  if (!isJoinModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = extractInviteCode(value);
    if (!code) return;
    closeJoinModal();
    setValue("");
    navigate(`/join/${code}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-elevated border border-border rounded-md w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Join Project</h2>
          <button onClick={closeJoinModal} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Invite link or code</label>
            <input
              autoFocus
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://yourapp.com/join/8FJ3K9 or 8FJ3K9"
              className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeJoinModal}
              className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-4 py-1.5 rounded"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
