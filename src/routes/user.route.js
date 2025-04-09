import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    updateUserProfile,
    updateUserPreferences
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// Protected routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/profile").get(verifyJWT, getCurrentUser);
router.route("/profile").patch(verifyJWT, updateUserProfile);
router.route("/preferences").patch(verifyJWT, updateUserPreferences);

export default router;