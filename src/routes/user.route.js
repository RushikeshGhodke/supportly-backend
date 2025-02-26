import {Router} from "express";
import {
    registerUser,
    sendOTPAndVerifyLogin,
    loginUser,
} from "../controllers/user.controller.js";
import {verifyJWT} from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/otpverification").post(sendOTPAndVerifyLogin);

export default router; 