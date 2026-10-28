import { Router } from "express";
import requireAuth from "../middleware/auth.js";
import { requireProjectMember, requireProjectOwner, requireEditPermission } from "../middleware/projectAccess.js";
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  toggleStar,
  manageInvite,
  previewInvite,
  joinProject,
  removeMember,
  updateMemberRole,
} from "../controllers/project.controller.js";
import { listFiles, createFile } from "../controllers/file.controller.js";
import { getChanges, commitChanges, getCommitLog, setGitRemote, gitPush, gitPull, getGitLog } from "../controllers/sourceControl.controller.js";
import requirementRoutes from "./requirement.routes.js";
import taskRoutes from "./task.routes.js";
import qaRoutes from "./qa.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.use(requireAuth);

router.get("/", listProjects);
router.post("/", createProject);

// Invite preview/join — must come before "/:id" to avoid route collision
router.get("/join/:inviteCode", previewInvite);
router.post("/join/:inviteCode", joinProject);

router.get("/:id", requireProjectMember, getProject);
router.put("/:id", requireProjectMember, requireProjectOwner, updateProject);
router.delete("/:id", requireProjectMember, requireProjectOwner, deleteProject);

router.post("/:id/star", requireProjectMember, toggleStar);
router.post("/:id/invite", requireProjectMember, requireProjectOwner, manageInvite);

router.delete("/:id/members/:memberId", requireProjectMember, requireProjectOwner, removeMember);
router.put("/:id/members/:memberId/role", requireProjectMember, requireProjectOwner, updateMemberRole);

// File explorer, scoped under a project
router.get("/:projectId/files", requireProjectMember, listFiles);
router.post("/:projectId/files", requireProjectMember, createFile);

// Source control (Phase 13)
router.get("/:id/changes", requireProjectMember, getChanges);
router.post("/:id/commit", requireProjectMember, requireEditPermission, commitChanges);
router.get("/:id/commits", requireProjectMember, getCommitLog);

// Real git integration (Phase 19)
router.post("/:id/git/remote", requireProjectMember, requireEditPermission, setGitRemote);
router.post("/:id/git/push", requireProjectMember, requireEditPermission, gitPush);
router.post("/:id/git/pull", requireProjectMember, requireEditPermission, gitPull);
router.get("/:id/git/log", requireProjectMember, getGitLog);

// Phase 2 — Requirements & Tasks Traceability
router.use("/:projectId/requirements", requirementRoutes);
router.use("/:projectId/tasks", taskRoutes);

// Phase 3 — QA & Bug Tracking
router.use("/:projectId/qa", qaRoutes);

// Phase 4 — Project Health & Workload Dashboard
router.use("/:projectId/dashboard", dashboardRoutes);

export default router;
