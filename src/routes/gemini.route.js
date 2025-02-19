import { Router } from "express";
import { generate } from "../controllers/gemini.controller.js";

const router = Router();

router.route("/generate").post(generate);

export default router;