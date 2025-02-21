import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {Organization} from "../models/organization.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer"
import bcrypt from "bcryptjs";
import {v4 as uuidv4} from 'uuid';


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
        console.log(userId);
        
        const user = await User.findById(userId);
        console.log(user);
        

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        console.log(accessToken);
        console.log(refreshToken);
        

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating tokens.", error);
    }
};


const registerUser = asyncHandler(async (req, res) => {
    const {fullname, email, password} = req.body;

    if([fullname, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    console.log(fullname, email, password);
    

    const existingUser = await User.findOne({email});
    if(existingUser) {
        throw new ApiError(409, "user already exist.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
        fullname,
        email,
        password: hashedPassword,
        role: "Admin",
        // otp: Math.floor(100000 + Math.random() * 900000),
        // expirytime: new Date(Date.now() + 10 * 60 * 1000),
    }); 


    const accessToken = newUser.generateAccessToken();
    const refreshToken = newUser.generateRefreshToken();

    newUser.refreshToken = refreshToken;

    res.cookie("refreshToken", refreshToken, { httpOnly: true});


    // const isCreated = await User.findById(newUser._id).select("-password -refreshToken");

    // if(!isCreated) {
    //     throw new ApiError(500, "Something went wrong on server");
    // }

    res.status(201).json({ message: "User registered successfully." });

});

const sendOTPAndVerifyLogin = asyncHandler(async (req, res) => {
    const {email, otp} = req.body;
    
    try{
        if(otp) {
            const user = await User.findOne({ email});
            if(!user) {
                throw new ApiError(404, "User not found");
            }
            if(user.otp !== otp || new Date() > user.expirytime) {
                throw new ApiError(400, "Invalid or expired otp");
            }

            user.otp = null;
            user.expirytime = null;

            if(!user.role) {
                user.role =" Admin";
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
        else{
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
    const { username, email, password } = req.body;
    console.log(username);
    console.log(email);
    
    if(!(username || email)) {
        throw new ApiError(400, "Username or Email is required.");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid) {
        throw new ApiError(404, "Wrong Password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
    };
    
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken }));
});

export {
    registerUser,
    sendOTPAndVerifyLogin,
    loginUser,
}