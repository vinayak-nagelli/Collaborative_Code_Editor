import { useState } from "react";
import { ChevronRight, ChevronDown, File as FileIcon, Folder, FolderOpen, MoreHorizontal } from "lucide-react";

const EXT_COLOR = {
  jsx: "text-sky-400", js: "text-yellow-300", ts: "text-blue-400", tsx: "text-blue-400",
  json: "text-yellow-500", md: "text-text-secondary", html: "text-orange-400",
  css: "text-blue-300", py: "text-green-400",
};

function iconColor(name) {
  const ext = name.split(".").pop();
  return EXT_COLOR[ext] || "text-text-secondary";
}

export default function FileTreeItem({
  node,
  depth,
  isExpanded,
  isActive,
  onToggle,
  onOpenFile,
  onRename,
  onDelete,
  onDuplicate,
  onCreateChild,
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(node.name);
  const [menuOpen, setMenuOpen] = useState(false);

  const commitRename = () => {
    setRenaming(false);
    if (draftName.trim() && draftName.trim() !== node.name) {
      onRename(node._id, draftName.trim());
    } else {
      setDraftName(node.name);
    }
  };

  return (
    <div>
      <div
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => (node.type === "folder" ? onToggle(node._id) : onOpenFile(node))}
        className={`group flex items-center gap-1 pr-2 py-[3px] text-[13px] cursor-pointer select-none rounded-sm ${
          isActive ? "bg-bg-active text-text-primary" : "text-text-secondary hover:bg-bg-hover"
        }`}
      >
        {node.type === "folder" ? (
          <>
            {isExpanded ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />}
            {isExpanded ? <FolderOpen size={14} className="text-sky-500 shrink-0" /> : <Folder size={14} className="text-sky-500 shrink-0" />}
          </>
        ) : (
          <>
            <span className="w-[13px] shrink-0" />
            <FileIcon size={14} className={`shrink-0 ${iconColor(node.name)}`} />
          </>
        )}

        {renaming ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setDraftName(node.name); setRenaming(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-base border border-accent rounded px-1 text-xs flex-1 min-w-0"
          />
        ) : (
          <span className="truncate flex-1">{node.name}</span>
        )}

        <div className="relative opacity-0 group-hover:opacity-100 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="hover:text-text-primary"
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-4 z-20 bg-bg-elevated border border-border rounded shadow-lg py-1 w-36 text-xs"
            >
              {node.type === "folder" && (
                <>
                  <button onClick={() => { onCreateChild(node._id, "file"); setMenuOpen(false); }} className="w-full text-left px-3 py-1 hover:bg-bg-hover text-text-primary">New File</button>
                  <button onClick={() => { onCreateChild(node._id, "folder"); setMenuOpen(false); }} className="w-full text-left px-3 py-1 hover:bg-bg-hover text-text-primary">New Folder</button>
                </>
              )}
              <button onClick={() => { setRenaming(true); setMenuOpen(false); }} className="w-full text-left px-3 py-1 hover:bg-bg-hover text-text-primary">Rename</button>
              {node.type === "file" && (
                <button onClick={() => { onDuplicate(node._id); setMenuOpen(false); }} className="w-full text-left px-3 py-1 hover:bg-bg-hover text-text-primary">Duplicate</button>
              )}
              <button onClick={() => { onDelete(node._id, node.type); setMenuOpen(false); }} className="w-full text-left px-3 py-1 hover:bg-bg-hover text-status-error">Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
