import mongoose from "mongoose";
import { Report } from "../models/report.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createReport = asyncHandler(async (req, res) => {
    const { targetType, targetId, reason, details = "" } = req.body || {};
    if (!["video", "comment", "user"].includes(targetType)) throw new ApiError(400, "Invalid report target");
    if (!mongoose.isValidObjectId(targetId)) throw new ApiError(400, "Invalid report target ID");
    if (!["spam", "harassment", "inappropriate", "copyright", "misinformation", "other"].includes(reason)) {
        throw new ApiError(400, "Invalid report reason");
    }

    const targetField = targetType === "video" ? "targetVideo" : targetType === "comment" ? "targetComment" : "targetUser";
    const existingTarget = targetType === "video"
        ? await Video.exists({ _id: targetId })
        : targetType === "comment"
            ? await Comment.exists({ _id: targetId })
            : await User.exists({ _id: targetId });
    if (!existingTarget) throw new ApiError(404, `${targetType} not found`);

    const duplicate = await Report.findOne({ reporter: req.user._id, [targetField]: targetId, status: "pending" });
    if (duplicate) throw new ApiError(409, "You have already reported this content");

    const report = await Report.create({
        reporter: req.user._id,
        targetType,
        [targetField]: targetId,
        reason,
        details: typeof details === "string" ? details.trim().slice(0, 1000) : ""
    });

    return res.status(201).json(new ApiResponse(201, report, "Report submitted successfully"));
});

const getReports = asyncHandler(async (req, res) => {
    const status = req.query.status || "pending";
    if (!["pending", "resolved", "removed", "all"].includes(status)) throw new ApiError(400, "Invalid report status");

    const filter = status === "all" ? {} : { status };
    const reports = await Report.find(filter)
        .populate("reporter", "fullName username avatar")
        .populate("targetVideo", "title thumbnail isPublished owner")
        .populate("targetComment", "content owner video")
        .populate("targetUser", "fullName username avatar role")
        .populate("reviewedBy", "fullName username")
        .sort({ createdAt: -1 })
        .limit(100);

    return res.status(200).json(new ApiResponse(200, reports, "Reports fetched successfully"));
});

const resolveReport = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    if (!mongoose.isValidObjectId(reportId)) throw new ApiError(400, "Invalid report ID");
    const report = await Report.findOneAndUpdate(
        { _id: reportId },
        { $set: { status: "resolved", reviewedBy: req.user._id, reviewedAt: new Date() } },
        { new: true }
    );
    if (!report) throw new ApiError(404, "Report not found");
    return res.status(200).json(new ApiResponse(200, report, "Report resolved"));
});

const removeReportedContent = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    if (!mongoose.isValidObjectId(reportId)) throw new ApiError(400, "Invalid report ID");

    const report = await Report.findById(reportId);
    if (!report) throw new ApiError(404, "Report not found");

    if (report.targetType === "video" && report.targetVideo) {
        await Video.findByIdAndUpdate(report.targetVideo, { $set: { isPublished: false } });
    } else if (report.targetType === "comment" && report.targetComment) {
        await Comment.findByIdAndDelete(report.targetComment);
    } else if (report.targetType === "user" && report.targetUser) {
        await User.findByIdAndUpdate(report.targetUser, { $set: { suspended: true } });
    }

    report.status = "removed";
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();

    return res.status(200).json(new ApiResponse(200, report, "Reported content removed"));
});

export { createReport, getReports, resolveReport, removeReportedContent };
