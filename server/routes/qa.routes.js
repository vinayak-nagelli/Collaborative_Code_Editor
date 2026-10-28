import { Router } from "express";
import requireAuth from "../middleware/auth.js";
import { requireProjectMember, requireEditPermission } from "../middleware/projectAccess.js";
import {
  listTestCases,
  createTestCase,
  updateTestCase,
  runTestCase,
  deleteTestCase,
  listBugs,
  createBug,
  updateBug,
  linkFileToBug,
  unlinkFileFromBug,
  deleteBug,
} from "../controllers/qa.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireProjectMember);

// Test Cases
router.get("/tests", listTestCases);
router.post("/tests", requireEditPermission, createTestCase);
router.put("/tests/:testId", requireEditPermission, updateTestCase);
router.patch("/tests/:testId/run", requireEditPermission, runTestCase);
router.delete("/tests/:testId", requireEditPermission, deleteTestCase);

// Bug Reports
router.get("/bugs", listBugs);
router.post("/bugs", requireEditPermission, createBug);
router.put("/bugs/:bugId", requireEditPermission, updateBug);
router.post("/bugs/:bugId/link-file", requireEditPermission, linkFileToBug);
router.delete("/bugs/:bugId/unlink-file/:fileId", requireEditPermission, unlinkFileFromBug);
router.delete("/bugs/:bugId", requireEditPermission, deleteBug);

export default router;
