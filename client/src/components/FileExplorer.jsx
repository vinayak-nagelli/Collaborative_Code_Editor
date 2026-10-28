import { useMemo, useState } from "react";
import { FilePlus, FolderPlus } from "lucide-react";
import FileTreeItem from "./FileTreeItem";
import useFileStore from "../store/fileStore";
import useEditorStore from "../store/editorStore";
import toast from "react-hot-toast";

function buildTree(files) {
  const byParent = new Map();
  files.forEach((f) => {
    const key = f.parentId || "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(f);
  });
  byParent.forEach((list) =>
    list.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1))
  );
  return byParent;
}

export default function FileExplorer({ projectId, canEdit }) {
  const { files, createFile, renameFile, deleteFile, duplicateFile } = useFileStore();
  const { openFile, activeFileId, removeTabIfOpen } = useEditorStore();
  const [expanded, setExpanded] = useState(new Set());
  const [creating, setCreating] = useState(null); // { parentId, type }
  const [draftName, setDraftName] = useState("");

  const tree = useMemo(() => buildTree(files), [files]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRename = async (id, name) => {
    try {
      const updated = await renameFile(id, name);
      useEditorStore.getState().renameTab(id, updated.name);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm(`Delete this ${type}? This cannot be undone.`)) return;
    try {
      await deleteFile(projectId, id);
      removeTabIfOpen(id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await duplicateFile(id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const startCreate = (parentId, type) => {
    setCreating({ parentId, type });
    setDraftName("");
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
  };

  const commitCreate = async () => {
    if (!creating) return;
    const name = draftName.trim();
    setCreating(null);
    if (!name) return;
    try {
      await createFile(projectId, { name, type: creating.type, parentId: creating.parentId });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const renderChildren = (parentId, depth) => {
    const children = tree.get(parentId || "root") || [];
    return (
      <>
        {children.map((node) => (
          <div key={node._id}>
            <FileTreeItem
              node={node}
              depth={depth}
              isExpanded={expanded.has(node._id)}
              isActive={node._id === activeFileId}
              onToggle={toggle}
              onOpenFile={openFile}
              onRename={handleRename}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onCreateChild={startCreate}
            />
            {node.type === "folder" && expanded.has(node._id) && renderChildren(node._id, depth + 1)}
            {creating && creating.parentId === node._id && node.type === "folder" && (
              <div style={{ paddingLeft: 8 + (depth + 1) * 12 }} className="py-[3px]">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitCreate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitCreate();
                    if (e.key === "Escape") setCreating(null);
                  }}
                  placeholder={creating.type === "folder" ? "folder name" : "file.ext"}
                  className="bg-bg-base border border-accent rounded px-1 text-xs w-40"
                />
              </div>
            )}
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <span className="text-[11px] font-semibold text-text-secondary tracking-wide uppercase">Explorer</span>
        {canEdit && (
          <div className="flex items-center gap-1.5 text-text-muted">
            <button title="New File" onClick={() => startCreate(null, "file")} className="hover:text-text-primary">
              <FilePlus size={13} />
            </button>
            <button title="New Folder" onClick={() => startCreate(null, "folder")} className="hover:text-text-primary">
              <FolderPlus size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {renderChildren(null, 0)}
        {creating && creating.parentId === null && (
          <div style={{ paddingLeft: 8 }} className="py-[3px]">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitCreate();
                if (e.key === "Escape") setCreating(null);
              }}
              placeholder={creating.type === "folder" ? "folder name" : "file.ext"}
              className="bg-bg-base border border-accent rounded px-1 text-xs w-40"
            />
          </div>
        )}
      </div>
    </div>
  );
}
