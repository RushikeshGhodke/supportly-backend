import { Router } from 'express';
import {
    getChannels,
    getChannelById,
    createChannel,
    updateChannel,
    deleteChannel
} from "../controllers/channel.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

router.route('/')
    .get(getChannels)
    .post(createChannel);

router.route('/:channelId')
    .get(getChannelById)
    .put(updateChannel)
    .delete(deleteChannel);

export default router;