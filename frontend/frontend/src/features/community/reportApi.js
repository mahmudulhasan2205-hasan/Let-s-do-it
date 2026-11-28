import { api } from "../../services/api";

export const reportApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createReport: builder.mutation({
      query: (report) => ({
        url: "/reports",
        method: "POST",
        body: report,
      }),
      invalidatesTags: ["User"],
    }),
    getReports: builder.query({
      query: (status = "pending") => ({
        url: "/reports",
        params: { status },
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Report"],
    }),
    resolveReport: builder.mutation({
      query: (reportId) => ({
        url: `/reports/${reportId}/resolve`,
        method: "PATCH",
      }),
      invalidatesTags: ["Report"],
    }),
    removeReportedContent: builder.mutation({
      query: (reportId) => ({
        url: `/reports/${reportId}/remove`,
        method: "PATCH",
      }),
      invalidatesTags: ["Report", "Video", "User", "Comment"],
    }),
  }),
});

export const {
  useCreateReportMutation,
  useGetReportsQuery,
  useResolveReportMutation,
  useRemoveReportedContentMutation,
} = reportApi;
