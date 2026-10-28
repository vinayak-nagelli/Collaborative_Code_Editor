import File from "../models/File.js";
import FileVersion from "../models/FileVersion.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import * as git from "../services/git.service.js";
import { getWorkspaceDir, syncDiskToMongo } from "../services/workspace.service.js";
import { restoreDocContent } from "../collaboration/ydocManager.js";

// POST /api/projects/:id/git/remote  { url }
export const setGitRemote = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url || !/^https?:\/\//.test(url)) {
    throw new ApiError(400, "A valid https:// remote URL is required");
  }

  const project = req.project;
  project.settings.gitRemoteUrl = url;
  await project.save();

  const cwd = await getWorkspaceDir(project._id);
  await git.ensureRepo(cwd, { name: req.user.name, email: req.user.email });
  await git.setRemote(cwd, url);

  res.status(200).json({ success: true, remote: git.redactRemoteUrl(url) });
});

// POST /api/projects/:id/git/push  { message }
export const gitPush = asyncHandler(async (req, res) => {
  const project = req.project;
  if (!project.settings?.gitRemoteUrl) {
    throw new ApiError(400, "Set a remote URL first (Source Control → Set Remote)");
  }

  const cwd = await getWorkspaceDir(project._id);
  await git.ensureRepo(cwd, { name: req.user.name, email: req.user.email });
  await git.setRemote(cwd, project.settings.gitRemoteUrl); // idempotent, keeps it current

  const commitResult = await git.commitAll(cwd, req.body.message?.trim() || "Sync from CollabIDE");
  const pushResult = await git.push(cwd);

  if (pushResult.code !== 0) {
    throw new ApiError(502, `git push failed: ${pushResult.stderr.slice(0, 500)}`);
  }

  res.status(200).json({ success: true, committed: commitResult.committed, output: pushResult.stdout });
});

// POST /api/projects/:id/git/pull
export const gitPull = asyncHandler(async (req, res) => {
  const project = req.project;
  if (!project.settings?.gitRemoteUrl) {
    throw new ApiError(400, "Set a remote URL first (Source Control → Set Remote)");
  }

  const cwd = await getWorkspaceDir(project._id);
  await git.ensureRepo(cwd, { name: req.user.name, email: req.user.email });
  await git.setRemote(cwd, project.settings.gitRemoteUrl);

  const pullResult = await git.pull(cwd);
  if (pullResult.code !== 0) {
    throw new ApiError(502, `git pull failed: ${pullResult.stderr.slice(0, 500)}`);
  }

  const io = req.app.get("io");
  const { created, updated } = await syncDiskToMongo(project._id, cwd, req.user._id, {
    // Route existing-file changes through the CRDT layer so a pulled file
    // that's currently open in someone's editor gets merged, not clobbered.
    onFileContentChange: async (file, content) => {
      const fullStateUpdate = await restoreDocContent(file._id, content);
      io?.to(`file:${file._id}`).emit("yjs-update", { fileId: file._id, update: Array.from(fullStateUpdate) });
    },
  });

  // Let everyone in the room know the file tree may have changed (new files
  // created by the pull) so their Explorer refetches.
  io?.to(`project:${project._id}`).emit("files-synced", { created, updated });

  res.status(200).json({ success: true, created, updated, output: pullResult.stdout });
});

// GET /api/projects/:id/git/log
export const getGitLog = asyncHandler(async (req, res) => {
  const cwd = await getWorkspaceDir(req.project._id);
  const commits = await git.log(cwd);
  res.status(200).json({ success: true, commits });
});

// GET /api/projects/:id/changes
// Compares each file's current content against its most recent COMMIT
// snapshot (a FileVersion with a non-empty `message`). Files with no prior
// commit are reported as Added; files whose content differs are Modified;
// files that were committed but no longer have a File record are reported
// as Deleted (see the second loop below, which relies on FileVersion.path
// since the File document itself is gone by that point).
export const getChanges = asyncHandler(async (req, res) => {
  const files = await File.find({ projectId: req.project._id, type: "file" }).lean();
  const currentFileIds = new Set(files.map((f) => f._id.toString()));

  const changes = [];
  for (const file of files) {
    const lastCommit = await FileVersion.findOne({ fileId: file._id, message: { $ne: "" } })
      .sort({ createdAt: -1 })
      .lean();

    if (!lastCommit) {
      changes.push({ fileId: file._id, path: file.path, status: "A" });
    } else if (lastCommit.content !== file.content) {
      changes.push({ fileId: file._id, path: file.path, status: "M" });
    }
  }

  // Deleted: any fileId that was ever committed but no longer has a File
  // record. We rely on FileVersion.path (a snapshot taken at commit time)
  // since the File document itself — and its path — is gone.
  const committedFileIds = await FileVersion.distinct("fileId", {
    projectId: req.project._id,
    message: { $ne: "" },
  });

  for (const committedId of committedFileIds) {
    if (currentFileIds.has(committedId.toString())) continue;
    const lastKnown = await FileVersion.findOne({ fileId: committedId, message: { $ne: "" } })
      .sort({ createdAt: -1 })
      .lean();
    if (lastKnown) {
      changes.push({ fileId: committedId, path: lastKnown.path || "(unknown path)", status: "D" });
    }
  }

  res.status(200).json({ success: true, changes });
});

// POST /api/projects/:id/commit  { message }
// NOTE: this commits Added/Modified files. A file reported as Deleted in
// getChanges will keep showing as Deleted indefinitely — "committing" a
// deletion (so it stops appearing) would need an explicit tombstone record,
// which isn't implemented yet. This mirrors `git add` on new/changed files
// without a `git rm` equivalent.
export const commitChanges = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) throw new ApiError(400, "A commit message is required");

  const files = await File.find({ projectId: req.project._id, type: "file" }).lean();
  let committed = 0;

  for (const file of files) {
    const lastCommit = await FileVersion.findOne({ fileId: file._id, message: { $ne: "" } })
      .sort({ createdAt: -1 })
      .lean();

    if (!lastCommit || lastCommit.content !== file.content) {
      await FileVersion.create({
        fileId: file._id,
        projectId: req.project._id,
        content: file.content,
        path: file.path,
        editedBy: req.user._id,
        message: message.trim(),
      });
      committed += 1;
    }
  }

  res.status(201).json({ success: true, committedFiles: committed });
});

// GET /api/projects/:id/commits  — commit log (most recent first)
export const getCommitLog = asyncHandler(async (req, res) => {
  const commits = await FileVersion.find({ projectId: req.project._id, message: { $ne: "" } })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("editedBy", "name color")
    .populate("fileId", "path")
    .lean();

  res.status(200).json({ success: true, commits });
});
