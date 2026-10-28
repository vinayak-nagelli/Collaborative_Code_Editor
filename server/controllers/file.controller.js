import File from "../models/File.js";
import Project from "../models/Project.js";
import FileVersion from "../models/FileVersion.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const LANGUAGE_BY_EXT = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  json: "json", md: "markdown", html: "html", css: "css", py: "python",
};
const languageFor = (filename) => LANGUAGE_BY_EXT[filename.split(".").pop()] || "plaintext";

// GET /api/projects/:projectId/files  -> full tree for a project
export const listFiles = asyncHandler(async (req, res) => {
  const files = await File.find({ projectId: req.project._id })
    .sort({ type: -1, name: 1 }) // folders first, alphabetical
    .lean();
  res.status(200).json({ success: true, files });
});

// POST /api/projects/:projectId/files  { name, type, parentId }
export const createFile = asyncHandler(async (req, res) => {
  const { name, type, parentId = null } = req.body;
  const project = req.project;

  if (!name || !name.trim()) throw new ApiError(400, "A name is required");
  if (!["file", "folder"].includes(type)) throw new ApiError(400, "type must be 'file' or 'folder'");

  let parentPath = "";
  if (parentId) {
    const parent = await File.findOne({ _id: parentId, projectId: project._id });
    if (!parent || parent.type !== "folder") throw new ApiError(400, "Invalid parent folder");
    parentPath = parent.path;
  }

  const path = parentPath ? `${parentPath}/${name.trim()}` : name.trim();

  const exists = await File.findOne({ projectId: project._id, path });
  if (exists) throw new ApiError(409, "A file or folder with that name already exists here");

  const doc = await File.create({
    projectId: project._id,
    parentId,
    name: name.trim(),
    type,
    path,
    language: type === "file" ? languageFor(name) : "plaintext",
    createdBy: req.user._id,
    lastEditedBy: req.user._id,
  });

  res.status(201).json({ success: true, file: doc });
});

// Recomputes `path` for a node and (recursively) all of its descendants —
// used after rename or move operations so the materialized path stays correct.
async function repathSubtree(fileDoc, newPath) {
  fileDoc.path = newPath;
  await fileDoc.save();

  if (fileDoc.type !== "folder") return;

  const children = await File.find({ parentId: fileDoc._id });
  for (const child of children) {
    await repathSubtree(child, `${newPath}/${child.name}`);
  }
}

// PUT /api/files/:id  { name?, content?, parentId? }  (rename / move / edit)
export const updateFile = asyncHandler(async (req, res) => {
  const { name, content, parentId } = req.body;
  const file = await File.findById(req.params.id);
  if (!file) throw new ApiError(404, "File not found");

  const project = await Project.findById(file.projectId);
  if (!project || !project.isMember(req.user._id)) {
    throw new ApiError(403, "You do not have access to this file");
  }
  const role = project.roleOf(req.user._id);
  if (role === "viewer") throw new ApiError(403, "You only have read access to this project");

  // Content edits normally arrive via the Socket.IO collaboration layer
  // (debounced autosave), but this REST path supports direct saves too.
  if (content !== undefined) {
    if (file.content !== content) {
      await FileVersion.create({
        fileId: file._id,
        projectId: file.projectId,
        content: file.content,
        editedBy: req.user._id,
      });
    }
    file.content = content;
    file.version += 1;
    file.lastEditedBy = req.user._id;
  }

  const isRename = name !== undefined && name.trim() !== file.name;
  const isMove = parentId !== undefined && String(parentId) !== String(file.parentId);

  if (isRename || isMove) {
    let parentPath = "";
    const targetParentId = isMove ? parentId : file.parentId;

    if (targetParentId) {
      const parent = await File.findOne({ _id: targetParentId, projectId: file.projectId });
      if (!parent || parent.type !== "folder") throw new ApiError(400, "Invalid target folder");
      parentPath = parent.path;
    }

    const newName = isRename ? name.trim() : file.name;
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    const clash = await File.findOne({ projectId: file.projectId, path: newPath, _id: { $ne: file._id } });
    if (clash) throw new ApiError(409, "A file or folder with that name already exists here");

    file.name = newName;
    file.parentId = targetParentId;
    if (isRename && file.type === "file") file.language = languageFor(newName);

    await repathSubtree(file, newPath);
  }

  await file.save();
  res.status(200).json({ success: true, file });
});

// POST /api/files/:id/duplicate
export const duplicateFile = asyncHandler(async (req, res) => {
  const original = await File.findById(req.params.id);
  if (!original) throw new ApiError(404, "File not found");
  if (original.type !== "file") throw new ApiError(400, "Only files can be duplicated");

  const project = await Project.findById(original.projectId);
  if (!project || !project.isMember(req.user._id)) throw new ApiError(403, "Access denied");

  const extIndex = original.name.lastIndexOf(".");
  const base = extIndex > 0 ? original.name.slice(0, extIndex) : original.name;
  const ext = extIndex > 0 ? original.name.slice(extIndex) : "";

  let copyName = `${base} copy${ext}`;
  let counter = 2;
  const parentPath = original.path.includes("/") ? original.path.slice(0, original.path.lastIndexOf("/")) : "";
  while (await File.findOne({ projectId: original.projectId, path: parentPath ? `${parentPath}/${copyName}` : copyName })) {
    copyName = `${base} copy ${counter}${ext}`;
    counter += 1;
  }

  const copy = await File.create({
    projectId: original.projectId,
    parentId: original.parentId,
    name: copyName,
    type: "file",
    path: parentPath ? `${parentPath}/${copyName}` : copyName,
    content: original.content,
    language: original.language,
    createdBy: req.user._id,
    lastEditedBy: req.user._id,
  });

  res.status(201).json({ success: true, file: copy });
});

// DELETE /api/files/:id  (recursively deletes folder contents)
export const deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);
  if (!file) throw new ApiError(404, "File not found");

  const project = await Project.findById(file.projectId);
  if (!project || !project.isMember(req.user._id)) throw new ApiError(403, "Access denied");
  if (project.roleOf(req.user._id) === "viewer") throw new ApiError(403, "Read-only access");

  const idsToDelete = [file._id];

  async function collectDescendants(folderId) {
    const children = await File.find({ parentId: folderId });
    for (const child of children) {
      idsToDelete.push(child._id);
      if (child.type === "folder") await collectDescendants(child._id);
    }
  }

  if (file.type === "folder") await collectDescendants(file._id);

  await File.deleteMany({ _id: { $in: idsToDelete } });
  res.status(200).json({ success: true, deletedIds: idsToDelete });
});

// GET /api/files/:id/versions  (version history panel)
export const getFileVersions = asyncHandler(async (req, res) => {
  const versions = await FileVersion.find({ fileId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("editedBy", "name color")
    .lean();
  res.status(200).json({ success: true, versions });
});

// POST /api/files/:id/snapshot (manual checkpoint creation for easy revert)
export const createFileSnapshot = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const file = await File.findById(req.params.id);
  if (!file) throw new ApiError(404, "File not found");

  const project = await Project.findById(file.projectId);
  if (!project || !project.isMember(req.user._id)) throw new ApiError(403, "Access denied");
  if (project.roleOf(req.user._id) === "viewer") throw new ApiError(403, "Read-only access");

  const snapshot = await FileVersion.create({
    fileId: file._id,
    projectId: file.projectId,
    content: file.content || "",
    path: file.path,
    editedBy: req.user._id,
    message: message || "Manual Checkpoint / Original Form",
  });

  const populated = await snapshot.populate("editedBy", "name color");
  res.status(201).json({ success: true, version: populated });
});

