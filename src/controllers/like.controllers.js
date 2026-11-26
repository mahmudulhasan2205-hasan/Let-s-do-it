import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createNotification } from "../utils/createNotification.js";

const toggleLike = async (Model, field, itemId, userId) => {
    if (!mongoose.isValidObjectId(itemId)) throw new ApiError(400, `Invalid ${field} ID`);

    const item = await Model.findById(itemId).select("_id");
    if (!item) throw new ApiError(404, `${field} not found`);

    const filter = { [field]: itemId, likedBy: userId };
    const existingLike = await Like.findOne(filter);

    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id });
        return { liked: false };
    }

    await Like.create(filter);
    return { liked: true };
};

const toggleVideoReaction = async (req, res, reaction) => {
    if (!mongoose.isValidObjectId(req.params.videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findById(req.params.videoId).select("_id owner");
    if (!video) throw new ApiError(404, "Video not found");

    const filter = { video: video._id, likedBy: req.user._id };
    const existingReaction = await Like.findOne(filter);
    let result;

    if (existingReaction?.reaction === reaction || (!existingReaction?.reaction && reaction === "like")) {
        await Like.deleteOne({ _id: existingReaction._id });
        result = { liked: false, disliked: false };
    } else if (existingReaction) {
        existingReaction.reaction = reaction;
        await existingReaction.save();
        result = { liked: reaction === "like", disliked: reaction === "dislike" };
    } else {
        await Like.create({ ...filter, reaction });
        result = { liked: reaction === "like", disliked: reaction === "dislike" };
    }

    if (result.liked) {
        await createNotification({
            recipient: video?.owner,
            actor: req.user._id,
            type: "video_like",
            video: req.params.videoId
        });
    }
    const message = result.liked
        ? "Video liked"
        : result.disliked
            ? "Video disliked"
            : "Video reaction removed";
    return res.status(200).json(new ApiResponse(200, result, message));
};

const toggleVideoLike = asyncHandler(async (req, res) => {
    await toggleVideoReaction(req, res, "like");
});

const toggleVideoDislike = asyncHandler(async (req, res) => {
    await toggleVideoReaction(req, res, "dislike");
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const result = await toggleLike(Comment, "comment", req.params.commentId, req.user._id);
    return res.status(200).json(new ApiResponse(200, result, result.liked ? "Comment liked" : "Comment unliked"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const result = await toggleLike(Tweet, "tweet", req.params.tweetId, req.user._id);
    return res.status(200).json(new ApiResponse(200, result, result.liked ? "Tweet liked" : "Tweet unliked"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const likes = await Like.find({
        likedBy: req.user._id,
        video: { $exists: true },
        $or: [{ reaction: "like" }, { reaction: { $exists: false } }]
    })
        .populate({
            path: "video",
            match: { isPublished: true },
            populate: { path: "owner", select: "fullName username avatar" }
        })
        .sort({ createdAt: -1 });

    const videos = likes.map((like) => like.video).filter(Boolean);
    return res.status(200).json(new ApiResponse(200, videos, "Liked videos fetched successfully"));
});

const getDislikedVideos = asyncHandler(async (req, res) => {
    const dislikes = await Like.find({
        likedBy: req.user._id,
        video: { $exists: true },
        reaction: "dislike"
    })
        .populate({
            path: "video",
            match: { isPublished: true },
            populate: { path: "owner", select: "fullName username avatar" }
        })
        .sort({ createdAt: -1 });

    const videos = dislikes.map((dislike) => dislike.video).filter(Boolean);
    return res.status(200).json(new ApiResponse(200, videos, "Disliked videos fetched successfully"));
});

export { toggleVideoLike, toggleVideoDislike, toggleCommentLike, toggleTweetLike, getLikedVideos, getDislikedVideos };