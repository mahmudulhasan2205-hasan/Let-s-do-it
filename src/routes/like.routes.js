import { Router } from "express";
import {
    toggleVideoLike, toggleVideoDislike, toggleCommentLike, toggleTweetLike, getLikedVideos, getDislikedVideos
} from "../controllers/like.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/videos").get(verifyJWT, getLikedVideos);
router.route("/videos/disliked").get(verifyJWT, getDislikedVideos);
router.route("/videos/:videoId").post(verifyJWT, toggleVideoLike);
router.route("/videos/:videoId/dislike").post(verifyJWT, toggleVideoDislike);
router.route("/comments/:commentId").post(verifyJWT, toggleCommentLike);
router.route("/tweets/:tweetId").post(verifyJWT, toggleTweetLike);

export default router;