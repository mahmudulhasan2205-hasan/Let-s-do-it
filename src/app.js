import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import videoRouter from "./routes/video.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import likeRouter from "./routes/like.routes.js";
import commentRouter from "./routes/comment.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import connectDB from "./db/index.js";
const app = express();
const configuredOrigin = process.env.CORS_ORIGIN;

const isAllowedLocalOrigin = (origin) => {
    if (!configuredOrigin) return false;

    try {
        const requestUrl = new URL(origin);
        const configuredUrl = new URL(configuredOrigin);
        const localHosts = new Set(["localhost", "127.0.0.1"]);

        return localHosts.has(requestUrl.hostname)
            && localHosts.has(configuredUrl.hostname)
            && requestUrl.protocol === configuredUrl.protocol;
    } catch {
        return false;
    }
};

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin === configuredOrigin || isAllowedLocalOrigin(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
}));

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        next(error);
    }
});

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/notifications", notificationRouter);
// Routes
import userRouter from "./routes/user.routes.js";

app.use("/api/v1/users", userRouter);

app.use((error, req, res, next) => {
    const isMulterError = error.name === "MulterError";
    const statusCode = Number.isInteger(error.statusCode)
        ? error.statusCode
        : isMulterError
            ? error.code === "LIMIT_FILE_SIZE" ? 413 : 400
            : 500;

    if (statusCode >= 500) {
        console.error("Request failed:", error.message);
    }

    res.status(statusCode).json({
        statusCode,
        success: false,
        message: statusCode >= 500 ? "Request failed. Please try again." : error.message,
        errors: error.errors || [],
    });
});

export { app };
export default app;