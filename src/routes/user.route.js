import { Router } from "express";
import {
    registerUser,
    loginUser,
    sendOTPAndVerifyLogin,
    verifyToken
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/verify-otp").post(sendOTPAndVerifyLogin);

// Protected routes
router.route("/verify-token").get(verifyJWT, verifyToken);
router.route("/logout").post(verifyJWT, (req, res) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(200).json({ success: true, message: "Logged out successfully" });
});

export default router;