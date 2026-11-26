
import { api } from "../../services/api";

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({

    // Register user
    registerUser: builder.mutation({
      query: (userData) => ({
        url: "/users/register",
        method: "POST",
        body: userData,
      }),

      transformResponse: (response) => response.data,
    }),

    // Login user
    loginUser: builder.mutation({
      query: (userData) => ({
        url: "/users/login",
        method: "POST",
        body: userData,
      }),

      transformResponse: (response) => response.data,
    }),

    // Logout user
    logoutUser: builder.mutation({
      query: () => ({
        url: "/users/logout",
        method: "POST",
      }),
    }),

    // Get current logged-in user
    getCurrentUser: builder.query({
      query: () => ({
        url: "/users/current-user",
        method: "GET",
      }),

      transformResponse: (response) => response.data,
      providesTags: ["User"],
    }),

    getChannelProfile: builder.query({
      query: (username) => `/users/c/${encodeURIComponent(username)}`,
      transformResponse: (response) => response.data,
      providesTags: ["Channel"],
    }),

    updateAccount: builder.mutation({
      query: (account) => ({
        url: "/users/update-account",
        method: "PATCH",
        body: account,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useLogoutUserMutation,
  useGetCurrentUserQuery,
  useGetChannelProfileQuery,
  useUpdateAccountMutation,
} = authApi;
