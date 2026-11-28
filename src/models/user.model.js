import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    avatar: {
        type: String, // cloudinary URL
        required: true,
    },
    coverImage: {
        type: String, // cloudinary URL
    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Video",
    }],
    password: {
        type: String,
        required: [true , "Password is required"],
    },
    refreshToken: {
        type: String,
    },
    role: {
        type: String,
        enum: ["user", "moderator", "admin"],
        default: "user",
        index: true,
    },
    suspended: {
        type: Boolean,
        default: false,
        index: true,
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false,
        index: true,
    },
    twoFactorSecret: {
        type: String,
        select: false,
    },
    emailVerified: {
        type: Boolean,
        default: false,
        index: true,
    },
    emailVerificationTokenHash: {
        type: String,
        select: false,
    },
    emailVerificationExpires: {
        type: Date,
        select: false,
    },
    passwordResetTokenHash: {
        type: String,
        select: false,
    },
    passwordResetExpires: {
        type: Date,
        select: false,
    },
}, { timestamps: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};


export const User = mongoose.model("User", userSchema);