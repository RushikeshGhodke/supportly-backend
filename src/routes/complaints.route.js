import { Router } from 'express'
import {registerComplaint} from "../controllers/complaint.controller.js";

const router = Router()

router.route('/registerComplaint').post(registerComplaint);

export default router