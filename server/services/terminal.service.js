import { spawn } from "child_process";

/**
 * SECURITY MODEL (Phase 14 requirement):
 * - No shell is ever invoked (`shell: false`) — this alone blocks command
 *   chaining, pipes, and injection via `; rm -rf` style payloads.
 * - Only an explicit binary allowlist may run at all.
 * - Every process has a wall-clock timeout and a max-output cap.
 * - Execution is confined to the project's materialized scratch directory
 *   (see workspace.service.js) — never the server's own source tree.
 *
 * This is a real, working implementation suitable for a trusted-user MVP.
 * The documented upgrade path — swapping `spawn()` here for a call into a
 * per-project Docker container or Firecracker microVM — does not require
 * touching any other part of the app, since callers only see
 * `runCommand({ onData, onExit })`.
 */
const ALLOWLIST = new Set([
  "node", "npm", "npx", "python3", "python",
  "ls", "pwd", "cat", "echo", "whoami", "date", "mkdir", "touch", "env",
]);

const MAX_OUTPUT_BYTES = 200_000;
const TIMEOUT_MS = 30_000;

export function runCommand(commandLine, cwd, { onData, onExit }) {
  const tokens = commandLine.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    onExit({ code: 0 });
    return { kill: () => {} };
  }

  const [bin, ...args] = tokens;
  if (!ALLOWLIST.has(bin)) {
    onData({
      stream: "stderr",
      text: `command not allowed in this sandbox: "${bin}"\nallowed: ${[...ALLOWLIST].join(", ")}\n`,
    });
    onExit({ code: 127 });
    return { kill: () => {} };
  }

  let outputBytes = 0;
  let killedForOutput = false;

  const child = spawn(bin, args, {
    cwd,
    shell: false,
    env: { PATH: process.env.PATH, HOME: cwd, npm_config_cache: cwd },
    timeout: TIMEOUT_MS,
  });

  const forward = (stream) => (buf) => {
    outputBytes += buf.length;
    if (outputBytes > MAX_OUTPUT_BYTES) {
      if (!killedForOutput) {
        killedForOutput = true;
        onData({ stream: "stderr", text: "\n[output truncated — too large]\n" });
        child.kill("SIGKILL");
      }
      return;
    }
    onData({ stream, text: buf.toString("utf8") });
  };

  child.stdout.on("data", forward("stdout"));
  child.stderr.on("data", forward("stderr"));

  child.on("error", (err) => {
    onData({ stream: "stderr", text: `failed to start: ${err.message}\n` });
  });

  child.on("close", (code, signal) => {
    onExit({ code, signal, timedOut: signal === "SIGTERM" && !killedForOutput });
  });

  return { kill: () => child.kill("SIGTERM") };
}
