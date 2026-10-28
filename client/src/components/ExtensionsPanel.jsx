import { useState } from "react";
import { Puzzle, Check } from "lucide-react";
import toast from "react-hot-toast";

// Mock catalog — the architecture (a flat list of { id, name, publisher,
// description, installed }) is deliberately simple so a real marketplace
// API can replace this array without touching the rendering below.
const CATALOG = [
  { id: "prettier", name: "Prettier", publisher: "Prettier", description: "Opinionated code formatter." },
  { id: "eslint", name: "ESLint", publisher: "Microsoft", description: "Integrates ESLint into the editor." },
  { id: "gitlens", name: "GitLens", publisher: "GitKraken", description: "Supercharge Git within the editor." },
  { id: "live-server", name: "Live Server", publisher: "Community", description: "Launch a local dev server with live reload." },
  { id: "js-tools", name: "JavaScript Tools", publisher: "Community", description: "Snippets and refactors for modern JS." },
];

export default function ExtensionsPanel() {
  const [installed, setInstalled] = useState(new Set());

  const toggle = (ext) => {
    setInstalled((prev) => {
      const next = new Set(prev);
      if (next.has(ext.id)) {
        next.delete(ext.id);
        toast(`${ext.name} uninstalled`);
      } else {
        next.add(ext.id);
        toast.success(`${ext.name} installed (mock — no runtime effect yet)`);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="px-2 py-1.5 border-b border-border">
        <span className="text-[11px] font-semibold text-text-secondary tracking-wide uppercase">Extensions</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {CATALOG.map((ext) => (
          <div key={ext.id} className="flex items-start gap-2 px-2 py-2 border-b border-border/50 hover:bg-bg-hover">
            <Puzzle size={16} className="text-text-muted mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-text-primary font-medium">{ext.name}</span>
                <button
                  onClick={() => toggle(ext)}
                  className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${
                    installed.has(ext.id)
                      ? "bg-bg-active text-text-secondary"
                      : "bg-accent hover:bg-accent-hover text-white"
                  }`}
                >
                  {installed.has(ext.id) && <Check size={10} />}
                  {installed.has(ext.id) ? "Installed" : "Install"}
                </button>
              </div>
              <div className="text-[10px] text-text-muted">{ext.publisher}</div>
              <div className="text-[11px] text-text-secondary mt-0.5">{ext.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
