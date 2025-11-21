import { Router } from "express";
import { register, login, refresh, logout } from "../controllers/authController";
import { requireUser, requireAdmin, authenticate } from "../middleware/auth";
import { checkKarmaBlacklist } from "../middleware/karmaMiddleware";

const router = Router();

router.post("/register", checkKarmaBlacklist, register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;


