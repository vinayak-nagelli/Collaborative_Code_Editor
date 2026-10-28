import Project from "../models/Project.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Loads the project referenced by :id / :projectId and verifies the
// authenticated user is a member (owner, editor, or viewer). Attaches
// `req.project` and `req.projectRole` for downstream handlers.
export const requireProjectMember = asyncHandler(async (req, _res, next) => {
  const projectId = req.params.projectId || req.params.id;
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  if (!project.isMember(req.user._id)) {
    throw new ApiError(403, "You do not have access to this project");
  }

  req.project = project;
  req.projectRole = project.roleOf(req.user._id);
  next();
});

// Restricts a route to users with the "owner" role on the loaded project.
export const requireProjectOwner = asyncHandler(async (req, _res, next) => {
  if (req.projectRole !== "owner") {
    throw new ApiError(403, "Only the project owner can perform this action");
  }
  next();
});

// Restricts a route to users who can write (owner or editor), blocking viewers.
export const requireEditPermission = asyncHandler(async (req, _res, next) => {
  if (req.projectRole !== "owner" && req.projectRole !== "editor") {
    throw new ApiError(403, "You only have read access to this project");
  }
  next();
});
