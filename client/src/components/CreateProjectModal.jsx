import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import useProjectStore from "../store/projectStore";
import useUIStore from "../store/uiStore";
import toast from "react-hot-toast";

const TEMPLATES = [
  { key: "empty", label: "Empty" },
  { key: "html-css-js", label: "HTML/CSS/JS" },
  { key: "react", label: "React" },
  { key: "node", label: "Node.js" },
  { key: "express", label: "Express" },
  { key: "mern", label: "MERN" },
  { key: "python", label: "Python" },
  { key: "java", label: "Java" },
  { key: "cpp", label: "C++" },
  { key: "nextjs", label: "Next.js" },
];

export default function CreateProjectModal() {
  const { isCreateModalOpen, closeCreateModal } = useUIStore();
  const { createProject } = useProjectStore();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("react");
  const [submitting, setSubmitting] = useState(false);

  if (!isCreateModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const project = await createProject({ name, description, template });
      toast.success(`"${project.name}" created`);
      closeCreateModal();
      setName("");
      setDescription("");
      navigate(`/workspace/${project._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-elevated border border-border rounded-md w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">New Project</h2>
          <button onClick={closeCreateModal} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Project Name</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="AI Chat Application"
              className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you building?"
              rows={2}
              className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Template</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={`text-xs rounded px-2 py-1.5 border transition-colors ${
                    template === t.key
                      ? "border-accent bg-accent/10 text-text-primary"
                      : "border-border-subtle text-text-secondary hover:border-text-secondary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeCreateModal}
              className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded"
            >
              {submitting ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
