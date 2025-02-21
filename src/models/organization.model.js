import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {v4 as uuidv4} from 'uuid';
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
            type: String,
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
        }

    }, 
    
    {timeStamps: true}
);


export const Organization = new mongoose.model("Organization", organizationSchema);