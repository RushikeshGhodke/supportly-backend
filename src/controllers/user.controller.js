import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { Organization } from "../models/organization.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer"
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';


// const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// const sendemail = async(email, otp) => {
//     const transporter = nodemailer.createTransport({
//         service: "Gmail",
//         auth: {
//             user: process.env.EMAIL_USERNAME,
//             pass: process.env.EMAIL_PASSWORD,
//         },
//     });
// };


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found when generating tokens");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Token generation error:", error);
        throw new ApiError(500, "Something went wrong while creating tokens");
    }
};


const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, password } = req.body;

    if ([fullname, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ApiError(409, "User already exists");
    }

    // Store password directly without hashing
    const newUser = await User.create({
        fullname,
        email,
        password: password, // Store plaintext password
        role: "Admin",
    });

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(newUser._id);

    const user = await User.findOne({ email }).select("-refreshToken -password");

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(201, { user, accessToken, refreshToken }, "User successfully created"));
});

const sendOTPAndVerifyLogin = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    try {
        if (otp) {
            const user = await User.findOne({ email });
            if (!user) {
                throw new ApiError(404, "User not found");
            }
            if (user.otp !== otp || new Date() > user.expirytime) {
                throw new ApiError(400, "Invalid or expired otp");
            }

            user.otp = null;
            user.expirytime = null;

            if (!user.role) {
                user.role = " Admin";
            }
            await user.save();

            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();

            user.refreshToken = refreshToken;
            await user.save();

            res.cookie("refreshToken", refreshToken, { httpOnly: true });

            return res.status(200).json({
                message: "OTP verified successfully. User logged in.",
                accessToken,
            });
        }
        else {
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Generate a new OTP
            user.otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
            user.expirytime = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

            await user.save();

            // Send OTP email using nodemailer
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Your OTP Code",
                text: `Your OTP code is ${user.otp}. It will expire in 10 minutes.`,
            };

            await transporter.sendMail(mailOptions);

            return res.status(200).json({ message: "OTP sent to email." });
        }
    } catch (error) {
        res.status(500).json({ message: "Error processing request", error });
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Use the simplified direct comparison method
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        // Add more debugging
        console.log("Password comparison failed:");
        console.log("Input password:", password);
        console.log("Stored password:", user.password);
        throw new ApiError(401, "Invalid credentials");
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // Get user without sensitive fields for the response
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: loggedInUser,
            accessToken,
            refreshToken
        }, "Login successful"));
});

// Add this function to your controller

const verifyToken = asyncHandler(async (req, res) => {
    // The user is already verified via middleware
    const user = await User.findById(req.user._id).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(new ApiResponse(200, { user }, "Token verified successfully"));
});

// New function to handle organization selection
const selectOrganizationOption = asyncHandler(async (req, res) => {
    const { option } = req.body; // 'create' or 'join'
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    user.organizationStatus = option === 'create' ? 'creating' : 'joining';
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, { organizationStatus: user.organizationStatus },
            `User set to ${option} an organization`)
    );
});

// Function to check user's organization status
const checkOrganizationStatus = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).populate('organization');
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, {
            organizationStatus: user.organizationStatus,
            organization: user.organization
        }, "Organization status retrieved")
    );
});

// Send OTP for email verification
const sendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Generate a new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Update user with OTP
    user.otp = otp;
    user.expirytime = expiryTime;
    await user.save({ validateBeforeSave: false });

    // Send email with OTP
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Email Verification Code",
        text: `Your verification code is ${otp}. It will expire in 10 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #0061A1; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Email Verification</h1>
                </div>
                <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
                    <p>Hello,</p>
                    <p>Thank you for signing up! Please use the following code to verify your email address:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                </div>
                <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                    <p>© ${new Date().getFullYear()} Customer Support. All rights reserved.</p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json(
        new ApiResponse(200, { email }, "Verification code sent to email")
    );
});

// Verify OTP
const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if OTP is valid and not expired
    if (user.otp !== otp) {
        throw new ApiError(400, "Invalid verification code");
    }

    if (user.expirytime < new Date()) {
        throw new ApiError(400, "Verification code has expired");
    }

    // Clear OTP fields and mark email as verified
    user.otp = null;
    user.expirytime = null;
    user.isEmailVerified = true;
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                success: true,
                user: user.toObject(),
                accessToken,
                refreshToken
            }, "Email verified successfully")
        );
});

// Export the function
export {
    registerUser,
    sendOTPAndVerifyLogin,
    loginUser,
    verifyToken,
    selectOrganizationOption,
    checkOrganizationStatus,
    sendOTP,
    verifyOTP
}