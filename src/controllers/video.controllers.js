import mongoose from "mongoose";
import { rm } from "node:fs/promises";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { VideoView } from "../models/videoView.model.js";
import { Like } from "../models/like.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    uploadOnCloudinary,
    uploadVideoOnCloudinary,
    deleteCloudinaryVideo
} from "../utils/cloudinary.js";
import { isValidShortDuration } from "../utils/videoValidation.js";

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description, isShort: shortInput } = req.body || {};
    if (shortInput !== undefined && shortInput !== "true" && shortInput !== "false") {
        throw new ApiError(400, "Invalid video type");
    }
    const isShort = shortInput === "true";
    const videoPath = req.files?.videoFile?.[0]?.path;
    const thumbnailPath = req.files?.thumbnail?.[0]?.path;

    if (typeof title !== "string" || !title.trim() ||
        typeof description !== "string" || !description.trim()) {
        throw new ApiError(400, "Title and description are required");
    }
    if (!videoPath || !thumbnailPath) {
        throw new ApiError(400, "Video file and thumbnail are required");
    }

    const videoUpload = await uploadVideoOnCloudinary(videoPath);

    if (!videoUpload?.url) {
        throw new ApiError(502, "Video upload failed");
    }
    const duration = Number(videoUpload.duration) || 0;
    if (isShort && !isValidShortDuration(duration)) {
        await Promise.all([
            deleteCloudinaryVideo(videoUpload.public_id),
            rm(thumbnailPath, { force: true })
        ]);
        throw new ApiError(400, "Short videos must be between 1 and 60 seconds long");
    }

    const thumbnailUpload = await uploadOnCloudinary(thumbnailPath);
    if (!thumbnailUpload?.url) {
        throw new ApiError(502, "Thumbnail upload failed");
    }

    const video = await Video.create({
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
        title: title.trim(),
        description: description.trim(),
        duration,
        isShort,
        owner: req.user._id
    });

    const subscribers = await Subscription.find({ channel: req.user._id })
        .select("subscriber")
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();
    if (subscribers.length) {
        await Notification.insertMany(subscribers.map(({ subscriber }) => ({
            recipient: subscriber,
            actor: req.user._id,
            type: "new_video",
            video: video._id
        })));
    }

    return res.status(201).json(
        new ApiResponse(201, video, "Video published successfully")
    );
});

const getAllVideos = asyncHandler(async (req, res) => {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const search = req.query.search?.trim();

    const filter = { isPublished: true };
    if (search) filter.title = { $regex: search, $options: "i" };

    const [videos, totalVideos] = await Promise.all([
        Video.find(filter)
            .populate("owner", "fullName username avatar")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Video.countDocuments(filter)
    ]);

    return res.status(200).json(new ApiResponse(200, {
        videos,
        page,
        limit,
        totalVideos,
        totalPages: Math.ceil(totalVideos / limit)
    }, "Videos fetched successfully"));
});

const getShortVideos = asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
    const videos = await Video.find({ isPublished: true, isShort: true })
        .populate("owner", "fullName username avatar")
        .sort({ views: -1, createdAt: -1 })
        .limit(limit);

    return res.status(200).json(
        new ApiResponse(200, { videos }, "Short videos fetched successfully")
    );
});

const getRecommendedVideos = asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 50);
    if (req.query.search !== undefined && typeof req.query.search !== "string") {
        throw new ApiError(400, "Search must be a string");
    }
    const search = req.query.search?.trim();
    const commonFilter = { isPublished: true };
    if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        commonFilter.title = { $regex: escapedSearch, $options: "i" };
    }

    const creatorWeights = new Map();
    let watchedVideoIds = [];
    let personalized = false;

    if (req.user) {
        const [user, likes, subscriptions] = await Promise.all([
            User.findById(req.user._id).select("watchHistory").lean(),
            Like.find({ likedBy: req.user._id, video: { $exists: true } })
                .select("video")
                .sort({ createdAt: -1 })
                .limit(100)
                .lean(),
            Subscription.find({ subscriber: req.user._id })
                .select("channel")
                .sort({ createdAt: -1 })
                .limit(100)
                .lean()
        ]);

        watchedVideoIds = (user?.watchHistory || []).slice(0, 100);
        const likedVideoIds = (likes || []).map((like) => like.video).filter(Boolean);
        const preferenceVideoIds = [
            ...new Map([...watchedVideoIds, ...likedVideoIds].map((videoId) => [String(videoId), videoId])).values()
        ];
        const preferenceVideos = preferenceVideoIds.length
            ? await Video.find({
                _id: { $in: preferenceVideoIds },
                isPublished: true
            }).select("_id owner").lean()
            : [];
        const watchedIds = new Set(watchedVideoIds.map(String));
        const likedIds = new Set(likedVideoIds.map(String));

        for (const video of preferenceVideos) {
            const creatorId = String(video.owner);
            if (creatorId === String(req.user._id)) continue;
            const weight = likedIds.has(String(video._id)) ? 4 : watchedIds.has(String(video._id)) ? 2 : 0;
            creatorWeights.set(creatorId, Math.max(creatorWeights.get(creatorId) || 0, weight));
        }

        for (const subscription of subscriptions || []) {
            if (subscription.channel && String(subscription.channel) !== String(req.user._id)) {
                const creatorId = String(subscription.channel);
                creatorWeights.set(creatorId, Math.max(creatorWeights.get(creatorId) || 0, 3));
            }
        }
        personalized = creatorWeights.size > 0;
    }

    const filter = { ...commonFilter };
    if (req.user) filter.owner = { $ne: req.user._id };

    const candidateLimit = Math.min(limit * 4, 100);
    const candidateQueries = [
        Video.find(filter)
            .populate("owner", "fullName username avatar")
            .sort({ createdAt: -1 })
            .limit(candidateLimit),
        Video.find(filter)
            .populate("owner", "fullName username avatar")
            .sort({ views: -1, createdAt: -1 })
            .limit(candidateLimit)
    ];

    const preferredCreators = [...creatorWeights.keys()];
    if (preferredCreators.length) {
        candidateQueries.push(
            Video.find({
                ...commonFilter,
                owner: { $in: preferredCreators }
            })
                .populate("owner", "fullName username avatar")
                .sort({ createdAt: -1 })
                .limit(candidateLimit)
        );
    }

    const candidateGroups = await Promise.all(candidateQueries);
    const candidates = new Map();
    for (const group of candidateGroups) {
        for (const video of group) candidates.set(String(video._id), video);
    }

    const now = Date.now();
    const videos = [...candidates.values()]
        .map((video) => {
            const creatorId = String(video.owner?._id || video.owner);
            const ageInDays = Math.max(0, (now - new Date(video.createdAt || now).getTime()) / 86_400_000);
            const freshnessScore = 30 / (ageInDays + 1);
            const popularityScore = Math.log1p(Number(video.views) || 0) * 2;
            const creatorScore = (creatorWeights.get(creatorId) || 0) * 100;
            return { video, score: creatorScore + freshnessScore + popularityScore };
        })
        .sort((first, second) =>
            second.score - first.score ||
            new Date(second.video.createdAt || 0) - new Date(first.video.createdAt || 0)
        )
        .slice(0, limit)
        .map(({ video }) => video);

    return res.status(200).json(
        new ApiResponse(200, {
            videos,
            personalized,
            totalVideos: candidates.size
        }, "Recommended videos fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const username = req.params.username?.trim().toLowerCase();
    if (!username) throw new ApiError(400, "Username is required");

    const channel = await User.findOne({ username }).select("_id");
    if (!channel) throw new ApiError(404, "Channel not found");

    const videos = await Video.find({ owner: channel._id, isPublished: true })
        .populate("owner", "fullName username avatar")
        .sort({ createdAt: -1 })
        .limit(100);

    return res.status(200).json(
        new ApiResponse(200, videos, "Channel videos fetched successfully")
    );
});

const getCurrentUserVideos = asyncHandler(async (req, res) => {
    const [videos, totalVideos] = await Promise.all([
        Video.find({ owner: req.user._id })
            .select("title description thumbnail views isPublished createdAt")
            .sort({ createdAt: -1 })
            .limit(100),
        Video.countDocuments({ owner: req.user._id })
    ]);

    return res.status(200).json(
        new ApiResponse(200, { videos, totalVideos }, "Your videos fetched successfully")
    );
});

const getVideoViewers = asyncHandler(async (req, res) => {
    const videos = await Video.find({
        owner: req.user._id,
        isPublished: true
    }).select("_id title thumbnail");
    const videoIds = videos.map((video) => video._id);

    if (!videoIds.length) {
        return res.status(200).json(
            new ApiResponse(200, [], "Video viewers fetched successfully")
        );
    }

    const videosById = new Map(videos.map((video) => [String(video._id), video]));
    const viewersById = new Map();
    const viewersFromHistory = await User.find({
        _id: { $ne: req.user._id },
        watchHistory: { $in: videoIds }
    }).select("_id fullName username avatar watchHistory").lean();

    for (const viewer of viewersFromHistory) {
        const watchedVideos = new Map();
        for (const videoId of viewer.watchHistory || []) {
            const video = videosById.get(String(videoId));
            if (video) {
                watchedVideos.set(String(video._id), {
                    _id: video._id,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    lastViewedAt: null
                });
            }
        }
        if (watchedVideos.size) {
            viewersById.set(String(viewer._id), { ...viewer, watchedVideos });
        }
    }

    const recordedViewers = await VideoView.aggregate([
        {
            $match: {
                video: { $in: videoIds },
                viewer: { $ne: new mongoose.Types.ObjectId(req.user._id) }
            }
        },
        { $sort: { lastViewedAt: -1 } },
        {
            $lookup: {
                from: "users",
                localField: "viewer",
                foreignField: "_id",
                pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
                as: "viewer"
            }
        },
        { $unwind: "$viewer" },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                pipeline: [{ $project: { title: 1, thumbnail: 1 } }],
                as: "video"
            }
        },
        { $unwind: "$video" },
        {
            $group: {
                _id: "$viewer._id",
                fullName: { $first: "$viewer.fullName" },
                username: { $first: "$viewer.username" },
                avatar: { $first: "$viewer.avatar" },
                latestViewedAt: { $max: "$lastViewedAt" },
                watchedVideos: {
                    $push: {
                        _id: "$video._id",
                        title: "$video.title",
                        thumbnail: "$video.thumbnail",
                        lastViewedAt: "$lastViewedAt"
                    }
                }
            }
        },
        { $sort: { latestViewedAt: -1 } },
        { $limit: 100 }
    ]);
    for (const viewer of recordedViewers) {
        const viewerId = String(viewer._id);
        const existingViewer = viewersById.get(viewerId);
        const watchedVideos = existingViewer?.watchedVideos || new Map();

        for (const video of viewer.watchedVideos) {
            watchedVideos.set(String(video._id), video);
        }

        viewersById.set(viewerId, {
            ...existingViewer,
            ...viewer,
            watchedVideos
        });
    }
    const viewers = [...viewersById.values()]
        .map((viewer) => ({
            ...viewer,
            watchedVideos: [...viewer.watchedVideos.values()].sort(
                (first, second) =>
                    new Date(second.lastViewedAt || 0) - new Date(first.lastViewedAt || 0)
            )
        }))
        .sort((first, second) =>
            new Date(second.latestViewedAt || 0) - new Date(first.latestViewedAt || 0) ||
            first.fullName.localeCompare(second.fullName) ||
            first.username.localeCompare(second.username)
        )
        .slice(0, 100);

    return res.status(200).json(
        new ApiResponse(200, viewers, "Video viewers fetched successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findOne({ _id: videoId, isPublished: true })
        .populate("owner", "fullName username avatar");

    if (!video) throw new ApiError(404, "Video not found");

    return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
});

const recordVideoView = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findOneAndUpdate(
        { _id: videoId, isPublished: true },
        { $inc: { views: 1 } },
        { new: true }
    ).select("_id views owner");

    if (!video) throw new ApiError(404, "Video not found");

    if (req.user && String(video.owner) !== String(req.user._id)) {
        const viewFilter = { video: video._id, viewer: req.user._id };
        try {
            await VideoView.updateOne(
                viewFilter,
                { $set: { lastViewedAt: new Date() } },
                { upsert: true }
            );
        } catch (error) {
            if (error?.code !== 11000) throw error;
            await VideoView.updateOne(viewFilter, {
                $set: { lastViewedAt: new Date() }
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, { views: video.views }, "Video view recorded")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body || {};

    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findOne({ _id: videoId, owner: req.user._id });
    if (!video) throw new ApiError(404, "Video not found or you are not its owner");

    if (title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
            throw new ApiError(400, "Title must be a non-empty string");
        }
        video.title = title.trim();
    }
    if (description !== undefined) {
        if (typeof description !== "string" || !description.trim()) {
            throw new ApiError(400, "Description must be a non-empty string");
        }
        video.description = description.trim();
    }

    const thumbnailPath = req.file?.path;
    if (thumbnailPath) {
        const thumbnailUpload = await uploadOnCloudinary(thumbnailPath);
        if (!thumbnailUpload?.url) throw new ApiError(500, "Thumbnail upload failed");
        video.thumbnail = thumbnailUpload.url;
    }

    await video.save();
    return res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findOneAndDelete({ _id: videoId, owner: req.user._id });
    if (!video) throw new ApiError(404, "Video not found or you are not its owner");

    return res.status(200).json(new ApiResponse(200, video, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findOne({ _id: videoId, owner: req.user._id });
    if (!video) throw new ApiError(404, "Video not found or you are not its owner");

    video.isPublished = !video.isPublished;
    await video.save();

    return res.status(200).json(new ApiResponse(200, video, "Video publish status changed"));
});

export {
    publishVideo,
    getAllVideos,
    getShortVideos,
    getRecommendedVideos,
    getChannelVideos,
    getCurrentUserVideos,
    getVideoViewers,
    getVideoById,
    recordVideoView,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};