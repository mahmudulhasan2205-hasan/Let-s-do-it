
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

    searchCreators: builder.query({
      query: (search) => ({
        url: "/users/search",
        params: search ? { q: search } : {},
      }),
      transformResponse: (response) => response.data,
    }),

    getActiveSessions: builder.query({
      query: () => "/users/security/sessions",
      transformResponse: (response) => response.data,
      providesTags: ["Session"],
    }),
    revokeSession: builder.mutation({
      query: (sessionId) => ({ url: `/users/security/sessions/${sessionId}/revoke`, method: "POST" }),
      invalidatesTags: ["Session"],
    }),
    revokeAllSessions: builder.mutation({
      query: () => ({ url: "/users/security/sessions/revoke-all", method: "POST" }),
      invalidatesTags: ["Session", "User"],
    }),

    getLoginActivity: builder.query({
      query: () => "/users/security/login-activity",
      transformResponse: (response) => response.data,
      providesTags: ["User"],
    }),

    verifyEmail: builder.query({
      query: (token) => `/users/verify-email/${encodeURIComponent(token)}`,
      transformResponse: (response) => response.data,
      providesTags: ["User"],
    }),
    forgotPassword: builder.mutation({
      query: (email) => ({ url: "/users/forgot-password", method: "POST", body: { email } }),
      transformResponse: (response) => response.data,
    }),
    resetPassword: builder.mutation({
      query: (payload) => ({ url: "/users/reset-password", method: "POST", body: payload }),
      transformResponse: (response) => response.data,
    }),
    requestEmailVerification: builder.mutation({
      query: () => ({ url: "/users/request-email-verification", method: "POST" }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["User"],
    }),

    setupTwoFactor: builder.mutation({
      query: () => ({ url: "/users/2fa/setup", method: "POST" }),
      transformResponse: (response) => response.data,
    }),
    enableTwoFactor: builder.mutation({
      query: (payload) => ({ url: "/users/2fa/enable", method: "POST", body: payload }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["User"],
    }),
    disableTwoFactor: builder.mutation({
      query: (payload) => ({ url: "/users/2fa/disable", method: "POST", body: payload }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["User"],
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
  useGetLoginActivityQuery,
  useGetActiveSessionsQuery,
  useRevokeSessionMutation,
  useRevokeAllSessionsMutation,
  useVerifyEmailQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useRequestEmailVerificationMutation,
  useSetupTwoFactorMutation,
  useEnableTwoFactorMutation,
  useDisableTwoFactorMutation,
  useSearchCreatorsQuery,
  useGetChannelProfileQuery,
  useUpdateAccountMutation,
} = authApi;
