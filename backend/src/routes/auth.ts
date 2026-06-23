import { Router } from "express";
import { login, logout, me, register } from "../controllers/authController";
import { attachSessionIfPresent } from "../middleware/requireAuth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", attachSessionIfPresent, me);

export default router;
