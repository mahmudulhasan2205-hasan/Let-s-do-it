import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {Video} from "../models/video.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { LoginActivity } from "../models/loginActivity.model.js";
import { Notification } from "../models/notification.model.js";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { sendEmail } from "../utils/email.js";
import { Session } from "../models/session.model.js";

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

if (user.suspended) {
    throw new ApiError(403, "Your account has been suspended")
}

const isPasswordValid = await user.isPasswordCorrect(password)

if (!isPasswordValid) {
    throw new ApiError(401, "Password is incorrect")
}

const userForTwoFactor = await User.findById(user._id).select("+twoFactorSecret twoFactorEnabled")
const twoFactorCode = typeof req.body?.twoFactorCode === "string" ? req.body.twoFactorCode.trim() : ""

if (userForTwoFactor.twoFactorEnabled) {
    if (!twoFactorCode) {
        throw new ApiError(401, "Two-factor code required", [{ code: "TWO_FACTOR_REQUIRED" }])
    }
    const twoFactorResult = verifySync({
        secret: userForTwoFactor.twoFactorSecret,
        token: twoFactorCode,
        digits: 6,
        period: 30,
        epochTolerance: 30,
    })
    if (!twoFactorResult.valid) {
        throw new ApiError(401, "Invalid two-factor code", [{ code: "INVALID_TWO_FACTOR_CODE" }])
    }
}

const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

const forwardedFor = req.header("x-forwarded-for")
const ipAddress = forwardedFor?.split(",")[0]?.trim() || req.ip || "unknown"
const userAgent = req.header("user-agent")?.slice(0, 500) || "unknown"

await Session.create({
    user: user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    ipAddress,
    userAgent,
    lastSeenAt: new Date(),
})

const previousLogins = await LoginActivity.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("ipAddress userAgent")
    .lean()

const trustedLogin = previousLogins.find((activity) =>
    activity.ipAddress === ipAddress && activity.userAgent === userAgent
)
const suspicious = previousLogins.length > 0 && !trustedLogin

const activity = await LoginActivity.create({
    user: user._id,
    ipAddress,
    userAgent,
    suspicious,
})

if (suspicious) {
    await Notification.create({
        recipient: user._id,
        actor: user._id,
        type: "suspicious_login",
    })
    activity.alertSent = true
    await activity.save()
}

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

const incomingRefreshToken = req.cookies?.refreshToken
if (incomingRefreshToken) {
    await Session.updateMany(
        { user: req.user._id, refreshTokenHash: hashRefreshToken(incomingRefreshToken), revokedAt: null },
        { $set: { revokedAt: new Date() } }
    )
}

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

const incomingSession = await Session.findOne({
    user: user._id,
    refreshTokenHash: hashRefreshToken(incomingRefreshToken),
    revokedAt: null,
}).select("+refreshTokenHash")
if (!incomingSession) throw new ApiError(401, "Session has been revoked")

const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);
incomingSession.refreshTokenHash = hashRefreshToken(refreshToken)
incomingSession.lastSeenAt = new Date()
await incomingSession.save()
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

const searchUsers = asyncHandler(async (req, res) => {
    const search = req.query.q?.trim();
    if (!search) {
        return res.status(200).json(new ApiResponse(200, [], "Users fetched successfully"));
    }

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
        $or: [
            { username: { $regex: escapedSearch, $options: "i" } },
            { fullName: { $regex: escapedSearch, $options: "i" } }
        ]
    })
        .select("fullName username avatar coverImage")
        .sort({ username: 1 })
        .limit(8);

    return res.status(200).json(new ApiResponse(200, users, "Users fetched successfully"));
});

const setupTwoFactor = asyncHandler(async (req, res) => {
    const secret = generateSecret()
    const otpauthUrl = generateURI({
        issuer: "Lets-do-it",
        label: req.user.email,
        secret,
        digits: 6,
        period: 30,
    })
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

    return res.status(200).json(new ApiResponse(200, {
        secret,
        qrCodeDataUrl,
    }, "Two-factor setup created"))
})

const enableTwoFactor = asyncHandler(async (req, res) => {
    const { secret, code } = req.body || {}
    if (typeof secret !== "string" || typeof code !== "string") {
        throw new ApiError(400, "Secret and two-factor code are required")
    }

    const twoFactorResult = verifySync({
        secret: secret.trim(),
        token: code.trim(),
        digits: 6,
        period: 30,
        epochTolerance: 30,
    })
    if (!twoFactorResult.valid) {
        throw new ApiError(400, "Invalid two-factor code")
    }

    await User.findByIdAndUpdate(req.user._id, {
        $set: { twoFactorEnabled: true, twoFactorSecret: secret.trim() }
    })

    return res.status(200).json(new ApiResponse(200, { twoFactorEnabled: true }, "Two-factor authentication enabled"))
})

const disableTwoFactor = asyncHandler(async (req, res) => {
    const { code } = req.body || {}
    const user = await User.findById(req.user._id).select("+twoFactorSecret")
    if (!user?.twoFactorEnabled) {
        throw new ApiError(400, "Two-factor authentication is not enabled")
    }

    const twoFactorResult = typeof code === "string"
        ? verifySync({ secret: user.twoFactorSecret, token: code.trim(), digits: 6, period: 30, epochTolerance: 30 })
        : { valid: false }
    if (!twoFactorResult.valid) {
        throw new ApiError(400, "Invalid two-factor code")
    }

    await User.findByIdAndUpdate(req.user._id, {
        $set: { twoFactorEnabled: false },
        $unset: { twoFactorSecret: 1 }
    })

    return res.status(200).json(new ApiResponse(200, { twoFactorEnabled: false }, "Two-factor authentication disabled"))
})

const hashActionToken = (token) => createHash("sha256").update(token).digest("hex");

const forgotPassword = asyncHandler(async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email) throw new ApiError(400, "Email is required");

    const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetExpires");
    if (user) {
        const token = randomBytes(32).toString("hex");
        user.passwordResetTokenHash = hashActionToken(token);
        user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
        await user.save({ validateBeforeSave: false });

        const appUrl = (process.env.APP_URL || "https://lets-do-it-web.vercel.app").replace(/\/$/, "");
        await sendEmail({
            to: user.email,
            subject: "Reset your Lets-do-it password",
            html: `<p>You requested a password reset.</p><p><a href="${appUrl}/reset-password/${token}">Reset your password</a></p><p>This link expires in 30 minutes.</p>`,
        });
    }

    return res.status(200).json(new ApiResponse(200, {}, "If that account exists, a reset link has been sent"));
});

const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== "string" || typeof password !== "string") throw new ApiError(400, "Reset token and new password are required");
    if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters");

    const tokenHash = hashActionToken(token);
    const user = await User.findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires");

    if (!user) throw new ApiError(400, "Reset link is invalid or has expired");

    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
});

const requestEmailVerification = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("+emailVerificationTokenHash +emailVerificationExpires");
    if (user.emailVerified) return res.status(200).json(new ApiResponse(200, {}, "Email is already verified"));

    const token = randomBytes(32).toString("hex");
    user.emailVerificationTokenHash = hashActionToken(token);
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const appUrl = (process.env.APP_URL || "https://lets-do-it-web.vercel.app").replace(/\/$/, "");
    await sendEmail({
        to: user.email,
        subject: "Verify your Lets-do-it email",
        html: `<p>Verify your Lets-do-it email address.</p><p><a href="${appUrl}/verify-email/${token}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
    });

    return res.status(200).json(new ApiResponse(200, {}, "Verification email sent"));
});

const verifyEmail = asyncHandler(async (req, res) => {
    const token = typeof req.params?.token === "string" ? req.params.token : "";
    if (!token) throw new ApiError(400, "Verification token is required");

    const user = await User.findOne({
        emailVerificationTokenHash: hashActionToken(token),
        emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationTokenHash +emailVerificationExpires");

    if (!user) throw new ApiError(400, "Verification link is invalid or has expired");

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, { emailVerified: true }, "Email verified successfully"));
});

const getActiveSessions = asyncHandler(async (req, res) => {
    const sessions = await Session.find({ user: req.user._id, revokedAt: null })
        .sort({ lastSeenAt: -1 })
        .limit(20)
        .select("_id ipAddress userAgent lastSeenAt createdAt")
    return res.status(200).json(new ApiResponse(200, sessions, "Active sessions fetched successfully"))
})

const revokeSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    if (!mongoose.isValidObjectId(sessionId)) throw new ApiError(400, "Invalid session ID")

    const session = await Session.findOneAndUpdate(
        { _id: sessionId, user: req.user._id, revokedAt: null },
        { $set: { revokedAt: new Date() } },
        { new: true }
    )
    if (!session) throw new ApiError(404, "Session not found")

    return res.status(200).json(new ApiResponse(200, {}, "Session revoked successfully"))
})

const revokeAllSessions = asyncHandler(async (req, res) => {
    await Session.updateMany(
        { user: req.user._id, revokedAt: null },
        { $set: { revokedAt: new Date() } }
    )
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } })

    return res.status(200).json(new ApiResponse(200, {}, "All sessions revoked successfully"))
})

const getLoginActivity = asyncHandler(async (req, res) => {
    const activities = await LoginActivity.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()

    return res.status(200).json(
        new ApiResponse(200, activities, "Login activity fetched successfully")
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
        searchUsers,
        getLoginActivity,
        getActiveSessions,
        revokeSession,
        revokeAllSessions,
        setupTwoFactor,
        enableTwoFactor,
        disableTwoFactor,
        forgotPassword,
        resetPassword,
        requestEmailVerification,
        verifyEmail,
        getWatchHistory,
        addToWatchHistory

    }