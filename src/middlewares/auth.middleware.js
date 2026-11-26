import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
//console.log("ACCESS_TOKEN_SECRET loaded:", Boolean(process.env.ACCESS_TOKEN_SECRET));

const decodeAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
        throw new ApiError(401, "Invalid or expired access token");
    }
};

export const verifyJWT = asyncHandler(async (req, res, next) => {

    const token = req.header("Authorization")?.replace("Bearer ", "") ||
        req.cookies?.accessToken;

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }
    const decodedToken = decodeAccessToken(token);

    const user = await User.findById(decodedToken?._id)
        .select("-password -refreshToken");

    if (!user) {
        throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
});

export const optionalVerifyJWT = asyncHandler(async (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "") ||
        req.cookies?.accessToken;

    if (!token) {
        return next();
    }

    const decodedToken = decodeAccessToken(token);

    const user = await User.findById(decodedToken?._id)
        .select("-password -refreshToken");

    if (!user) {
        throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
});