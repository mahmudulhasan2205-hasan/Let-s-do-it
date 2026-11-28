import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createNotification } from "../utils/createNotification.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);

    const video = await Video.findOne({ _id: videoId, isPublished: true }).select("_id");
    if (!video) throw new ApiError(404, "Video not found");

    const [comments, totalComments] = await Promise.all([
        Comment.find({ video: videoId, parentComment: null })
            .populate("owner", "fullName username avatar")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Comment.countDocuments({ video: videoId, parentComment: null })
    ]);

    const commentIds = comments.map((comment) => comment._id);
    const replies = commentIds.length
        ? await Comment.find({ video: videoId, parentComment: { $in: commentIds } })
            .populate("owner", "fullName username avatar")
            .sort({ createdAt: 1 })
        : [];
    const allCommentIds = [...commentIds, ...replies.map((reply) => reply._id)];

    const [likeRows, viewerLikes] = await Promise.all([
        allCommentIds.length
            ? Like.find({ comment: { $in: allCommentIds } }).select("comment likedBy")
            : [],
        req.user && allCommentIds.length
            ? Like.find({ comment: { $in: allCommentIds }, likedBy: req.user._id }).select("comment")
            : []
    ]);

    const likeCounts = new Map();
    for (const like of likeRows) {
        const key = String(like.comment);
        likeCounts.set(key, (likeCounts.get(key) || 0) + 1);
    }
    const viewerLikedIds = new Set(viewerLikes.map((like) => String(like.comment)));
    const repliesByParent = new Map();
    for (const reply of replies) {
        const parentId = String(reply.parentComment);
        if (!repliesByParent.has(parentId)) repliesByParent.set(parentId, []);
        repliesByParent.get(parentId).push({
            ...reply.toObject(),
            likeCount: likeCounts.get(String(reply._id)) || 0,
            likedByViewer: viewerLikedIds.has(String(reply._id))
        });
    }

    const enrichedComments = comments.map((comment) => ({
        ...comment.toObject(),
        likeCount: likeCounts.get(String(comment._id)) || 0,
        likedByViewer: viewerLikedIds.has(String(comment._id)),
        replies: repliesByParent.get(String(comment._id)) || []
    }));

    return res.status(200).json(new ApiResponse(200, {
        comments: enrichedComments,
        page,
        limit,
        totalComments,
        totalPages: Math.ceil(totalComments / limit)
    }, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");
    if (!content?.trim()) throw new ApiError(400, "Comment content is required");

    const video = await Video.findOne({ _id: videoId, isPublished: true }).select("_id owner");
    if (!video) throw new ApiError(404, "Video not found");

    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    });

    await createNotification({
        recipient: video.owner,
        actor: req.user._id,
        type: "video_comment",
        video: video._id
    });
    const result = await Comment.findById(comment._id).populate("owner", "fullName username avatar");
    return res.status(201).json(new ApiResponse(201, result, "Comment added successfully"));
});

const addCommentReply = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body || {};
    if (!mongoose.isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");
    if (!content?.trim()) throw new ApiError(400, "Reply content is required");

    const parentComment = await Comment.findById(commentId).populate("owner", "fullName username avatar");
    if (!parentComment) throw new ApiError(404, "Comment not found");

    const reply = await Comment.create({
        content: content.trim(),
        video: parentComment.video,
        owner: req.user._id,
        parentComment: parentComment._id
    });

    await createNotification({
        recipient: parentComment.owner._id,
        actor: req.user._id,
        type: "comment_reply",
        video: parentComment.video
    });

    const result = await Comment.findById(reply._id).populate("owner", "fullName username avatar");
    return res.status(201).json(new ApiResponse(201, {
        ...result.toObject(),
        likeCount: 0,
        likedByViewer: false
    }, "Reply added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    if (!mongoose.isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");
    if (!content?.trim()) throw new ApiError(400, "Comment content is required");

    const comment = await Comment.findOneAndUpdate(
        { _id: commentId, owner: req.user._id },
        { $set: { content: content.trim() } },
        { new: true, runValidators: true }
    ).populate("owner", "fullName username avatar");

    if (!comment) throw new ApiError(404, "Comment not found or you are not its owner");
    return res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!mongoose.isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");

    const comment = await Comment.findOneAndDelete({ _id: commentId, owner: req.user._id });
    if (!comment) throw new ApiError(404, "Comment not found or you are not its owner");

    return res.status(200).json(new ApiResponse(200, comment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, addCommentReply, updateComment, deleteComment };