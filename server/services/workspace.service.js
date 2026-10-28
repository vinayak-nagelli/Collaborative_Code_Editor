import fs from "fs/promises";
import os from "os";
import path from "path";
import File from "../models/File.js";

const ROOT = path.join(os.tmpdir(), "collab-editor-workspaces");

// projectId -> { dir, lastUsed }
const materialized = new Map();
const IDLE_CLEANUP_MS = 30 * 60 * 1000; // reap workspaces unused for 30 min

async function writeTree(projectId, dir) {
  const files = await File.find({ projectId }).lean();
  const byParent = new Map();
  files.forEach((f) => {
    const key = f.parentId ? f.parentId.toString() : "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(f);
  });

  async function walk(parentKey, currentDir) {
    const children = byParent.get(parentKey) || [];
    for (const node of children) {
      const target = path.join(currentDir, node.name);
      if (node.type === "folder") {
        await fs.mkdir(target, { recursive: true });
        await walk(node._id.toString(), target);
      } else {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, node.content || "", "utf8");
      }
    }
  }

  await fs.mkdir(dir, { recursive: true });
  await walk("root", dir);
}

// Returns an on-disk directory containing a fresh copy of the project's
// files, creating it on first use. This is a scratch copy for command
// execution only — it is NOT the source of truth (MongoDB + the live Yjs
// docs are) and is safe to delete/regenerate at any time.
export async function getWorkspaceDir(projectId) {
  const key = projectId.toString();
  const existing = materialized.get(key);
  if (existing) {
    existing.lastUsed = Date.now();
    return existing.dir;
  }

  const dir = path.join(ROOT, key);
  await writeTree(projectId, dir);
  materialized.set(key, { dir, lastUsed: Date.now() });
  return dir;
}

export async function releaseWorkspace(projectId) {
  const key = projectId.toString();
  const entry = materialized.get(key);
  if (!entry) return;
  materialized.delete(key);
  await fs.rm(entry.dir, { recursive: true, force: true }).catch(() => {});
}

/**
 * Walks the on-disk workspace (after e.g. a `git pull`) and reconciles it
 * back into the File collection: updates changed content, creates files
 * that appeared on disk but not in Mongo, and creates missing folders.
 * Intentionally does NOT delete File records for paths that vanished —
 * treating "gone from a git pull" the same as an explicit user delete is
 * a stronger claim than this MVP wants to make automatically.
 */
export async function syncDiskToMongo(projectId, dir, userId, { onFileContentChange } = {}) {
  // Mirrors git.service.js's DEFAULT_GITIGNORE. This walk reads the raw
  // filesystem (not git's tracked index), so excluding these here is not
  // optional — without it, anything a terminal `npm install` generated in
  // this same shared workspace dir would get imported into Mongo as real
  // File records.
  const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "__pycache__", ".venv", "venv"]);

  const LANGUAGE_BY_EXT = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    json: "json", md: "markdown", html: "html", css: "css", py: "python",
  };
  const languageFor = (name) => LANGUAGE_BY_EXT[name.split(".").pop()] || "plaintext";

  let created = 0;
  let updated = 0;

  async function walk(currentDir, parentId, parentPath) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const relPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        let folder = await File.findOne({ projectId, path: relPath, type: "folder" });
        if (!folder) {
          folder = await File.create({
            projectId, parentId, name: entry.name, type: "folder",
            path: relPath, createdBy: userId, lastEditedBy: userId,
          });
          created += 1;
        }
        await walk(fullPath, folder._id, relPath);
      } else {
        const content = await fs.readFile(fullPath, "utf8").catch(() => null);
        if (content === null) continue; // skip unreadable/binary files

        const file = await File.findOne({ projectId, path: relPath, type: "file" });
        if (!file) {
          await File.create({
            projectId, parentId, name: entry.name, type: "file", path: relPath,
            content, language: languageFor(entry.name), createdBy: userId, lastEditedBy: userId,
          });
          created += 1;
        } else if (file.content !== content) {
          if (onFileContentChange) {
            // Caller (e.g. the git-pull handler) decides how this is applied —
            // routing it through ydocManager.restoreDocContent keeps it CRDT-safe
            // for files that are currently open in someone's live editor.
            await onFileContentChange(file, content);
          } else {
            file.content = content;
            file.version += 1;
            file.lastEditedBy = userId;
            await file.save();
          }
          updated += 1;
        }
      }
    }
  }

  await walk(dir, null, "");
  return { created, updated };
}

// Periodic sweep for workspaces nobody has touched in a while.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of materialized) {
    if (now - entry.lastUsed > IDLE_CLEANUP_MS) {
      fs.rm(entry.dir, { recursive: true, force: true }).catch(() => {});
      materialized.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();
