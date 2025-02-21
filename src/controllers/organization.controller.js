import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import { Organization } from "../models/organization.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer"
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';


// const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// const sendEmail = async (email, otp) => {
//     const transporter = nodemailer.createTransport({
//         service: "Gmail",
//         auth: {
//             user: process.env.EMAIL_USERNAME,
//             pass: process.env.EMAIL_PASSWORD,
//         },
//     });

//     await transporter.sendMail({
//         from: process.env.EMAIL_USERNAME,
//         to: email,
//         subject: "Organization Registration OTP",
//         text: `Your OTP for organization verification is: ${otp}`,
//       });
// };

const registerOrganization = asyncHandler(async (req, res) => {
    console.log(req.body);
    const { businessname, email, industrytype } = req.body;

    if ([businessname, email, industrytype].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const otp = Math.floor(1000 + Math.random() * 9000); // Generate 6-digit OTP
    const otpexpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    const inviteToken = Math.floor(1000 + Math.random() * 900000); 

    console.log(businessname, email, industrytype);

    console.log(otp);

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    const existingOrganization = await Organization.findOne({ email });
    if (existingOrganization) {
        throw new ApiError(409, "organization already exist");
    }



    const newOrganization = await Organization.create({
        businessname,
        email: user.email,
        password: user.password,
        industrytype,
        otp,
        otpexpiry,
        inviteToken,
    });

    user.organizationId = newOrganization._id;
    await user.save();

    res.status(201).json({ message: "Organization registered and linked to user" });

});

const otpverification = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    // Check if the required fields are provided
    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }

    // Find the organization by email
    const existingOrganization = await Organization.findOne({ email });
    if (!existingOrganization) {
        throw new ApiError(404, "Organization not found");
    }

    // Check if OTP is valid
    if (existingOrganization.otp !== otp) {
        throw new ApiError(400, "Invalid OTP");
    }

    // Check if OTP is expired
    const currentTime = new Date();
    if (currentTime > existingOrganization.otpexpiry) {
        throw new ApiError(400, "OTP has expired");
    }

    // Clear OTP and expiry
    existingOrganization.otp = null;
    existingOrganization.otpexpiry = null;
    existingOrganization.isverified = true;


    await existingOrganization.save();

    // Send a success response
    res.status(200).json({ message: "OTP verified successfully" });
});


// const loginOrganization = asyncHandler(async (req, res) => {
//     const {name, email, password} = req.body;

//     if(!(name || email)) {
//         throw new ApiError(400, "OrganizationName or Email is required");
//     }

//     const organization = await Organization.findOne({
//         $or: [{email}, {name}],
//     });

//     if(!organization) {
//         throw new ApiError(404, "organization does not exist");
//     }

//     const isPasswordValid = await organization.isPasswordCorrect(password);
//     if(!isPasswordValid) {
//         throw new ApiError(404, "Wrong Password");
//     }

//     const { accessToken, refreshToken } = await generateAccessAndRefreshToken(organization._id);

//     const loggedInOrganization = await Organization.findById(organization._id).select("-password -refreshToken");

//     const options = {
//         httpOnly: true,
//         secure: true,
//     };

//     return res
//     .status(200)
//     .cookie("accessToken", accessToken, options)
//     .cookie("refreshToken", refreshToken, options)
//     .json(new ApiResponse(200, {user: loggedInOrganization, accessToken, refreshToken }));
// });


// const getInviteLink = async (req, res) => {
//     const {tenantId} = req.params;

//     try {
//         const organization = await Organization.findOne({tenantId});
//         if(!organization) {
//             return res.status(400).json({error: 'Organization not found'});
//         }

//         const inviteLink = `${process.env.localhost/5173}/register?inviteToken=${organization.inviteToken}`;

//         res.status(200).json({
//             message: 'Invitation link retrived successfully.',
//             inviteLink
//         });
//     } catch(error) {
//         console.error('Error retrieving invitation link:', error);
//         res.status(500).json({error: 'Internal server error'})
//     }
// };

// const loginViaInvitedLink = asyncHandler(async (req, res) => {
//     const {tenantId, email, password} = req.body;
//     if(!(email || password)) {
//         throw new ApiError(400, "Email and password are required");
//     }

//     const organization = await Organization.findOne({email});

//     if(!organization) {
//         throw new ApiError(404, "Organization not found");
//     }

//     const isPasswordValid = await organization.isPasswordCorrect(password);
//     if(!isPasswordValid) {
//         throw new ApiError(401, "Invalid Password");
//     }

//     const { accessToken, refreshToken} = await generateAccessAndRefreshToken(organization._id);

//     const options = {
//         httpOnly: true,
//         secure: true
//     }
//      return res
//         ,status(200)
//         .cookie("accessToken", accessToken, options)
//         .cookie("refreshToken", refreshToken, options)
//         .json(new ApiResponse(200, {user: organization, accessToken, refreshToken}));
// });

// const logoutOrganization = asyncHandler(async( req, res) => {
//     await Organization.findByIdAndUpate(
//         req.organization._id,
//         {
//             $unset: {
//                 refreshToken: 1,
//             },
//         },
//         {
//             new: true,
//         }
//     );
//     const options = {
//         httpOnly: true,
//         secure: true,
//     };

//     return res 
//         .status(200)
//         .clearCookie("accessToken", options)
//         .clearCookie("refreshToken", options)
//         .json(new ApiResponse(200, {}, "User logged out"));
// });



export {
    registerOrganization,
    otpverification
    // getInviteLink,
    // loginOrganization,
    // loginViaInvitedLink,
    // logoutOrganization
};