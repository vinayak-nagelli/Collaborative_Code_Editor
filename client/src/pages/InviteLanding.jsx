import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Code2 } from "lucide-react";
import UserAvatar from "../components/UserAvatar";
import useAuthStore from "../store/authStore";
import useProjectStore from "../store/projectStore";
import toast from "react-hot-toast";

export default function InviteLanding() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();
  const { previewInvite, joinProject } = useProjectStore();

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return; // wait for redirect-to-login below

    previewInvite(inviteCode)
      .then((p) => setPreview(p))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingPreview(false));
  }, [inviteCode, user, authLoading]);

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
        <div className="bg-bg-elevated border border-border rounded-md p-6 max-w-sm w-full text-center">
          <Code2 className="text-accent mx-auto mb-3" size={24} />
          <p className="text-sm text-text-primary mb-4">Login or Sign up to continue</p>
          <button
            onClick={() => navigate("/login", { state: { from: `/join/${inviteCode}` } })}
            className="w-full bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded py-2 mb-2"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate("/register", { state: { from: `/join/${inviteCode}` } })}
            className="w-full border border-border-subtle text-text-primary text-sm font-medium rounded py-2"
          >
            Create account
          </button>
        </div>
      </div>
    );
  }

  const handleJoin = async () => {
    setJoining(true);
    try {
      const project = await joinProject(inviteCode);
      toast.success(`Joined "${project.name}"`);
      navigate(`/workspace/${project._id}`);
    } catch (err) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="bg-bg-elevated border border-border rounded-md p-6 max-w-sm w-full text-center">
        <Code2 className="text-accent mx-auto mb-4" size={24} />

        {loadingPreview && <p className="text-sm text-text-secondary">Loading invite…</p>}

        {error && !loadingPreview && (
          <div>
            <p className="text-sm text-status-error mb-4">{error}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-accent hover:underline text-sm"
            >
              Back to dashboard
            </button>
          </div>
        )}

        {preview && !error && (
          <div>
            <p className="text-xs text-text-secondary mb-1">You&apos;ve been invited to collaborate on</p>
            <h1 className="text-lg font-semibold text-text-primary mb-3">{preview.name}</h1>
            <div className="flex items-center justify-center gap-2 mb-1">
              <UserAvatar user={preview.owner} size={22} />
              <span className="text-xs text-text-secondary">Owner: {preview.owner?.name}</span>
            </div>
            <p className="text-[11px] text-text-muted mb-5">
              {preview.memberCount}/{preview.maxMembers} collaborators
            </p>

            {preview.alreadyMember ? (
              <button
                onClick={() => navigate(`/workspace/${preview.id}`)}
                className="w-full bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded py-2"
              >
                Open Workspace
              </button>
            ) : preview.memberCount >= preview.maxMembers ? (
              <p className="text-xs text-status-error">
                This workspace is full.
                <br />
                Maximum collaborators: {preview.maxMembers}
              </p>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded py-2"
              >
                {joining ? "Joining…" : "Join Workspace"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
