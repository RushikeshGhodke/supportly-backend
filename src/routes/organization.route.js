import {Router} from "express";
import {
    registerOrganization,
    otpverification
    // getInviteLink,
    // loginOrganization,
    // loginViaInvitedLink,
    // logoutOrganization
} from "../controllers/organization.controller.js";
import {verifyJWT} from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(registerOrganization);
router.route("/otpverification").post(otpverification);

// router.route("/login").post(loginOrganization);
// router.route("/login/invite").post(loginViaInvitedLink);
// router.route("/invite/:tenantId").get(getInviteLink);
// router.route("logout").post(verifyJWT, logoutOrganization);

export default router; 