import { Code2, LayoutGrid, FolderGit2, Users, Clock, Star, Settings, LogOut } from "lucide-react";
import UserAvatar from "./UserAvatar";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { key: "all", label: "Dashboard", icon: LayoutGrid },
  { key: "owned", label: "My Projects", icon: FolderGit2 },
  { key: "shared", label: "Shared With Me", icon: Users },
  { key: "recent", label: "Recent", icon: Clock },
  { key: "starred", label: "Starred", icon: Star },
];

export default function Sidebar({ activeFilter, onFilterChange }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg-panel flex flex-col h-screen">
      <div className="flex items-center gap-2 px-4 py-4">
        <Code2 className="text-accent" size={20} />
        <span className="font-semibold text-sm text-text-primary">CollabIDE</span>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-sm transition-colors ${
              activeFilter === key
                ? "bg-bg-active text-text-primary"
                : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-2 pb-2 space-y-0.5">
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        >
          <Settings size={15} />
          Settings
        </button>
      </div>

      <div className="border-t border-border px-3 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar user={user} size={26} />
          <div className="min-w-0">
            <div className="text-xs text-text-primary truncate">{user?.name}</div>
            <div className="text-[11px] text-text-muted truncate">{user?.email}</div>
          </div>
        </div>
        <button onClick={logout} className="text-text-muted hover:text-status-error shrink-0" title="Log out">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
