
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout, setAccessToken } from "../features/auth/authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  credentials: "include",

  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.accessToken;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

let refreshRequest;

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const isAuthRequest = ["/users/login", "/users/register", "/users/refresh-token"].includes(
    typeof args === "string" ? args : args.url,
  );

  if (result.error?.status === 401 && !isAuthRequest) {
    refreshRequest ||= rawBaseQuery(
      { url: "/users/refresh-token", method: "POST" },
      api,
      extraOptions,
    );

    const refreshResult = await refreshRequest;
    refreshRequest = undefined;

    const accessToken = refreshResult.data?.data?.accessToken;
    if (accessToken) {
      api.dispatch(setAccessToken(accessToken));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "User",
    "Video",
    "Tweet",
    "Playlist",
    "Comment",
    "Like",
    "Subscription",
    "History",
    "Viewers",
    "Channel",
    "Notification",
  ],

  endpoints: () => ({}),
});
