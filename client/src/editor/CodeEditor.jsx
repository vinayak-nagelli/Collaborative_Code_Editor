import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { SocketYjsProvider } from "../collaboration/SocketYjsProvider";
import { getSocket } from "../services/socket";
import useAuthStore from "../store/authStore";
import useThemeStore, { THEMES } from "../store/themeStore";
import useProblemsStore from "../store/problemsStore";
import useBreakpointsStore from "../store/breakpointsStore";

// Injects one CSS rule per remote collaborator so their cursor + selection
// render in their assigned color. y-monaco names classes by clientID.
function injectRemoteCursorStyle(clientID, color, name) {
  const styleId = `yjs-cursor-style-${clientID}`;
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
    .yRemoteSelection-${clientID} { background-color: ${color}33; }
    .yRemoteSelectionHead-${clientID} {
      position: relative;
      border-left: 2px solid ${color};
    }
    .yRemoteSelectionHead-${clientID}::after {
      content: "${name.replace(/"/g, "")}";
      position: absolute;
      top: -1.1em;
      left: -2px;
      font-size: 10px;
      background: ${color};
      color: #fff;
      padding: 0 4px;
      border-radius: 2px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 30;
    }
  `;
  document.head.appendChild(style);
}

export default function CodeEditor({ projectId, fileId, language, readOnly, onDirtyChange }) {
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const [connecting, setConnecting] = useState(true);
  const { user } = useAuthStore();
  const { themeId } = useThemeStore();
  const monacoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setConnecting(true);

    async function setup() {
      const socket = getSocket();
      const provider = new SocketYjsProvider(socket, projectId, fileId);
      providerRef.current = provider;

      try {
        await provider.connect();
      } catch (err) {
        console.error("Yjs sync failed:", err.message);
        return;
      }
      if (cancelled) return;

      provider.awareness.setLocalStateField("user", {
        name: user?.name || "Anonymous",
        color: user?.color || "#888",
      });

      // Style newly-seen remote collaborators as they appear.
      provider.awareness.on("change", () => {
        provider.awareness.getStates().forEach((state, clientID) => {
          if (clientID === provider.doc.clientID || !state.user) return;
          injectRemoteCursorStyle(clientID, state.user.color, state.user.name);
        });
      });

      if (editorRef.current) {
        bindEditor(provider);
      }

      setConnecting(false);
    }

    setup();

    return () => {
      cancelled = true;
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      bindingRef.current = null;
      providerRef.current = null;
      useProblemsStore.getState().clearProblems(fileId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, fileId]);

  function bindEditor(provider) {
    const ytext = provider.doc.getText("content");
    const model = editorRef.current.getModel();
    bindingRef.current = new MonacoBinding(
      ytext,
      model,
      new Set([editorRef.current]),
      provider.awareness
    );

    ytext.observe(() => {
      onDirtyChange?.(false); // Yjs-backed docs autosave server-side; nothing stays "dirty" locally
    });
  }

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    Object.entries(THEMES).forEach(([id, def]) => {
      monaco.editor.defineTheme(id, {
        base: def.monacoBase,
        inherit: true,
        rules: def.rules,
        colors: def.colors,
      });
    });
    monaco.editor.setTheme(themeId);

    monaco.editor.onDidChangeMarkers((uris) => {
      const model = editor.getModel();
      if (!model) return;
      if (!uris.some((u) => u.toString() === model.uri.toString())) return;
      const markers = monaco.editor.getModelMarkers({ resource: model.uri }).map((m) => ({
        severity: m.severity, // 8=error, 4=warning, 2=info, 1=hint (monaco.MarkerSeverity)
        message: m.message,
        startLineNumber: m.startLineNumber,
        startColumn: m.startColumn,
      }));
      useProblemsStore.getState().setProblems(fileId, markers);
    });

    // Real breakpoints: click the glyph margin next to a line number to
    // toggle a breakpoint, rendered as a red dot decoration.
    let decorationIds = [];
    const renderBreakpoints = () => {
      const lines = [...useBreakpointsStore.getState().get(fileId)];
      decorationIds = editor.deltaDecorations(
        decorationIds,
        lines.map((line) => ({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: "breakpoint-glyph",
          },
        }))
      );
    };
    renderBreakpoints();

    editor.onMouseDown((e) => {
      if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return;
      const line = e.target.position?.lineNumber;
      if (!line) return;
      useBreakpointsStore.getState().toggle(fileId, line);
      renderBreakpoints();
    });

    if (providerRef.current?.synced) {
      bindEditor(providerRef.current);
    }
  };

  useEffect(() => {
    monacoRef.current?.editor.setTheme(themeId);
  }, [themeId]);

  return (
    <div className="relative h-full w-full">
      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-base/70 z-10 text-xs text-text-secondary">
          Connecting to live session…
        </div>
      )}
      <Editor
        height="100%"
        language={language || "plaintext"}
        theme="vs-dark"
        onMount={handleMount}
        options={{
          readOnly: !!readOnly,
          fontSize: 13,
          fontFamily: "JetBrains Mono, Menlo, Consolas, monospace",
          minimap: { enabled: true },
          glyphMargin: true,
          wordWrap: "off",
          renderWhitespace: "selection",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          tabSize: 2,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
