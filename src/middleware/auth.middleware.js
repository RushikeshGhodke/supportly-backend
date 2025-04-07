import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        // Get token from multiple sources with better error handling
        let token;

        // From cookies
        if (req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }
        // From Authorization header
        else if (req.headers.authorization?.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        // From query params (not recommended for production)
        else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            throw new ApiError(401, "Unauthorized request - No token provided");
        }

        // Log for debugging
        console.log("Received token:", token.substring(0, 15) + "...");

        let decodedToken;
        try {
            decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            console.log("Decoded token:", decodedToken);
        } catch (jwtError) {
            console.error("JWT verification error:", jwtError);
            if (jwtError.name === "JsonWebTokenError") {
                throw new ApiError(401, "Invalid token");
            } else if (jwtError.name === "TokenExpiredError") {
                throw new ApiError(401, "Token expired");
            } else {
                throw new ApiError(401, "Token validation error");
            }
        }

        // Find a user with the token's ID
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            console.error("No user found for ID:", decodedToken?._id);
            throw new ApiError(401, "Invalid Access Token - User not found");
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        throw new ApiError(401, error?.message || "Authentication failed");
    }
});

// export const isAuthenticated = (req, res, next) => {
//     if (!req.user) {
//         return res.status(401).json({ message: "Unauthorized. Please log in." });
//     }
//     next();
// };

// export const isAdmin = (req, res, next) => {
//     if (!req.user || req.user.role !== "admin") {
//         return res.status(403).json({ message: "Access denied. Admins only." });
//     }
//     next();
// };
