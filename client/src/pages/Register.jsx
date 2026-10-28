import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Code2 } from "lucide-react";
import useAuthStore from "../store/authStore";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    const ok = await register(name, email, password);
    setSubmitting(false);
    if (ok) navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Code2 className="text-accent" size={26} />
          <span className="text-lg font-semibold text-text-primary">CollabIDE</span>
        </div>

        <div className="bg-bg-elevated border border-border rounded-md p-6">
          <h1 className="text-base font-semibold text-text-primary mb-1">Create an account</h1>
          <p className="text-text-secondary text-xs mb-5">Start building with your team, together.</p>

          {error && (
            <div className="mb-4 text-xs text-status-error bg-status-error/10 border border-status-error/30 rounded px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Name</label>
              <input
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="Aaqil Khan"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="At least 8 characters"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded py-2 transition-colors"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-secondary mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
