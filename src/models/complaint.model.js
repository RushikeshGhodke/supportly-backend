import mongoose, { Schema } from "mongoose";

const complaintSchema = new Schema(
    {
        customerName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        complaint: {
            type: String,
            required: true
        },
        channel: {
            type: String,
            enum: ["Web", "Email", "Social", "Chat"],
            default: "Web"
        },
        type: {
            type: String,
            default: "General"
        },
        issue: {
            type: String,
            default: "Uncategorized"
        },
        priorityScore: {
            type: Number,
            default: 3
        },
        sentiment: {
            type: String,
            default: "Neutral"
        },
        status: {
            type: String,
            enum: ["Pending", "InProgress", "Resolved", "Escalated"],
            default: "Pending"
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        complaintRegistrationTime: {
            type: Date,
            default: Date.now
        },
        complaintResolveTime: {
            type: Date,
            default: null
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        attachments: [{
            type: String
        }],
        history: [
            {
                status: { type: String },
                comment: { type: String },
                changedBy: { type: Schema.Types.ObjectId, ref: "User" },
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
    },
    { timestamps: true }
);

export const Complaint = mongoose.model("Complaint", complaintSchema);