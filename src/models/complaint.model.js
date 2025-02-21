import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose, {Schema} from "mongoose";

const complaintSchema = new Schema (
    {
        fullname: {
            type:String,
            required: true,
        },
        email: {
            type:String,
            required: true,
        },
        phoneNumber: {
            type: String,
        },
        organizationName: {
            type: String,
            required: true,
        },
        organizationEmail: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },

    }, 

    {timestamps: true}
);

export const Complaint = new mongoose.model("Complaint", complaintSchema);