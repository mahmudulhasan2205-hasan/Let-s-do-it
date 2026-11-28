import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema({
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: ["video", "comment", "user"], required: true, index: true },
    targetVideo: { type: Schema.Types.ObjectId, ref: "Video", default: null },
    targetComment: { type: Schema.Types.ObjectId, ref: "comment", default: null },
    targetUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reason: { type: String, enum: ["spam", "harassment", "inappropriate", "copyright", "misinformation", "other"], required: true },
    details: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["pending", "resolved", "removed"], default: "pending", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null }
}, { timestamps: true });

reportSchema.index({ reporter: 1, targetType: 1, targetVideo: 1, targetComment: 1, targetUser: 1 }, { unique: false });

export const Report = mongoose.model("Report", reportSchema);
