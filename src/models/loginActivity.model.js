import mongoose, { Schema } from "mongoose";

const loginActivitySchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    ipAddress: {
        type: String,
        trim: true,
        default: "unknown",
    },
    userAgent: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "unknown",
    },
    suspicious: {
        type: Boolean,
        default: false,
        index: true,
    },
    alertSent: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

loginActivitySchema.index({ user: 1, createdAt: -1 });

export const LoginActivity = mongoose.model("LoginActivity", loginActivitySchema);
