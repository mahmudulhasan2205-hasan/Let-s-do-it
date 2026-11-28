import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema ({

    content: {
        type: String,
        required: true
    },

    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    parentComment: {
        type: Schema.Types.ObjectId,
        ref: "comment",
        default: null,
        index: true
    }

},
{
    timestamps: true
})

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("comment", commentSchema)