import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import  {Organization} from "../models/organization.model.js";
import asyncHandler from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    //  _instead of res as no use of response
    try {
        const token = req.cookies?.accessToken || req.header("Authorization"?.replace("Bearer ",  ""));

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await Organization.findById(decodedToken?._id).select(
            "-password -refreshtoken"
        );

        if(!user) {
            throw new ApiError(401, "Invalid Access Token")
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message);
    }
})