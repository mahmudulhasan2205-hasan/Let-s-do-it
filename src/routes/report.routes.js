import { Router } from "express";
import {
    createReport,
    getReports,
    resolveReport,
    removeReportedContent
} from "../controllers/report.controllers.js";
import { requireModerator, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", verifyJWT, createReport);
router.get("/", verifyJWT, requireModerator, getReports);
router.patch("/:reportId/resolve", verifyJWT, requireModerator, resolveReport);
router.patch("/:reportId/remove", verifyJWT, requireModerator, removeReportedContent);

export default router;
