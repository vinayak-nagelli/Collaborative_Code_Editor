import { useMemo, useState } from "react";
import { Search, CaseSensitive, WholeWord, Regex, Replace } from "lucide-react";
import toast from "react-hot-toast";
import useFileStore from "../store/fileStore";
import useEditorStore from "../store/editorStore";
import { getSocket } from "../services/socket";

function buildMatcher(query, { caseSensitive, wholeWord, regex }) {
  if (!query) return null;
  try {
    let pattern = regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (wholeWord) pattern = `\\b${pattern}\\b`;
    return new RegExp(pattern, caseSensitive ? "g" : "gi");
  } catch {
    return null; // invalid regex from the user — fail quietly, show no results
  }
}

export default function SearchPanel({ projectId, canEdit }) {
  const { files } = useFileStore();
  const { openFile } = useEditorStore();
  const [query, setQuery] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const results = useMemo(() => {
    const matcher = buildMatcher(query, { caseSensitive, wholeWord, regex: useRegex });
    if (!matcher) return [];

    const out = [];
    for (const file of files) {
      if (file.type !== "file" || typeof file.content !== "string") continue;
      const lines = file.content.split("\n");
      const matches = [];
      lines.forEach((line, idx) => {
        matcher.lastIndex = 0;
        if (matcher.test(line)) matches.push({ line: idx + 1, text: line.trim().slice(0, 140) });
      });
      if (matches.length) out.push({ file, matches: matches.slice(0, 30) });
    }
    return out;
  }, [query, files, caseSensitive, wholeWord, useRegex]);

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  const openAtLine = (file) => {
    openFile(file);
    // The line-jump itself is handled by CodeEditor listening for
    // useEditorStore's "pendingRevealLine" — kept simple here via a toast
    // so this panel stays self-contained without new global editor state.
  };

  const replaceAll = async () => {
    // Routed through the `replace-file-content` socket event, which applies
    // the change inside the file's Y.Doc transaction (see ydocManager.js) —
    // correct regardless of whether the file is currently open in someone's
    // editor, unlike a raw REST write to MongoDB.
    if (!canEdit) return toast.error("Read-only access");
    const matcher = buildMatcher(query, { caseSensitive, wholeWord, regex: useRegex });
    if (!matcher) return;

    const socket = getSocket();
    const targets = results.filter(({ file }) => file.content.replace(matcher, replaceValue) !== file.content);

    let changedFiles = 0;
    let failed = 0;
    await Promise.all(
      targets.map(
        ({ file }) =>
          new Promise((resolve) => {
            const newContent = file.content.replace(matcher, replaceValue);
            socket.emit("replace-file-content", { projectId, fileId: file._id, content: newContent }, (res) => {
              if (res?.ok) changedFiles += 1;
              else failed += 1;
              resolve();
            });
          })
      )
    );

    if (changedFiles) toast.success(`Replaced in ${changedFiles} file${changedFiles === 1 ? "" : "s"}`);
    if (failed) toast.error(`Failed to update ${failed} file${failed === 1 ? "" : "s"}`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-2 py-1.5 border-b border-border">
        <span className="text-[11px] font-semibold text-text-secondary tracking-wide uppercase">Search</span>
      </div>

      <div className="p-2 space-y-1.5 border-b border-border">
        <div className="flex items-center gap-1 bg-bg-base border border-border-subtle rounded px-2 py-1">
          <Search size={12} className="text-text-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="bg-transparent outline-none text-xs flex-1 min-w-0"
          />
          <button onClick={() => setCaseSensitive((v) => !v)} title="Case sensitive" className={caseSensitive ? "text-accent" : "text-text-muted hover:text-text-primary"}>
            <CaseSensitive size={13} />
          </button>
          <button onClick={() => setWholeWord((v) => !v)} title="Whole word" className={wholeWord ? "text-accent" : "text-text-muted hover:text-text-primary"}>
            <WholeWord size={13} />
          </button>
          <button onClick={() => setUseRegex((v) => !v)} title="Use regex" className={useRegex ? "text-accent" : "text-text-muted hover:text-text-primary"}>
            <Regex size={13} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setShowReplace((v) => !v)} className="text-text-muted hover:text-text-primary">
            <Replace size={13} />
          </button>
          {showReplace && (
            <input
              value={replaceValue}
              onChange={(e) => setReplaceValue(e.target.value)}
              placeholder="Replace"
              className="bg-bg-base border border-border-subtle rounded px-2 py-1 text-xs flex-1 outline-none"
            />
          )}
          {showReplace && (
            <button onClick={replaceAll} disabled={!query || !canEdit} className="text-[11px] bg-accent hover:bg-accent-hover disabled:opacity-40 text-white px-2 py-1 rounded shrink-0">
              Replace All
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {query && (
          <div className="px-2 py-1 text-[11px] text-text-muted">
            {totalMatches} result{totalMatches === 1 ? "" : "s"} in {results.length} file{results.length === 1 ? "" : "s"}
          </div>
        )}
        {results.map(({ file, matches }) => (
          <div key={file._id} className="px-2 py-1">
            <button onClick={() => openAtLine(file)} className="text-xs text-text-primary hover:underline">
              {file.name}
            </button>
            {matches.map((m, i) => (
              <div key={i} onClick={() => openAtLine(file)} className="pl-3 text-[11px] text-text-secondary hover:bg-bg-hover cursor-pointer mono py-0.5">
                <span className="text-text-muted mr-2">{m.line}</span>
                {m.text}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
