import { X } from "lucide-react";
import { useState } from "react";
import useEditorStore from "../store/editorStore";

const EXT_COLOR = {
  jsx: "text-sky-400", js: "text-yellow-300", ts: "text-blue-400", tsx: "text-blue-400",
  json: "text-yellow-500", md: "text-text-secondary", html: "text-orange-400",
  css: "text-blue-300", py: "text-green-400",
};
const iconColor = (name) => EXT_COLOR[name.split(".").pop()] || "text-text-secondary";

export default function EditorTabs() {
  const { openTabs, activeFileId, setActiveTab, closeTab, closeOthers, closeAll, closeToRight } = useEditorStore();
  const [menu, setMenu] = useState(null); // { fileId, x, y }

  if (openTabs.length === 0) return null;

  return (
    <div className="flex items-center bg-bg-panel border-b border-border overflow-x-auto">
      {openTabs.map((tab) => (
        <div
          key={tab.fileId}
          onClick={() => setActiveTab(tab.fileId)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ fileId: tab.fileId, x: e.clientX, y: e.clientY });
          }}
          className={`group flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs border-r border-border cursor-pointer shrink-0 ${
            tab.fileId === activeFileId
              ? "bg-bg-base text-text-primary"
              : "text-text-secondary hover:bg-bg-hover"
          }`}
        >
          <span className={`text-[10px] ${iconColor(tab.name)}`}>●</span>
          <span className="whitespace-nowrap">{tab.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); closeTab(tab.fileId); }}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {menu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} />
          <div
            style={{ top: menu.y, left: menu.x }}
            className="fixed z-40 bg-bg-elevated border border-border rounded shadow-lg py-1 w-40 text-xs"
          >
            <button onClick={() => { closeTab(menu.fileId); setMenu(null); }} className="w-full text-left px-3 py-1 hover:bg-bg-hover text-text-primary">Close</button>
            <button onClick={() => { closeOthers(menu.fileId); setMenu(null); }} className="w-full text-left px-3 py-1 hover:bg-bg-hover text-text-primary">Close Others</button>
            <button onClick={() => { closeToRight(menu.fileId); setMenu(null); }} className="w-full text-left px-3 py-1 hover:bg-bg-hover text-text-primary">Close to the Right</button>
            <button onClick={() => { closeAll(); setMenu(null); }} className="w-full text-left px-3 py-1 hover:bg-bg-hover text-text-primary">Close All</button>
          </div>
        </>
      )}
    </div>
  );
}
