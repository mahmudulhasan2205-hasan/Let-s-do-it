import { api } from "../../services/api";

export const videoApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getVideos: builder.query({
      query: (search = "") => ({
        url: "/videos",
        params: search ? { search } : {},
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Video"],
    }),
    getRecommendedVideos: builder.query({
      query: (search = "") => ({
        url: "/videos/recommended",
        params: search ? { search } : {},
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Video"],
    }),
    getShortVideos: builder.query({
      query: () => "/videos/shorts",
      transformResponse: (response) => response.data,
      providesTags: ["Video"],
    }),
    getChannelVideos: builder.query({
      query: (username) => `/videos/channel/${encodeURIComponent(username)}`,
      transformResponse: (response) => response.data,
      providesTags: ["Video"],
    }),
    getCurrentUserVideos: builder.query({
      query: () => "/videos/my-videos",
      transformResponse: (response) => response.data,
      providesTags: ["Video"],
    }),
    getVideoViewers: builder.query({
      query: () => "/videos/viewers",
      transformResponse: (response) => response.data,
      providesTags: ["Viewers"],
    }),
    getVideo: builder.query({
      query: (videoId) => `/videos/${videoId}`,
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, videoId) => [{ type: "Video", id: videoId }],
    }),
    recordVideoView: builder.mutation({
      query: (videoId) => ({
        url: `/videos/${videoId}/view`,
        method: "POST",
      }),
      invalidatesTags: ["Viewers"],
    }),
    publishVideo: builder.mutation({
      query: (formData) => ({
        url: "/videos",
        method: "POST",
        body: formData,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["Video"],
    }),
    updateVideo: builder.mutation({
      query: ({ videoId, changes }) => ({
        url: `/videos/${videoId}`,
        method: "PATCH",
        body: changes,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["Video"],
    }),
    deleteVideo: builder.mutation({
      query: (videoId) => ({
        url: `/videos/${videoId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Video", "Viewers"],
    }),
    toggleVideoPublishStatus: builder.mutation({
      query: (videoId) => ({
        url: `/videos/${videoId}/toggle-publish`,
        method: "PATCH",
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["Video", "Viewers"],
    }),
  }),
});

export const {
  useGetVideosQuery,
  useGetRecommendedVideosQuery,
  useLazyGetRecommendedVideosQuery,
  useGetShortVideosQuery,
  useLazyGetShortVideosQuery,
  useGetChannelVideosQuery,
  useGetCurrentUserVideosQuery,
  useGetVideoViewersQuery,
  useGetVideoQuery,
  useRecordVideoViewMutation,
  usePublishVideoMutation,
  useUpdateVideoMutation,
  useDeleteVideoMutation,
  useToggleVideoPublishStatusMutation,
} = videoApi;
