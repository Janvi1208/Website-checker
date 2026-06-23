import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import {
  listSites,
  getSite,
  deleteSite,
  analyzeSite,
  chatWithSite,
  getChatHistory,
} from "../controllers/sitesController";

const router = Router();

router.use(requireAuth);

router.get("/", listSites);
router.post("/analyze", analyzeSite);
router.get("/:id", getSite);
router.delete("/:id", deleteSite);
router.post("/:id/chat", chatWithSite);
router.get("/:id/chat", getChatHistory);

export default router;
