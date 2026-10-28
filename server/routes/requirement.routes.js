import { Router } from "express";
import requireAuth from "../middleware/auth.js";
import { requireProjectMember, requireEditPermission } from "../middleware/projectAccess.js";
import {
  listRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  toggleCriterion,
  deleteRequirement,
} from "../controllers/requirement.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireProjectMember);

router.get("/", listRequirements);
router.post("/", requireEditPermission, createRequirement);
router.get("/:reqId", getRequirement);
router.put("/:reqId", requireEditPermission, updateRequirement);
router.patch("/:reqId/criteria/:criterionId/toggle", requireEditPermission, toggleCriterion);
router.delete("/:reqId", requireEditPermission, deleteRequirement);

export default router;
