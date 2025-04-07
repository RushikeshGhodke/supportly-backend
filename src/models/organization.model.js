import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {v4 as uuidv4} from 'uuid';

const setTotalComplaintsBasedOnPlan = (plan) => {
    switch (plan) {
        case 'Free':
            return 50;
        case 'Starter':
            return 500;
        case 'Pro':
            return 5000;
        case 'Enterprise':
            return 'Unlimited'; // You can store "Unlimited" as a string or as null to represent no limit.
        default:
            return 0; // Default case if plan is not set correctly
    }
};


const organizationSchema = new Schema (
    {
        businessname: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        email: {
            type: String, 
            required: true,
            unique: true,
        },
        plan: {
            type: String,
            enum: ['Free', 'Starter', 'Pro', 'Enterprise'],
        },
        totalComplaints: {
            type: String,
        },
        usedComplaints: {
            type: Number,
            default: 0,
        },
        industrytype: {
            type: String,
            required: true,
        },
        inviteToken: {
            type: String,
            unique: true,
        },
        otp: {
            type: String,
        },
        otpexpiry: {
            type: Date,
        },
        address: {
            type: String,
        },
        logo: {
            type: String,
        },
        timezone: {
            type: String, 
        },
        timezonefrom: {
            type: String,
        },
        timezoneto: {
            type: String,
        },
        isverified: {
            type: Boolean,
            default: false,
        }

    }, 
    
    {timeStamps: true}
);

organizationSchema.pre("save", async function (next) {
    if (this.plan) {
        this.totalComplaints = setTotalComplaintsBasedOnPlan(this.plan);
    }
    next();
})

export const Organization = new mongoose.model("Organization", organizationSchema);