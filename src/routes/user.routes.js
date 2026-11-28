import { Router } from "express";
import { loginUser, 
         logoutUser, 
         registerUser ,
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
         getWatchHistory,
         setupTwoFactor,
         enableTwoFactor,
         disableTwoFactor,
         forgotPassword,
         resetPassword,
         requestEmailVerification,
         verifyEmail,
         addToWatchHistory} from "../controllers/user.controllers.js";
import { upload, validateUploadedFiles } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";



const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    validateUploadedFiles(["avatar"]),
    registerUser
)

router.route("/login").post(loginUser)
router.route("/forgot-password").post(forgotPassword)
router.route("/reset-password").post(resetPassword)
router.route("/verify-email/:token").get(verifyEmail)
router.route("/request-email-verification").post(verifyJWT, requestEmailVerification)

router.route("/logout").post(verifyJWT  ,logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT,changeCurrentPassword)

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/update-account").patch(verifyJWT,updateAccountDetails)

router.route("/avatar").patch(
    verifyJWT,
    upload.single("avatar"),
    validateUploadedFiles(["avatar"]),
    updateUserAvatar
)

router.route("/cover-image").patch(
    verifyJWT,
    upload.single("coverImage"),
    validateUploadedFiles(["coverImage"]),
    updateUserCoverImage
)

router.route("/search").get(searchUsers)
router.route("/c/:username").get(getUserChannelProfile)

router.route("/2fa/setup").post(verifyJWT, setupTwoFactor)
router.route("/2fa/enable").post(verifyJWT, enableTwoFactor)
router.route("/2fa/disable").post(verifyJWT, disableTwoFactor)
router.route("/security/sessions").get(verifyJWT, getActiveSessions)
router.route("/security/sessions/revoke-all").post(verifyJWT, revokeAllSessions)
router.route("/security/sessions/:sessionId/revoke").post(verifyJWT, revokeSession)
router.route("/security/login-activity").get(verifyJWT, getLoginActivity)
router.route("/history").get(verifyJWT, getWatchHistory)
router.route("/history/:videoId").post(verifyJWT,addToWatchHistory)

export default router;