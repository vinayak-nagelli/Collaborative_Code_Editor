import { Play, Bug, ChevronRight } from "lucide-react";

// The MVP debugger UI. Real breakpoints are toggled directly in Monaco's
// glyph margin (a genuine editor feature, wired in CodeEditor.jsx), which
// is the correct integration point once a real Debug Adapter Protocol
// backend exists — this panel is the shell that would display its state
// (call stack, scoped variables, watch expressions) once that's plugged in.
export default function DebugPanel() {
  return (
    <div className="h-full flex flex-col text-xs">
      <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-semibold text-text-secondary tracking-wide uppercase">Run &amp; Debug</span>
      </div>

      <div className="p-2 border-b border-border">
        <button
          disabled
          title="Requires a configured Debug Adapter (Node.js inspector) — architecture seam, not wired in this MVP"
          className="w-full flex items-center justify-center gap-1.5 bg-bg-active text-text-muted text-xs py-1.5 rounded cursor-not-allowed"
        >
          <Play size={12} /> Start Debugging
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {["Variables", "Watch", "Call Stack", "Breakpoints"].map((section) => (
          <div key={section} className="border-b border-border/50">
            <div className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-text-secondary uppercase tracking-wide">
              <ChevronRight size={11} />
              {section}
            </div>
            <div className="px-4 pb-2 text-[11px] text-text-muted italic">
              {section === "Breakpoints"
                ? "Click a line number's glyph margin in the editor to set one."
                : "No active debug session."}
            </div>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-border flex items-center gap-1.5 text-text-muted">
        <Bug size={12} />
        <span className="text-[10px]">Debug Console output will stream here once a session is active.</span>
      </div>
    </div>
  );
}
