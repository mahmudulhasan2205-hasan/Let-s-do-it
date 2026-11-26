import { api } from "../../services/api";

export const commentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getVideoComments: builder.query({
      query: ({ videoId, page = 1 }) => ({
        url: `/comments/${videoId}`,
        params: { page, limit: 10 },
      }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, { videoId }) => [
        { type: "Comment", id: videoId },
      ],
    }),
    addVideoComment: builder.mutation({
      query: ({ videoId, content }) => ({
        url: `/comments/${videoId}`,
        method: "POST",
        body: { content },
      }),
      invalidatesTags: (_result, _error, { videoId }) => [
        { type: "Comment", id: videoId },
      ],
    }),
    updateVideoComment: builder.mutation({
      query: ({ commentId, content }) => ({
        url: `/comments/c/${commentId}`,
        method: "PATCH",
        body: { content },
      }),
      invalidatesTags: ["Comment"],
    }),
    deleteVideoComment: builder.mutation({
      query: (commentId) => ({
        url: `/comments/c/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Comment"],
    }),
  }),
});

export const {
  useGetVideoCommentsQuery,
  useAddVideoCommentMutation,
  useUpdateVideoCommentMutation,
  useDeleteVideoCommentMutation,
} = commentApi;
