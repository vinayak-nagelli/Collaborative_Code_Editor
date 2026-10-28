import Project from "../models/Project.js";
import { getWorkspaceDir } from "../services/workspace.service.js";
import { runCommand } from "../services/terminal.service.js";
import { nanoid } from "nanoid";

// socket.id -> Map(terminalId -> { kill })
const activeProcesses = new Map();

async function assertMembership(userId, projectId) {
  const project = await Project.findById(projectId);
  if (!project || !project.isMember(userId)) throw new Error("Not authorized for this project");
  return project;
}

export default function registerTerminalHandlers(io, socket) {
  socket.on("terminal-create", async ({ projectId }, ack) => {
    try {
      await assertMembership(socket.user.id, projectId);
      const cwd = await getWorkspaceDir(projectId);
      const terminalId = nanoid(8);
      ack?.({ ok: true, terminalId, cwd: "/project" });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("terminal-input", async ({ projectId, terminalId, command }) => {
    try {
      const project = await assertMembership(socket.user.id, projectId);
      if (project.roleOf(socket.user.id) === "viewer") {
        return socket.emit("terminal-output", { terminalId, stream: "stderr", text: "read-only access\n" });
      }

      const cwd = await getWorkspaceDir(projectId);

      const procs = activeProcesses.get(socket.id) || new Map();
      if (procs.has(terminalId)) {
        socket.emit("terminal-output", {
          terminalId,
          stream: "stderr",
          text: "a command is already running in this terminal\n",
        });
        return;
      }

      const handle = runCommand(command, cwd, {
        onData: ({ stream, text }) => socket.emit("terminal-output", { terminalId, stream, text }),
        onExit: ({ code, timedOut }) => {
          socket.emit("terminal-exit", { terminalId, code, timedOut });
          procs.delete(terminalId);
        },
      });

      procs.set(terminalId, handle);
      activeProcesses.set(socket.id, procs);
    } catch (err) {
      socket.emit("terminal-output", { terminalId, stream: "stderr", text: `${err.message}\n` });
    }
  });

  socket.on("terminal-kill", ({ terminalId }) => {
    const procs = activeProcesses.get(socket.id);
    const handle = procs?.get(terminalId);
    if (handle) {
      handle.kill();
      procs.delete(terminalId);
    }
  });

  socket.on("terminal-close", ({ terminalId }) => {
    const procs = activeProcesses.get(socket.id);
    procs?.get(terminalId)?.kill();
    procs?.delete(terminalId);
  });

  socket.on("disconnect", () => {
    const procs = activeProcesses.get(socket.id);
    if (procs) {
      procs.forEach((handle) => handle.kill());
      activeProcesses.delete(socket.id);
    }
  });
}
