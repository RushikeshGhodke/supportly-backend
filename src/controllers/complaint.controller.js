import asyncHandler from "../utils/asyncHandler.js";
import {generationConfig, model} from "./gemini.controller.js";
import {Complaint} from "../models/complaint.model.js";
import {response} from "express";

export const registerComplaint = asyncHandler(async (req, res) => {
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

