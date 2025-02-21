import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose, {Schema} from "mongoose";

const complaintSchema = new Schema (
    {
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: "Organization",
        }, // Auto-assigned from URL
        customerName: { type: String, required: true },
        email: { type: String, required: true },
        complaint: { type: String, required: true },
        type: { type: String, default: "General" }, // AI will update this
        issue: { type: String, default: "Uncategorized" }, // AI will update this
        priorityScore: { type: Number, default: 3 }, // AI will update this
        sentiment: { type: String, default: "Neutral" }, // AI will update this
        status: { type: String, enum: ["Pending", "Resolved", "Escalated"], default: "Pending" },
        complaintRegistrationTime: { type: Date, default: Date.now },
        complaintResolveTime: { type: Date, default: null }, // Updated when resolved
        resolvedBy: { type: String, default: null }, // Stores resolver's name
        attachments: [{ type: String }], // URLs for uploaded files/screenshots
        history: [
            {
                status: { type: String },
                changedAt: { type: Date, default: Date.now },
            },
        ],
        reply: {
            type: String,
            default: null,
        },
        isEscalated: {
            type: Boolean,
            default: false,
        },
    }, { timestamps: true }


);

export const Complaint = new mongoose.model("Complaint", complaintSchema);