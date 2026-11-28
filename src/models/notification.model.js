import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    actor: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: ["new_video", "new_follower", "new_community_post", "video_comment", "video_like", "comment_reply", "comment_like", "suspicious_login"],
        required: true,
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
    },
    readAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
