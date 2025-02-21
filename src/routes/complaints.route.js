import { Router } from 'express'
import {registerComplaint,
    getAllComplaints,
    addReply,
    markAsResolved,
    markAsEscalate,
    getEscalatedComplaints,
} from "../controllers/complaint.controller.js";
// import { isAuthenticated, isAdmin } from "../middleware/auth.middleware.js";

const router = Router()

router.route('/registerComplaint').post(registerComplaint);
router.route('/getAllComplaints').get(getAllComplaints);
router.route('/addReply/:complaintId').put(addReply);
router.route('/resolved/:complaintId').put(markAsResolved);
router.route('/escalate/:complaintId').put(markAsEscalate);
router.route('/escalated').get(getEscalatedComplaints);


export default router;