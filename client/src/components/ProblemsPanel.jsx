import { AlertTriangle, XCircle, Info } from "lucide-react";
import useProblemsStore from "../store/problemsStore";
import useFileStore from "../store/fileStore";
import useEditorStore from "../store/editorStore";

const ICON = {
  8: <XCircle size={12} className="text-status-error shrink-0" />,
  4: <AlertTriangle size={12} className="text-status-warning shrink-0" />,
  2: <Info size={12} className="text-status-info shrink-0" />,
  1: <Info size={12} className="text-text-muted shrink-0" />,
};

export default function ProblemsPanel() {
  const problems = useProblemsStore((s) => s.allProblems());
  const { files } = useFileStore();
  const { openFile } = useEditorStore();

  const errors = problems.filter((p) => p.severity === 8).length;
  const warnings = problems.filter((p) => p.severity === 4).length;

  const jumpTo = (fileId) => {
    const file = files.find((f) => f._id === fileId);
    if (file) openFile(file);
  };

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="px-2 py-1.5 border-b border-border flex items-center gap-3">
        <span className="flex items-center gap-1 text-status-error">
          <XCircle size={12} /> {errors}
        </span>
        <span className="flex items-center gap-1 text-status-warning">
          <AlertTriangle size={12} /> {warnings}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {problems.length === 0 && (
          <div className="p-3 text-text-muted text-[11px]">No problems detected in open files.</div>
        )}
        {problems.map((p, i) => {
          const file = files.find((f) => f._id === p.fileId);
          return (
            <div
              key={i}
              onClick={() => jumpTo(p.fileId)}
              className="flex items-start gap-2 px-2 py-1 hover:bg-bg-hover cursor-pointer"
            >
              {ICON[p.severity] || ICON[1]}
              <div className="min-w-0">
                <div className="text-text-primary truncate">{p.message}</div>
                <div className="text-[10px] text-text-muted">
                  {file?.name || "file"} · Ln {p.startLineNumber}, Col {p.startColumn}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
