import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {Video} from "../models/video.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import { createHash, timingSafeEqual } from "node:crypto";

const hashRefreshToken = (token) =>
    createHash("sha256").update(token).digest("hex");

const matchesRefreshToken = (storedToken, incomingToken) => {
    if (typeof storedToken !== "string") return false;
    if (storedToken === incomingToken) return true;
    if (!/^[a-f0-9]{64}$/i.test(storedToken)) return false;

    const storedHash = Buffer.from(storedToken, "hex");
    const incomingHash = Buffer.from(hashRefreshToken(incomingToken), "hex");
    return timingSafeEqual(storedHash, incomingHash);
};

const generateAccessTokenAndRefreshToken = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = hashRefreshToken(refreshToken);
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
};

const refreshCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/api/v1/users",
    };
};

const registerUser = asyncHandler(async (req, res) => {
 const {fullName, email, password, username} = req.body || {}

 if ([fullName, email, password, username].some(
    (field) => !field?.trim()
)) {
    throw new ApiError(400, "All fields are required");
}
const existedUser = await User.findOne({
        $or: [
            {email},
            {username}
        ]
})

if (existedUser) {
    throw new ApiError(400, "User already exists")

}

//console.log("req.files:", req.files);

const avatarLocalPath = req.files?.avatar?.[0]?.path;
//const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

let coverImageLocalPath = null;
if (req.files?.coverImage?.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
}


if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required")

}
const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage = await uploadOnCloudinary(coverImageLocalPath)

if (!avatar){
        throw new ApiError(400, "Avatar is required")

}

const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()


})

const createdUser = await User.findById(user._id).select("-password -refreshToken")

if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user")

}

return res.status(201).json(new ApiResponse(200,createdUser, "User created successfully"))

})


const loginUser = asyncHandler(async (req, res) => {

const {email,username, password} = req.body

const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";

if ((!normalizedEmail && !normalizedUsername) || typeof password !== "string" || !password) {
    throw new ApiError(400, "Email or username and password are required")
}

const user = await User.findOne(
    normalizedEmail
        ? {email: normalizedEmail}
        : {username: normalizedUsername}
)

if (!user) {
    throw new ApiError(404, "User not found")
}

const isPasswordValid = await user.isPasswordCorrect(password)

if (!isPasswordValid) {
    throw new ApiError(401, "Password is incorrect")
}

const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

const cookieOptions = refreshCookieOptions();

return res
.status(200)
.clearCookie("accessToken", cookieOptions)
.cookie("refreshToken", refreshToken, cookieOptions)
.json(
    new ApiResponse(
        200,
        {
            user: loggedInUser,
            accessToken,
        },
        "User logged in Successfully"
    )
)
}

)

const logoutUser = asyncHandler(async(req, res) => {

await User.findByIdAndUpdate(req.user._id,{

    $unset: { refreshToken: 1 }
},
{
    new: true
}
)
const cookieOptions = refreshCookieOptions();

return res.status(200)
.clearCookie("refreshToken", cookieOptions)
.clearCookie("accessToken", cookieOptions)
.clearCookie("accessToken", { ...cookieOptions, path: "/" })
.json(new ApiResponse(200,{},"User logged Out"))

}) 

const refreshAccessToken = asyncHandler(async(req, res) => 
{
   const incomingRefreshToken = req.cookies?.refreshToken

   if (!incomingRefreshToken){

    throw new ApiError(401, "Unauthorized request")
}

let decodedToken;
try {
    decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    );
} catch {
    throw new ApiError(401, "Invalid or expired refresh token");
}

const user = await User.findById(decodedToken?._id);
if (!user || !matchesRefreshToken(user.refreshToken, incomingRefreshToken)) {
    throw new ApiError(401, "Invalid or expired refresh token");
}

const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);
return res
    .status(200)
    .cookie("refreshToken", refreshToken, refreshCookieOptions())
    .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

const changeCurrentPassword = asyncHandler (async(req, res) => {
    const {oldPassword, newPassword} = req.body
    if (typeof oldPassword !== "string" || !oldPassword || typeof newPassword !== "string" || !newPassword) {
        throw new ApiError(400, "Current and new passwords are required");
    }
    if (newPassword.length < 8) {
        throw new ApiError(400, "New password must be at least 8 characters");
    }

    const user = await User.findById(req.user?._id);
    if (!user) throw new ApiError(404, "User not found");
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    
   if (!isPasswordCorrect){
    throw new ApiError(400, "Invalid Old password")
   }

   user.password = newPassword 
   await user.save({validateBeforeSave: false})

return res.status(200)
        .json(new ApiResponse(200, {},"Password Changed Successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user,"Current user fetched successfully"))
})

const  updateAccountDetails = asyncHandler (async(req,res) => {
    const {fullName, email} = req.body

    if (!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }
const user = await User.findByIdAndUpdate(req.user?._id,

    {
        $set: {
           fullName: fullName,
            email: email
        }
    },
    {new: true}
).select("-password")

return res.status(200)
          .json(new ApiResponse(200,user ,"Account details updated successfully"))

});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalpath = req.file?.path
    if(!avatarLocalpath){
        throw new ApiError (400, "Avatar file is missing")
    }
  const avatar = await  uploadOnCloudinary(avatarLocalpath)
  if (!avatar.url){
    throw new ApiError(400, "Error while uploading on avatar")


  }

const user = await User.findByIdAndUpdate(req.user?._id,
    {
        $set:{
            avatar: avatar.url
        }
    },
    {new: true}
).select("-password")

return res.status(200)
          .json(new ApiResponse(200,user ,"Avatar Image updated successfully"))


})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalpath = req.file?.path
    if(!coverImageLocalpath){
        throw new ApiError (400, "CoverImage file is missing")
    }
  const coverImage = await  uploadOnCloudinary(coverImageLocalpath)
  if (!coverImage.url){
    throw new ApiError(400, "Error while uploading on coverImage")


  }

const user = await User.findByIdAndUpdate(req.user?._id,
    {
        $set:{
            coverImage: coverImage.url
        }
    },
    {new: true}
).select("-password")

return res.status(200)
          .json(new ApiResponse(200,user ,"CoverImage updated successfully"))


})

const getUserChannelProfile = asyncHandler (async(req, res) => {
     const {username} = req.params 
     const viewerId = req.user?._id || null;

     if (!username?.trim()){
        throw new ApiError(400, "username is missing")
     }

     const channel = await User.aggregate([

        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
           $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
           }
        },
        {
            $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
           }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $and: [
                        { $ne: [viewerId, null] },
                        { $in: [viewerId, "$subscribers.subscriber"] }
                    ]
            }
        }
},
{
    $project: {
        fullName: 1,
        username: 1,
        subscribersCount:1,
        channelsSubscribedToCount: 1,
        isSubscribed:1,
        avatar: 1,
        coverImage:1
}
}
])

if(!channel?.length){
    throw new ApiError(404, "Channel does not exists")
}
return res
   .status(200)
   .json(
    new ApiResponse(200, channel[0], "User Channel  fetched successfully")
   )

})

const getWatchHistory = asyncHandler (async(req, res) => {
          const user = await User.aggregate([
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
            $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline:[
                {
                    
            $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                {
                    $project: {
                        fullName:1,
                        username:1,
                        avatar:1
                    }
                }
            ]
           }
        },
           {
            $addFields:{
                owner: {
                    $first: "$owner"
                }
            }
           }          
            ]
           }
        },
          ])

   return res.status(200)
      .json(
        new ApiResponse(200, user[0].watchHistory,"Watch history fetched")
      )
   


})

const addToWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findOne({ _id: videoId, isPublished: true }).select("_id");
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const user = await User.findById(req.user._id).select("watchHistory");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    user.watchHistory = [
        video._id,
        ...user.watchHistory.filter((watchedVideoId) => watchedVideoId.toString() !== videoId),
    ].slice(0, 100);
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, user.watchHistory, "Watch history updated")
    );
});


export {registerUser, 
        loginUser, 
        logoutUser, 
        refreshAccessToken, 
        changeCurrentPassword, 
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile,
        getWatchHistory,
        addToWatchHistory

    }