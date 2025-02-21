import asyncHandler from "../utils/asyncHandler.js";
import {generationConfig, model} from "./gemini.controller.js";
import {Complaint} from "../models/complaint.model.js";
import {response} from "express";
import ApiError from "../utils/ApiError.js";

 const registerComplaint = asyncHandler(async (req, res) => {
    const { tenantId, customerName, email, complaint } = req.body;

    // Start a new chat session with the model
    const chatSession = model.startChat({
        generationConfig,
        history: [
            // Add any previous history if needed
        ],
    });

    // Send the complaint and get the response from the chat model
    const result = await chatSession.sendMessage(complaint);

    // Extract the response text which contains JSON in string format with extra characters (backticks and newlines)
    const rawResult = result?.response?.text() || '';

    // Remove backticks and newlines from the response, then try to parse it into a valid JSON object
    const cleanedResult = rawResult.replace(/```json|```|\n/g, '');

    let parsedResult;
    try {
        // Try to parse the cleaned result into a JSON object
        parsedResult = JSON.parse(cleanedResult);
    } catch (error) {
        // Handle JSON parsing errors
        return res.status(400).json({ error: 'Invalid JSON format' });
    }

    const newComplaint = await Complaint.create({
        organizationId: tenantId,
        customerName,
        email,
        complaint,
        type: parsedResult.type,
        issue: parsedResult.issue,
        priorityScore: parsedResult.priority,
        sentiment: parsedResult.sentiment,

    })

    await newComplaint.save();

    // Log the details for debugging purposes
    console.log(tenantId, customerName, email, complaint, parsedResult);

    // Return the necessary data as a JSON response, including the validated result
    res.status(200).json({ tenantId, customerName, email, complaint, result: parsedResult });
});



const getAllComplaints = asyncHandler(async (req, res) => {
    const {tenantId} = req.body;

    if(!tenantId) {
        throw new ApiError(400, "OrganizationId is required.");
    }
    const complaints = await Complaint.find({organizationId: tenantId});
    

    res.status(200).json(complaints);
});

const addReply = asyncHandler( async(req, res) => {
    const {complaintId} = req.params;
    const {reply} = req.body;

    if(!reply) {
        throw new ApiError(400, "reply is required.");
    }

    const complaint = await Complaint.findById(complaintId);
    if(!complaint) {
        throw new ApiError(400, "comaplaint not found.");
    }
    complaint.reply = reply;
    complaint.status = "Replied";

    await complaint.save();

    res.status(200).json({message: "reply added successfully.", complaint});
});

const markAsResolved = asyncHandler(async(req, res) => {
    const {complaintId} = req.params;
    
    const complaint = await complaint.findById(complaintId);
    if(!complaint) {
        throw new ApiError(400, "complaint not found.");
    }
    complaint.status = "resolved";
    complaint.resolvedAt = new Date();
    await complaint.save();
    res.status(200).json({message: "complaint marked as resolved.", complaint});
});

const markAsEscalate = asyncHandler(async(req, res) => {
    const {complaintId} = req.params;
    
    if(!req.user || req.user.role !== "admin") {
        throw new ApiError(403, "Access denied. only admins can escalate complaints.");
    }
    const complaint = await Complaint.findById(complaintId);
    if(!complaint) {
        throw new ApiError(404, "Complaint not found");
    }

    complaint.status = "Escalated";
    complaint.escalatedAt = new Date();
    complaint.isEscalated = true;

    await complaint.save();

    res.status(200).json({message: "Complaint escalated successfully", complaint});
});

 const getEscalatedComplaints = asyncHandler(async (req, res) => {
    if (!req.user || req.user.role !== "admin") {
        throw new ApiError(403, "Access denied. Only admins can view escalated complaints.");
    }

    const escalatedComplaints = await Complaint.find({ isEscalated: true });

    res.status(200).json(escalatedComplaints);
});


export {
    registerComplaint,
    getAllComplaints,
    addReply,
    markAsResolved,
    markAsEscalate,
    getEscalatedComplaints,
};