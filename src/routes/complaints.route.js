import { Router } from 'express';
import {
    registerComplaint,
    getAllComplaints,
    getComplaintById,
    assignComplaint,
    addReply,
    markAsResolved,
    markAsEscalate,
    getEscalatedComplaints,
    getDashboardStats
} from "../controllers/complaint.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Public route for registering complaints (can be used by website forms)
router.route('/register').post(registerComplaint);

// Protected routes for complaint management
router.route('/').get(verifyJWT, getAllComplaints);
router.route('/dashboard').get(verifyJWT, getDashboardStats);
router.route('/escalated').get(verifyJWT, getEscalatedComplaints);
router.route('/:complaintId').get(verifyJWT, getComplaintById);
router.route('/:complaintId/assign').post(verifyJWT, assignComplaint);
router.route('/:complaintId/reply').post(verifyJWT, addReply);
router.route('/:complaintId/resolve').put(verifyJWT, markAsResolved);
router.route('/:complaintId/escalate').put(verifyJWT, markAsEscalate);

export default router;