import { Router } from "express";
import {
    createTweet, getCommunityFeed, getUserTweets, updateTweet, deleteTweet
} from "../controllers/tweet.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createTweet);
router.route("/feed").get(verifyJWT, getCommunityFeed);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch(verifyJWT, updateTweet).delete(verifyJWT, deleteTweet);

export default router;