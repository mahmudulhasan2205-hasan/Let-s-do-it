import { Router } from "express";
import {
    publishVideo, getAllVideos, getShortVideos, getRecommendedVideos, getChannelVideos, getCurrentUserVideos, getVideoViewers, getVideoById, recordVideoView, updateVideo,
    deleteVideo, togglePublishStatus
} from "../controllers/video.controllers.js";
import { upload, validateUploadedFiles } from "../middlewares/multer.middlewares.js";
import { optionalVerifyJWT, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(getAllVideos).post(
    verifyJWT,
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    validateUploadedFiles(["videoFile", "thumbnail"]),
    publishVideo
);
router.route("/channel/:username").get(getChannelVideos);
router.route("/my-videos").get(verifyJWT, getCurrentUserVideos);
router.route("/viewers").get(verifyJWT, getVideoViewers);
router.route("/shorts").get(getShortVideos);
router.route("/recommended").get(optionalVerifyJWT, getRecommendedVideos);
router.route("/:videoId/view").post(optionalVerifyJWT, recordVideoView);
router.route("/:videoId")
    .get(getVideoById)
    .patch(verifyJWT, upload.single("thumbnail"), validateUploadedFiles(), updateVideo)
    .delete(verifyJWT, deleteVideo);
router.route("/:videoId/toggle-publish").patch(verifyJWT, togglePublishStatus);

export default router;