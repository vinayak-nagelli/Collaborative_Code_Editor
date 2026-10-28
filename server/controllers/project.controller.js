import mongoose from "mongoose";
import Project from "../models/Project.js";
import File from "../models/File.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { seedTemplate } from "../services/template.service.js";

const MAX_MEMBERS = Number(process.env.MAX_MEMBERS_PER_PROJECT) || 4;

// GET /api/projects  (owned + shared, with simple filters)
export const listProjects = asyncHandler(async (req, res) => {
  const { filter } = req.query; // "owned" | "shared" | "starred" | undefined(all)
  const userId = req.user._id;

  let query = { $or: [{ owner: userId }, { "members.user": userId }] };
  if (filter === "owned") query = { owner: userId };
  if (filter === "shared") query = { "members.user": userId, owner: { $ne: userId } };
  if (filter === "starred") query = { starredBy: userId };

  const projects = await Project.find(query)
    .sort({ updatedAt: -1 })
    .populate("owner", "name email avatar color")
    .populate("members.user", "name email avatar color")
    .lean();

  res.status(200).json({ success: true, projects });
});

// POST /api/projects
export const createProject = asyncHandler(async (req, res) => {
  const { name, description, template } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Project name is required");
  }

  const project = await Project.create({
    name: name.trim(),
    description: description?.trim() || "",
    template: template || "empty",
    owner: req.user._id,
    members: [],
    maxMembers: MAX_MEMBERS,
  });

  // Seed the initial file tree based on the chosen template (Phase 5).
  await seedTemplate(project._id, req.user._id, template || "empty");

  const populated = await Project.findById(project._id)
    .populate("owner", "name email avatar color")
    .populate("members.user", "name email avatar color");

  res.status(201).json({ success: true, project: populated });
});

// GET /api/projects/:id
export const getProject = asyncHandler(async (req, res) => {
  const project = await req.project.populate([
    { path: "owner", select: "name email avatar color" },
    { path: "members.user", select: "name email avatar color" },
  ]);

  res.status(200).json({ success: true, project, role: req.projectRole });
});

// PUT /api/projects/:id
export const updateProject = asyncHandler(async (req, res) => {
  const { name, description, visibility, settings } = req.body;
  const project = req.project;

  if (name !== undefined) project.name = name.trim();
  if (description !== undefined) project.description = description.trim();
  if (visibility !== undefined) project.visibility = visibility;
  if (settings !== undefined) project.settings = { ...project.settings.toObject(), ...settings };

  await project.save();
  res.status(200).json({ success: true, project });
});

// DELETE /api/projects/:id  (owner only, enforced by route middleware)
export const deleteProject = asyncHandler(async (req, res) => {
  const project = req.project;
  await File.deleteMany({ projectId: project._id });
  await project.deleteOne();
  res.status(200).json({ success: true, message: "Project deleted" });
});

// POST /api/projects/:id/star
export const toggleStar = asyncHandler(async (req, res) => {
  const project = req.project;
  const userId = req.user._id.toString();
  const idx = project.starredBy.findIndex((id) => id.toString() === userId);

  if (idx === -1) project.starredBy.push(req.user._id);
  else project.starredBy.splice(idx, 1);

  await project.save();
  res.status(200).json({ success: true, starred: idx === -1 });
});

// POST /api/projects/:id/invite  (owner only — regenerate/enable/disable)
export const manageInvite = asyncHandler(async (req, res) => {
  const { action, expiresInHours } = req.body; // action: "regenerate" | "enable" | "disable"
  const project = req.project;

  if (action === "regenerate") project.regenerateInvite();
  if (action === "enable") project.inviteEnabled = true;
  if (action === "disable") project.inviteEnabled = false;
  if (expiresInHours !== undefined) {
    project.inviteExpiresAt = expiresInHours
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;
  }

  await project.save();
  res.status(200).json({
    success: true,
    inviteCode: project.inviteCode,
    inviteEnabled: project.inviteEnabled,
    inviteExpiresAt: project.inviteExpiresAt,
  });
});

// GET /api/projects/join/:inviteCode  (preview before joining — used by the invite landing page)
export const previewInvite = asyncHandler(async (req, res) => {
  const { inviteCode } = req.params;
  const project = await Project.findOne({ inviteCode }).populate("owner", "name avatar color");

  if (!project) throw new ApiError(404, "Invite link is invalid");
  if (!project.inviteEnabled) throw new ApiError(410, "This invite link has been disabled");
  if (project.inviteExpiresAt && project.inviteExpiresAt < new Date()) {
    throw new ApiError(410, "This invite link has expired");
  }

  res.status(200).json({
    success: true,
    project: {
      id: project._id,
      name: project.name,
      description: project.description,
      owner: project.owner,
      memberCount: project.members.length + 1,
      maxMembers: project.maxMembers,
      alreadyMember: req.user ? project.isMember(req.user._id) : false,
    },
  });
});

// POST /api/projects/join/:inviteCode  (actually join — requires auth)
export const joinProject = asyncHandler(async (req, res) => {
  const { inviteCode } = req.params;
  const project = await Project.findOne({ inviteCode });

  if (!project) throw new ApiError(404, "Invite link is invalid");
  if (!project.inviteEnabled) throw new ApiError(410, "This invite link has been disabled");
  if (project.inviteExpiresAt && project.inviteExpiresAt < new Date()) {
    throw new ApiError(410, "This invite link has expired");
  }

  if (project.isMember(req.user._id)) {
    return res.status(200).json({ success: true, project, message: "Already a member" });
  }

  const totalMembers = project.members.length + 1; // +1 for owner
  if (totalMembers >= project.maxMembers) {
    throw new ApiError(409, `This workspace is full. Maximum collaborators: ${project.maxMembers}`);
  }

  project.members.push({ user: req.user._id, role: "editor" });
  await project.save();

  const populated = await Project.findById(project._id)
    .populate("owner", "name email avatar color")
    .populate("members.user", "name email avatar color");

  res.status(200).json({ success: true, project: populated });
});

// DELETE /api/projects/:id/members/:memberId  (owner removes a collaborator)
export const removeMember = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const project = req.project;

  if (memberId === project.owner.toString()) {
    throw new ApiError(400, "The owner cannot be removed from their own project");
  }

  project.members = project.members.filter((m) => m.user.toString() !== memberId);
  await project.save();

  res.status(200).json({ success: true, message: "Member removed" });
});

// PUT /api/projects/:id/members/:memberId/role  (owner changes editor/viewer role)
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const { role } = req.body;
  const project = req.project;

  if (!["editor", "viewer"].includes(role)) {
    throw new ApiError(400, "Role must be 'editor' or 'viewer'");
  }

  const member = project.members.find((m) => m.user.toString() === memberId);
  if (!member) throw new ApiError(404, "Member not found");

  member.role = role;
  await project.save();

  res.status(200).json({ success: true, message: "Role updated" });
});
