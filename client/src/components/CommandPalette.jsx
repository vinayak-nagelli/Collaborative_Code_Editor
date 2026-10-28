import { useEffect, useMemo, useRef, useState } from "react";
import { Command } from "lucide-react";

export default function CommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, commands]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  if (!open) return null;

  const run = (cmd) => {
    onClose();
    cmd.action();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") return onClose();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    }
    if (e.key === "Enter" && filtered[selected]) {
      run(filtered[selected]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-bg-elevated border border-border-subtle rounded shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Command size={14} className="text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command…"
            className="flex-1 bg-transparent outline-none text-sm text-text-primary"
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-xs text-text-muted text-center">No matching commands</div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onMouseEnter={() => setSelected(i)}
              onClick={() => run(cmd)}
              className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer ${
                i === selected ? "bg-accent text-white" : "text-text-primary"
              }`}
            >
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <span className={`text-[10px] ${i === selected ? "text-white/80" : "text-text-muted"}`}>
                  {cmd.shortcut}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
