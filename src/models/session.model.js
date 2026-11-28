import mongoose, { Schema } from "mongoose";

const sessionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true, select: false },
    ipAddress: { type: String, trim: true, default: "unknown" },
    userAgent: { type: String, trim: true, maxlength: 500, default: "unknown" },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
}, { timestamps: true });

sessionSchema.index({ user: 1, revokedAt: 1, lastSeenAt: -1 });

export const Session = mongoose.model("Session", sessionSchema);
