import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const testRoute = asyncHandler(async(req, res) => {
    res.status(200).json(new ApiResponse(200, {}, "Api is working fine."));
})