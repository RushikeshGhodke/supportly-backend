import { Router } from "express";
import { testRoute } from "../controllers/test.controller.js";
const router = Router();

router.route("/test").get(testRoute);

export default router;