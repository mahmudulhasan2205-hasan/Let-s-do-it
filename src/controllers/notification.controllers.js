import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getNotifications = asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
    const notifications = await Notification.find({ recipient: req.user._id })
        .populate("actor", "fullName username avatar")
        .populate("video", "title thumbnail isPublished")
        .sort({ createdAt: -1 })
        .limit(limit);
    const unreadCount = await Notification.countDocuments({
        recipient: req.user._id,
        readAt: null
    });

    return res.status(200).json(
        new ApiResponse(200, { notifications, unreadCount }, "Notifications fetched successfully")
    );
});

const markNotificationRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    if (!mongoose.isValidObjectId(notificationId)) {
        throw new ApiError(400, "Invalid notification ID");
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: req.user._id },
        { $set: { readAt: new Date() } },
        { new: true }
    );
    if (!notification) throw new ApiError(404, "Notification not found");

    return res.status(200).json(
        new ApiResponse(200, notification, "Notification marked as read")
    );
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
        { recipient: req.user._id, readAt: null },
        { $set: { readAt: new Date() } }
    );

    return res.status(200).json(
        new ApiResponse(200, { updatedCount: result.modifiedCount }, "Notifications marked as read")
    );
});

export { getNotifications, markNotificationRead, markAllNotificationsRead };
