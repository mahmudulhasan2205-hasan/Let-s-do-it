import { api } from "../../services/api";

export const communityApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCommunityFeed: builder.query({
      query: () => "/tweets/feed",
      transformResponse: (response) => response.data,
      providesTags: ["Tweet"],
    }),
    createCommunityPost: builder.mutation({
      query: (post) => ({
        url: "/tweets",
        method: "POST",
        body: post,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["Tweet", "Notification"],
    }),
    updateCommunityPost: builder.mutation({
      query: ({ postId, content }) => ({
        url: `/tweets/${postId}`,
        method: "PATCH",
        body: { content },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["Tweet"],
    }),
    deleteCommunityPost: builder.mutation({
      query: (postId) => ({
        url: `/tweets/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tweet"],
    }),
    getNotifications: builder.query({
      query: () => "/notifications",
      transformResponse: (response) => response.data,
      providesTags: ["Notification"],
    }),
    markNotificationRead: builder.mutation({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({
        url: "/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetCommunityFeedQuery,
  useCreateCommunityPostMutation,
  useUpdateCommunityPostMutation,
  useDeleteCommunityPostMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = communityApi;
