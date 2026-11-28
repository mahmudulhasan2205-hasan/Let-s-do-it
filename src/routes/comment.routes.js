import { Router } from "express";
import {
    getVideoComments, addComment, addCommentReply, updateComment, deleteComment
} from "../controllers/comment.controllers.js";
import { optionalVerifyJWT, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/:videoId").get(optionalVerifyJWT, getVideoComments).post(verifyJWT, addComment);
router.route("/c/:commentId").patch(verifyJWT, updateComment).delete(verifyJWT, deleteComment);
router.route("/c/:commentId/replies").post(verifyJWT, addCommentReply);

export default router;