import { Router } from "express";
import {
    registerOrganization,
    otpVerification,
    resendOTP,
    inviteTeamMember,
    joinOrganization,
    getOrganizationInfo
} from "../controllers/organization.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.route("/register").post(registerOrganization);
router.route("/otpverification").post(otpVerification);
router.route("/resend-otp").post(resendOTP);

// Protected routes
router.route("/invite/:organizationId").post(verifyJWT, inviteTeamMember);
router.route("/join").post(verifyJWT, joinOrganization);
router.route("/info").get(verifyJWT, getOrganizationInfo);

export default router;