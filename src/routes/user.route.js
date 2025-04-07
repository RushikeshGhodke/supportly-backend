import { Router } from "express";
import {
    registerUser,
    sendOTPAndVerifyLogin,
    loginUser,
    verifyToken,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/otpverification").post(sendOTPAndVerifyLogin);
// Add this route
router.route("/verify-token").get(verifyJWT, verifyToken);

export default router;