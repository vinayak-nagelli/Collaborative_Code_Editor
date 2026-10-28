import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

const DEFAULT_GITIGNORE = `node_modules/
dist/
build/
.next/
__pycache__/
*.pyc
.venv/
venv/
.env
.DS_Store
`;

/**
 * Real git integration (Phase 19's documented seam, now implemented).
 * Runs actual `git` against the project's materialized workspace directory
 * (see workspace.service.js) — the same on-disk copy the terminal uses.
 *
 * Security model, matching terminal.service.js:
 * - `shell: false` — no chaining/injection via the command line
 * - Only the `git` binary is ever spawned, with a fixed, known subcommand set
 * - Every call has a timeout
 *
 * KNOWN LIMITATION (documented, not hidden): a remote URL with embedded
 * credentials (e.g. `https://user:TOKEN@host/repo.git`) is the only auth
 * method supported in this MVP — there's no SSH agent forwarding or OAuth
 * flow. The URL is stored as-is on the Project document; in a production
 * build this should live in a secrets manager, not a plain DB field.
 */
const TIMEOUT_MS = 20_000;

function run(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd, shell: false, timeout: TIMEOUT_MS });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => resolve({ code: -1, stdout, stderr: err.message }));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

export async function ensureRepo(cwd, identity) {
  const status = await run(["rev-parse", "--is-inside-work-tree"], cwd);
  if (status.code !== 0) {
    await run(["init"], cwd);
    await run(["checkout", "-b", "main"], cwd);
  }
  await run(["config", "user.name", identity.name || "CollabIDE User"], cwd);
  await run(["config", "user.email", identity.email || "collabide@example.com"], cwd);

  // The workspace dir is shared with the sandboxed terminal (Phase 11), so
  // `npm install` etc. can leave generated directories sitting right next
  // to the project's real source files. Without this, `git add -A` would
  // happily commit an entire node_modules tree.
  const gitignorePath = path.join(cwd, ".gitignore");
  const exists = await fs.access(gitignorePath).then(() => true).catch(() => false);
  if (!exists) {
    await fs.writeFile(gitignorePath, DEFAULT_GITIGNORE, "utf8");
  }
}

export async function commitAll(cwd, message) {
  await run(["add", "-A"], cwd);
  const diff = await run(["diff", "--cached", "--quiet"], cwd);
  if (diff.code === 0) return { committed: false, message: "Nothing to commit" };
  const result = await run(["commit", "-m", message], cwd);
  return { committed: result.code === 0, stdout: result.stdout, stderr: result.stderr };
}

export async function setRemote(cwd, url) {
  await run(["remote", "remove", "origin"], cwd); // ignore failure if it doesn't exist yet
  return run(["remote", "add", "origin", url], cwd);
}

export async function push(cwd) {
  return run(["push", "-u", "origin", "main"], cwd);
}

export async function pull(cwd) {
  return run(["pull", "origin", "main", "--allow-unrelated-histories", "--no-edit"], cwd);
}

export async function log(cwd, limit = 20) {
  const result = await run(["log", `-${limit}`, "--pretty=format:%H|%an|%ad|%s", "--date=iso"], cwd);
  if (result.code !== 0) return [];
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, ...rest] = line.split("|");
      return { hash, author, date, message: rest.join("|") };
    });
}

// Redacts embedded credentials (user:token@) before ever echoing a URL back
// to a client or logging it.
export function redactRemoteUrl(url) {
  return url.replace(/\/\/[^@/]+@/, "//***@");
}
