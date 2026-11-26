import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";
import { Notification } from "../models/notification.model.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body || {};
    if (typeof content !== "string" || !content.trim()) {
        throw new ApiError(400, "Post content is required");
    }
    if (content.trim().length > 500) throw new ApiError(400, "Posts must be 500 characters or fewer");

    const tweet = await Tweet.create({ content: content.trim(), owner: req.user._id });
    const subscribers = await Subscription.find({ channel: req.user._id })
        .select("subscriber")
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();
    if (subscribers.length) {
        await Notification.insertMany(subscribers.map(({ subscriber }) => ({
            recipient: subscriber,
            actor: req.user._id,
            type: "new_community_post"
        })));
    }
    return res.status(201).json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getCommunityFeed = asyncHandler(async (req, res) => {
    const subscriptions = await Subscription.find({ subscriber: req.user._id })
        .select("channel")
        .limit(500)
        .lean();
    const creatorIds = [...new Set([String(req.user._id), ...subscriptions.map(({ channel }) => String(channel))])];
    const posts = await Tweet.find({ owner: { $in: creatorIds } })
        .populate("owner", "fullName username avatar")
        .sort({ createdAt: -1 })
        .limit(100);

    return res.status(200).json(new ApiResponse(200, posts, "Community feed fetched successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID");

    const tweets = await Tweet.find({ owner: userId })
        .populate("owner", "fullName username avatar")
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body || {};
    if (!mongoose.isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet ID");
    if (typeof content !== "string" || !content.trim()) throw new ApiError(400, "Post content is required");
    if (content.trim().length > 500) throw new ApiError(400, "Posts must be 500 characters or fewer");

    const tweet = await Tweet.findOneAndUpdate(
        { _id: tweetId, owner: req.user._id },
        { $set: { content: content.trim() } },
        { new: true, runValidators: true }
    );

    if (!tweet) throw new ApiError(404, "Tweet not found or you are not its owner");
    return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!mongoose.isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet ID");

    const tweet = await Tweet.findOneAndDelete({ _id: tweetId, owner: req.user._id });
    if (!tweet) throw new ApiError(404, "Tweet not found or you are not its owner");

    return res.status(200).json(new ApiResponse(200, tweet, "Tweet deleted successfully"));
});

export { createTweet, getCommunityFeed, getUserTweets, updateTweet, deleteTweet };