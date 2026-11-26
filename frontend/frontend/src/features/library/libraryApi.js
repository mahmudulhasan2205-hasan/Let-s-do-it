import { api } from "../../services/api";

export const libraryApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getLikedVideos: builder.query({
      query: () => "/likes/videos",
      transformResponse: (response) => response.data,
      providesTags: ["Like"],
    }),
    getDislikedVideos: builder.query({
      query: () => "/likes/videos/disliked",
      transformResponse: (response) => response.data,
      providesTags: ["Like"],
    }),
    toggleVideoLike: builder.mutation({
      query: (videoId) => ({
        url: `/likes/videos/${videoId}`,
        method: "POST",
      }),
      invalidatesTags: ["Like"],
    }),
    toggleVideoDislike: builder.mutation({
      query: (videoId) => ({
        url: `/likes/videos/${videoId}/dislike`,
        method: "POST",
      }),
      invalidatesTags: ["Like"],
    }),
    getSubscriptions: builder.query({
      query: (userId) => `/subscriptions/user/${userId}`,
      transformResponse: (response) => response.data,
      providesTags: ["Subscription"],
    }),
    toggleSubscription: builder.mutation({
      query: (channelId) => ({
        url: `/subscriptions/channel/${channelId}`,
        method: "POST",
      }),
      invalidatesTags: ["Subscription", "Channel"],
    }),
    getWatchHistory: builder.query({
      query: () => "/users/history",
      transformResponse: (response) => response.data,
      providesTags: ["History"],
    }),
    recordWatchHistory: builder.mutation({
      query: (videoId) => ({
        url: `/users/history/${videoId}`,
        method: "POST",
      }),
      invalidatesTags: ["History"],
    }),
    getPlaylists: builder.query({
      query: (userId) => `/playlists/user/${userId}`,
      transformResponse: (response) => response.data,
      providesTags: ["Playlist"],
    }),
    getPlaylist: builder.query({
      query: (playlistId) => `/playlists/${playlistId}`,
      transformResponse: (response) => response.data,
      providesTags: ["Playlist"],
    }),
    createPlaylist: builder.mutation({
      query: (playlist) => ({
        url: "/playlists",
        method: "POST",
        body: playlist,
      }),
      invalidatesTags: ["Playlist"],
    }),
    deletePlaylist: builder.mutation({
      query: (playlistId) => ({
        url: `/playlists/${playlistId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Playlist"],
    }),
    addVideoToPlaylist: builder.mutation({
      query: ({ playlistId, videoId }) => ({
        url: `/playlists/${playlistId}/videos/${videoId}`,
        method: "POST",
      }),
      invalidatesTags: ["Playlist"],
    }),
    removeVideoFromPlaylist: builder.mutation({
      query: ({ playlistId, videoId }) => ({
        url: `/playlists/${playlistId}/videos/${videoId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Playlist"],
    }),
  }),
});

export const {
  useGetLikedVideosQuery,
  useGetDislikedVideosQuery,
  useToggleVideoLikeMutation,
  useToggleVideoDislikeMutation,
  useGetSubscriptionsQuery,
  useToggleSubscriptionMutation,
  useGetWatchHistoryQuery,
  useRecordWatchHistoryMutation,
  useGetPlaylistsQuery,
  useGetPlaylistQuery,
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  useAddVideoToPlaylistMutation,
  useRemoveVideoFromPlaylistMutation,
} = libraryApi;
