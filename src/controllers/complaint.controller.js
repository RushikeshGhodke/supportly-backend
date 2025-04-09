import asyncHandler from "../utils/asyncHandler.js";
import {generationConfig, model} from "./gemini.controller.js";
import {Complaint} from "../models/complaint.model.js";
import {User} from "../models/user.model.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

const registerComplaint = asyncHandler(async (req, res) => {
    const { customerName, email, complaint, channel = "Web" } = req.body;

    if ([customerName, email, complaint].some(field => !field?.trim())) {
        throw new ApiError(400, "Name, email and complaint are required");
    }

    // Start a new chat session with the model
    const chatSession = model.startChat({
        generationConfig,
        history: [],
    });

    // Send the complaint and get the response from Gemini AI
    const result = await chatSession.sendMessage(complaint);

    // Extract the response text which contains JSON in string format with extra characters
    const rawResult = result?.response?.text() || '';

    // Remove backticks and newlines from the response, then try to parse it into a valid JSON object
    const cleanedResult = rawResult.replace(/```json|```|\n/g, '');

    let parsedResult;
    try {
        // Try to parse the cleaned result into a JSON object
        parsedResult = JSON.parse(cleanedResult);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid JSON format from AI' });
    }

    // Auto-assign to the user with the least active complaints if priority is high
    let assignedTo = null;
    if (parsedResult.priorityScore >= 4) {
        const agents = await User.find({ role: "Agent" });
        if (agents.length > 0) {
            // Get count of active complaints for each agent
            const assignmentCounts = await Promise.all(
                agents.map(async (agent) => {
                    const count = await Complaint.countDocuments({
                        assignedTo: agent._id,
                        status: { $in: ["Pending", "InProgress"] }
                    });
                    return { agentId: agent._id, count };
                })
            );
            
            // Find agent with least active complaints
            const leastBusyAgent = assignmentCounts.reduce(
                (min, curr) => (curr.count < min.count ? curr : min),
                assignmentCounts[0]
            );
            
            assignedTo = leastBusyAgent.agentId;
        }
    }

    const newComplaint = await Complaint.create({
        customerName,
        email,
        complaint,
        channel,
        type: parsedResult.type,
        issue: parsedResult.issue,
        priorityScore: parsedResult.priorityScore,
        sentiment: parsedResult.sentiment,
        assignedTo
    });

    // If assigned, add to history
    if (assignedTo) {
        newComplaint.history.push({
            status: "Assigned",
            comment: "Auto-assigned due to high priority",
            changedBy: null,
            changedAt: new Date()
        });
        
        await newComplaint.save();
    }

    res.status(201).json(new ApiResponse(201, {newComplaint}, "New complaint registered successfully"));
});

const getAllComplaints = asyncHandler(async (req, res) => {
    const { status, priority, type, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priorityScore = parseInt(priority);
    if (type) filter.type = type;
    
    const skip = (page - 1) * limit;
    
    const complaints = await Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("assignedTo", "fullname email");
    
    const totalComplaints = await Complaint.countDocuments(filter);
    
    res.status(200).json(new ApiResponse(200, {
        complaints,
        pagination: {
            total: totalComplaints,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(totalComplaints / limit)
        }
    }, "Complaints retrieved successfully"));
});

const getComplaintById = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    
    const complaint = await Complaint.findById(complaintId)
        .populate("assignedTo", "fullname email")
        .populate("resolvedBy", "fullname email");
    
    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }
    
    res.status(200).json(new ApiResponse(200, { complaint }, "Complaint details retrieved"));
});

const assignComplaint = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    const { agentId } = req.body;
    
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }
    
    const agent = await User.findById(agentId);
    if (!agent) {
        throw new ApiError(404, "Agent not found");
    }
    
    complaint.assignedTo = agentId;
    complaint.status = "InProgress";
    
    complaint.history.push({
        status: "Assigned",
        comment: `Assigned to ${agent.fullname}`,
        changedBy: req.user._id,
        changedAt: new Date()
    });
    
    await complaint.save();
    
    res.status(200).json(new ApiResponse(200, { complaint }, "Complaint assigned successfully"));
});

const addReply = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    const { reply } = req.body;

    if (!reply) {
        throw new ApiError(400, "Reply is required");
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }
    
    complaint.reply = reply;
    complaint.status = "Resolved";
    complaint.complaintResolveTime = new Date();
    complaint.resolvedBy = req.user._id;
    
    complaint.history.push({
        status: "Resolved",
        comment: "Complaint resolved with reply",
        changedBy: req.user._id,
        changedAt: new Date()
    });
    
    await complaint.save();

    res.status(200).json(new ApiResponse(200, { complaint }, "Reply added and complaint resolved"));
});

const markAsResolved = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    const { comment } = req.body;
    
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }
    
    complaint.status = "Resolved";
    complaint.complaintResolveTime = new Date();
    complaint.resolvedBy = req.user._id;
    
    complaint.history.push({
        status: "Resolved",
        comment: comment || "Marked as resolved",
        changedBy: req.user._id,
        changedAt: new Date()
    });
    
    await complaint.save();
    
    res.status(200).json(new ApiResponse(200, { complaint }, "Complaint marked as resolved"));
});

const markAsEscalate = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    const { reason } = req.body;
    
    if (!req.user || req.user.role !== "Admin") {
        throw new ApiError(403, "Access denied. Only admins can escalate complaints");
    }
    
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }

    complaint.status = "Escalated";
    complaint.isEscalated = true;
    
    complaint.history.push({
        status: "Escalated",
        comment: reason || "Escalated by admin",
        changedBy: req.user._id,
        changedAt: new Date()
    });
    
    await complaint.save();

    res.status(200).json(new ApiResponse(200, { complaint }, "Complaint escalated successfully"));
});

const getEscalatedComplaints = asyncHandler(async (req, res) => {
    if (!req.user || req.user.role !== "Admin") {
        throw new ApiError(403, "Access denied. Only admins can view escalated complaints");
    }

    const escalatedComplaints = await Complaint.find({ isEscalated: true })
        .populate("assignedTo", "fullname email")
        .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, { complaints: escalatedComplaints }, "Escalated complaints retrieved"));
});

const getDashboardStats = asyncHandler(async (req, res) => {
    // Get counts for different statuses
    const pending = await Complaint.countDocuments({ status: "Pending" });
    const inProgress = await Complaint.countDocuments({ status: "InProgress" });
    const resolved = await Complaint.countDocuments({ status: "Resolved" });
    const escalated = await Complaint.countDocuments({ status: "Escalated" });
    
    // Get counts by priority
    const lowPriority = await Complaint.countDocuments({ priorityScore: { $lte: 2 } });
    const mediumPriority = await Complaint.countDocuments({ priorityScore: 3 });
    const highPriority = await Complaint.countDocuments({ priorityScore: { $gte: 4 } });
    
    // Get counts by channel
    const byChannel = await Complaint.aggregate([
        { $group: { _id: "$channel", count: { $sum: 1 } } }
    ]);
    
    // Get counts by type
    const byType = await Complaint.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);
    
    // Get response time metrics
    const resolvedComplaints = await Complaint.find({ 
        status: "Resolved",
        complaintRegistrationTime: { $exists: true },
        complaintResolveTime: { $exists: true }
    });
    
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    
    resolvedComplaints.forEach(complaint => {
        if (complaint.complaintRegistrationTime && complaint.complaintResolveTime) {
            const responseTime = complaint.complaintResolveTime - complaint.complaintRegistrationTime;
            totalResponseTime += responseTime;
            responseTimeCount++;
        }
    });
    
    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    
    // Get recent complaints
    const recentComplaints = await Complaint.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("assignedTo", "fullname");
    
    res.status(200).json(new ApiResponse(200, {
        counts: {
            total: pending + inProgress + resolved + escalated,
            pending,
            inProgress,
            resolved,
            escalated
        },
        priority: {
            low: lowPriority,
            medium: mediumPriority,
            high: highPriority
        },
        byChannel,
        byType,
        performance: {
            averageResponseTime: averageResponseTime / (1000 * 60 * 60), // Convert to hours
            totalResolved: resolved
        },
        recentComplaints
    }, "Dashboard statistics retrieved"));
});

export {
    registerComplaint,
    getAllComplaints,
    getComplaintById,
    assignComplaint,
    addReply,
    markAsResolved,
    markAsEscalate,
    getEscalatedComplaints,
    getDashboardStats
};