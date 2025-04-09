import asyncHandler from "../utils/asyncHandler.js";
import { Channel } from "../models/channel.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

const getChannels = asyncHandler(async (req, res) => {
    const channels = await Channel.find()
        .populate("autoAssignTo", "fullname email");
    
    res.status(200).json(new ApiResponse(200, { channels }, "Channels retrieved successfully"));
});

const getChannelById = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    
    const channel = await Channel.findById(channelId)
        .populate("autoAssignTo", "fullname email");
    
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }
    
    res.status(200).json(new ApiResponse(200, { channel }, "Channel retrieved successfully"));
});

const createChannel = asyncHandler(async (req, res) => {
    const { name, config, autoAssignTo } = req.body;
    
    if (!name) {
        throw new ApiError(400, "Channel name is required");
    }
    
    // Check if a channel with the same name already exists
    const existingChannel = await Channel.findOne({ name });
    if (existingChannel) {
        throw new ApiError(409, `A channel with name "${name}" already exists`);
    }
    
    // Validate autoAssignTo if provided
    if (autoAssignTo) {
        const agent = await User.findById(autoAssignTo);
        if (!agent) {
            throw new ApiError(404, "Specified agent not found");
        }
    }
    
    const newChannel = await Channel.create({
        name,
        config: config || {},
        autoAssignTo: autoAssignTo || null
    });
    
    res.status(201).json(new ApiResponse(201, { channel: newChannel }, "Channel created successfully"));
});

const updateChannel = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const updates = req.body;
    
    // Only allow certain fields to be updated
    const allowedUpdates = ["isActive", "config", "autoAssignTo"];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
            updateData[field] = updates[field];
        }
    });
    
    // Validate autoAssignTo if provided
    if (updateData.autoAssignTo) {
        const agent = await User.findById(updateData.autoAssignTo);
        if (!agent) {
            throw new ApiError(404, "Specified agent not found");
        }
    }
    
    const updatedChannel = await Channel.findByIdAndUpdate(
        channelId,
        updateData,
        { new: true }
    ).populate("autoAssignTo", "fullname email");
    
    if (!updatedChannel) {
        throw new ApiError(404, "Channel not found");
    }
    
    res.status(200).json(new ApiResponse(200, { channel: updatedChannel }, "Channel updated successfully"));
});

const deleteChannel = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    
    const deletedChannel = await Channel.findByIdAndDelete(channelId);
    
    if (!deletedChannel) {
        throw new ApiError(404, "Channel not found");
    }
    
    res.status(200).json(new ApiResponse(200, {}, "Channel deleted successfully"));
});

export {
    getChannels,
    getChannelById,
    createChannel,
    updateChannel,
    deleteChannel
};