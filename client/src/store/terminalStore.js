import { create } from "zustand";
import { getSocket } from "../services/socket";

export const useTerminalStore = create((set, get) => ({
  terminals: [], // [{ id, label, lines: [{stream, text}], running, history: [], historyIdx }]
  activeTerminalId: null,
  listenersBound: false,

  bindSocketListeners() {
    if (get().listenersBound) return;
    const socket = getSocket();

    socket.on("terminal-output", ({ terminalId, stream, text }) => {
      set({
        terminals: get().terminals.map((t) =>
          t.id === terminalId ? { ...t, lines: [...t.lines, { stream, text }] } : t
        ),
      });
    });

    socket.on("terminal-exit", ({ terminalId, code, timedOut }) => {
      set({
        terminals: get().terminals.map((t) =>
          t.id === terminalId
            ? {
                ...t,
                running: false,
                lines: [
                  ...t.lines,
                  {
                    stream: "meta",
                    text: timedOut
                      ? "\n[terminated: exceeded 30s sandbox time limit]\n"
                      : `\n[process exited with code ${code}]\n`,
                  },
                ],
              }
            : t
        ),
      });
    });

    set({ listenersBound: true });
  },

  createTerminal(projectId) {
    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit("terminal-create", { projectId }, (res) => {
        if (!res?.ok) return resolve(null);
        const terminal = {
          id: res.terminalId,
          label: `bash — ${res.terminalId}`,
          cwd: res.cwd,
          lines: [{ stream: "meta", text: `Sandboxed workspace shell — allowed: node, npm, npx, python, ls, cat, echo, pwd, mkdir, touch\n` }],
          running: false,
          history: [],
          historyIdx: -1,
        };
        set({ terminals: [...get().terminals, terminal], activeTerminalId: terminal.id });
        resolve(terminal);
      });
    });
  },

  runCommand(projectId, terminalId, command) {
    if (!command.trim()) return;
    const socket = getSocket();
    set({
      terminals: get().terminals.map((t) =>
        t.id === terminalId
          ? {
              ...t,
              running: true,
              lines: [...t.lines, { stream: "input", text: `$ ${command}\n` }],
              history: [...t.history, command],
              historyIdx: -1,
            }
          : t
      ),
    });
    socket.emit("terminal-input", { projectId, terminalId, command });
  },

  killCommand(terminalId) {
    getSocket().emit("terminal-kill", { terminalId });
  },

  clearTerminal(terminalId) {
    set({
      terminals: get().terminals.map((t) => (t.id === terminalId ? { ...t, lines: [] } : t)),
    });
  },

  closeTerminal(terminalId) {
    getSocket().emit("terminal-close", { terminalId });
    const remaining = get().terminals.filter((t) => t.id !== terminalId);
    set({
      terminals: remaining,
      activeTerminalId:
        get().activeTerminalId === terminalId
          ? remaining[remaining.length - 1]?.id || null
          : get().activeTerminalId,
    });
  },

  setActiveTerminal(terminalId) {
    set({ activeTerminalId: terminalId });
  },
}));

export default useTerminalStore;
