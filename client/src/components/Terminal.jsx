import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X, Square } from "lucide-react";
import useTerminalStore from "../store/terminalStore";

const STREAM_COLOR = {
  stdout: "text-text-primary",
  stderr: "text-status-error",
  input: "text-status-info",
  meta: "text-text-muted",
};

export default function Terminal({ projectId, canEdit }) {
  const {
    terminals, activeTerminalId, bindSocketListeners, createTerminal,
    runCommand, killCommand, clearTerminal, closeTerminal, setActiveTerminal,
  } = useTerminalStore();
  const [draft, setDraft] = useState("");
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  const active = terminals.find((t) => t.id === activeTerminalId);

  useEffect(() => {
    bindSocketListeners();
    if (terminals.length === 0) createTerminal(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [active?.lines?.length]);

  const submit = () => {
    if (!active || active.running) return;
    runCommand(projectId, active.id, draft);
    setDraft("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") return submit();
    if (e.key === "c" && e.ctrlKey) return killCommand(active.id);
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const hist = active?.history || [];
      const idx = active.historyIdx === -1 ? hist.length - 1 : Math.max(0, active.historyIdx - 1);
      if (hist[idx] !== undefined) setDraft(hist[idx]);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const hist = active?.history || [];
      const idx = active.historyIdx + 1;
      setDraft(hist[idx] !== undefined ? hist[idx] : "");
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-panel text-xs">
      <div className="flex items-center justify-between border-b border-border pr-2">
        <div className="flex items-center overflow-x-auto">
          {terminals.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTerminal(t.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 border-r border-border shrink-0 ${
                t.id === activeTerminalId ? "bg-bg-base text-text-primary" : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {t.running && <span className="h-1.5 w-1.5 rounded-full bg-status-success animate-pulse" />}
              {t.label}
              <X
                size={11}
                className="opacity-0 group-hover:opacity-100 hover:text-status-error"
                onClick={(e) => { e.stopPropagation(); closeTerminal(t.id); }}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-text-muted shrink-0">
          {canEdit && (
            <button title="New Terminal" onClick={() => createTerminal(projectId)} className="hover:text-text-primary">
              <Plus size={14} />
            </button>
          )}
          {active?.running && (
            <button title="Kill process" onClick={() => killCommand(active.id)} className="hover:text-status-error">
              <Square size={12} />
            </button>
          )}
          <button title="Clear" onClick={() => active && clearTerminal(active.id)} className="hover:text-text-primary">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div ref={outputRef} className="flex-1 overflow-y-auto px-3 py-2 mono whitespace-pre-wrap leading-relaxed" onClick={() => inputRef.current?.focus()}>
        {active?.lines.map((line, i) => (
          <span key={i} className={STREAM_COLOR[line.stream] || "text-text-primary"}>{line.text}</span>
        ))}
        {active && !active.running && canEdit && (
          <div className="flex items-center text-status-success">
            <span className="mr-1.5">$</span>
            <input
              ref={inputRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              className="flex-1 bg-transparent outline-none text-text-primary mono"
              placeholder="run a command…"
            />
          </div>
        )}
        {!canEdit && (
          <div className="text-text-muted italic mt-1">Read-only access — you can't run commands in this workspace.</div>
        )}
      </div>
    </div>
  );
}
