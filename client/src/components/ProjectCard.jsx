import { useNavigate } from "react-router-dom";
import { Star, MoreVertical } from "lucide-react";
import UserAvatar from "./UserAvatar";
import useProjectStore from "../store/projectStore";
import { useState } from "react";

const LANGUAGE_LABEL = {
  empty: "Empty",
  "html-css-js": "HTML/CSS/JS",
  react: "React",
  node: "Node.js",
  express: "Express",
  mern: "MERN",
  python: "Python",
  java: "Java",
  cpp: "C++",
  nextjs: "Next.js",
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ProjectCard({ project, currentUserId }) {
  const navigate = useNavigate();
  const { toggleStar, deleteProject } = useProjectStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = project.owner?._id === currentUserId || project.owner?.id === currentUserId;
  const isStarred = project.starredBy?.includes(currentUserId);

  const collaborators = [project.owner, ...(project.members || []).map((m) => m.user)].filter(Boolean);

  return (
    <div
      onClick={() => navigate(`/workspace/${project._id}`)}
      className="group border border-border rounded-md bg-bg-elevated hover:border-text-secondary transition-colors p-4 cursor-pointer relative"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary truncate pr-6">{project.name}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(project._id);
            }}
            className="text-text-muted hover:text-status-warning transition-colors"
          >
            <Star size={14} fill={isStarred ? "currentColor" : "none"} className={isStarred ? "text-status-warning" : ""} />
          </button>
          {isOwner && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="text-text-muted hover:text-text-primary"
              >
                <MoreVertical size={14} />
              </button>
              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-5 z-10 bg-bg-elevated border border-border rounded shadow-lg py-1 w-32"
                >
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                        deleteProject(project._id);
                      }
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-status-error hover:bg-bg-hover"
                  >
                    Delete project
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-text-secondary line-clamp-2 mb-3 min-h-[2.2em]">
        {project.description || "No description"}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-bg-active text-text-secondary">
          {LANGUAGE_LABEL[project.template] || project.template}
        </span>
        <div className="flex -space-x-1.5">
          {collaborators.slice(0, 4).map((u) => (
            <UserAvatar key={u._id || u.id} user={u} size={22} />
          ))}
        </div>
      </div>

      <div className="mt-2 text-[11px] text-text-muted">
        Edited {timeAgo(project.updatedAt)} · Owner {project.owner?.name}
      </div>
    </div>
  );
}
