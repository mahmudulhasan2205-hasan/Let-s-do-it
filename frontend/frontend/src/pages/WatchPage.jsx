import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  BellDot,
  BellPlus,
  Check,
  Eye,
  Heart,
  LoaderCircle,
  MessageCircle,
  Share2,
  Trash2,
  ThumbsDown,
  Video,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCurrentUserQuery } from "@/features/auth/authApi";
import {
  useAddVideoToPlaylistMutation,
  useGetDislikedVideosQuery,
  useGetLikedVideosQuery,
  useGetPlaylistsQuery,
  useGetSubscriptionsQuery,
  useRecordWatchHistoryMutation,
  useToggleSubscriptionMutation,
  useToggleVideoDislikeMutation,
  useToggleVideoLikeMutation,
} from "@/features/library/libraryApi";
import {
  useAddVideoCommentMutation,
  useDeleteVideoCommentMutation,
  useGetVideoCommentsQuery,
  useUpdateVideoCommentMutation,
} from "@/features/video/commentApi";
import {
  useGetVideoQuery,
  useGetVideosQuery,
  useRecordVideoViewMutation,
} from "@/features/video/videoApi";

function RequestError({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200">
      {error.data?.message || error.error || "That action failed. Please try again."}
    </p>
  );
}

function WatchPage() {
  const { videoId = "" } = useParams();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const storedUser = useSelector((state) => state.auth.user);
  const { data: currentUser, error: currentUserError } = useGetCurrentUserQuery(undefined, {
    skip: !isAuthenticated,
  });
  const viewer = currentUser || storedUser;
  const { data: video, isLoading, error } = useGetVideoQuery(videoId, {
    skip: !videoId,
  });
  const {
    data: videoList,
    isLoading: relatedVideosLoading,
    error: relatedVideosError,
  } = useGetVideosQuery("");
  const { data: likedVideos = [], error: likedVideosError } = useGetLikedVideosQuery(undefined, {
    skip: !isAuthenticated,
  });
  const { data: dislikedVideos = [], error: dislikedVideosError } = useGetDislikedVideosQuery(undefined, {
    skip: !isAuthenticated,
  });
  const { data: subscriptions = [], error: subscriptionsError } = useGetSubscriptionsQuery(viewer?._id, {
    skip: !isAuthenticated || !viewer?._id,
  });
  const { data: playlists = [], error: playlistsError } = useGetPlaylistsQuery(viewer?._id, {
    skip: !isAuthenticated || !viewer?._id,
  });
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentPage, setCommentPage] = useState(1);
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const viewedVideoIds = useRef(new Set());
  const {
    data: commentsData,
    isLoading: commentsLoading,
    error: commentsError,
  } = useGetVideoCommentsQuery({ videoId, page: commentPage }, { skip: !videoId });

  const [toggleLike, { isLoading: isLiking, error: likeError }] = useToggleVideoLikeMutation();
  const [toggleDislike, { isLoading: isDisliking, error: dislikeError }] =
    useToggleVideoDislikeMutation();
  const [toggleSubscription, { isLoading: isSubscribing, error: subscriptionError }] =
    useToggleSubscriptionMutation();
  const [addToPlaylist, { isLoading: isSavingPlaylist, error: playlistError }] =
    useAddVideoToPlaylistMutation();
  const [addComment, { isLoading: isAddingComment }] =
    useAddVideoCommentMutation();
  const [updateComment, { isLoading: isUpdatingComment }] =
    useUpdateVideoCommentMutation();
  const [deleteComment] = useDeleteVideoCommentMutation();
  const [recordVideoView, { error: viewError }] = useRecordVideoViewMutation();
  const [recordWatchHistory, { error: historyError }] = useRecordWatchHistoryMutation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0b0e] px-4 py-8 text-zinc-100 sm:px-7">
        <div className="mx-auto max-w-7xl space-y-5">
          <Skeleton className="aspect-video max-h-[680px] rounded-2xl bg-white/[0.05]" />
          <Skeleton className="h-24 rounded-2xl bg-white/[0.05]" />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#0b0b0e] px-4 text-zinc-100">
        <Video className="size-10 text-zinc-500" />
        <div className="text-center">
          <h1 className="text-xl font-semibold">This video isn’t available</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {error?.data?.message || "It may have been removed or is no longer published."}
          </p>
        </div>
        <Button asChild variant="outline" className="border-white/10 text-zinc-200">
          <Link to="/"><ArrowLeft />Back to videos</Link>
        </Button>
      </div>
    );
  }

  const liked = likedVideos.some((likedVideo) => likedVideo._id === video._id);
  const disliked = dislikedVideos.some((dislikedVideo) => dislikedVideo._id === video._id);
  const isSubscribed = subscriptions.some(
    (subscription) => subscription.channel?._id === video.owner?._id,
  );
  const isOwnVideo = viewer?._id && String(viewer._id) === String(video.owner?._id);
  const comments = commentsData?.comments || [];
  const relatedVideos = (videoList?.videos || [])
    .filter((item) => item._id !== video._id)
    .slice(0, 8);
  const currentUserId = viewer?._id ? String(viewer._id) : "";

  const handlePlay = () => {
    if (!viewedVideoIds.current.has(video._id)) {
      viewedVideoIds.current.add(video._id);
      recordVideoView(video._id);
    }
    if (isAuthenticated) recordWatchHistory(video._id);
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    setActionError("");
    setActionMessage("");
    try {
      await addComment({ videoId: video._id, content: commentText.trim() }).unwrap();
      setCommentText("");
      setCommentPage(1);
      setActionMessage("Your comment was posted.");
    } catch (requestError) {
      setActionError(requestError.data?.message || "Could not post your comment.");
    }
  };

  const handleSaveToPlaylist = async () => {
    setActionError("");
    setActionMessage("");
    if (!selectedPlaylist) {
      setActionError("Choose a playlist first.");
      return;
    }
    try {
      await addToPlaylist({ playlistId: selectedPlaylist, videoId: video._id }).unwrap();
      setActionMessage("Video added to your playlist.");
    } catch (requestError) {
      setActionError(requestError.data?.message || "Could not add this video to the playlist.");
    }
  };

  const handleShare = async () => {
    setActionError("");
    setActionMessage("");
    try {
      await navigator.clipboard.writeText(window.location.href);
      setActionMessage("Video link copied.");
    } catch {
      setActionError("Could not copy the link. Copy it from your browser’s address bar.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-zinc-100">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-white/[0.07] bg-[#0b0b0e]/90 px-4 backdrop-blur-xl sm:px-7">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-white">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-red-400 to-red-700 text-sm font-black">L</span>
          <span>Lets-do-it</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle className="text-zinc-400 hover:text-white" />
          <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
            <Link to="/"><ArrowLeft /><span className="hidden sm:inline">Back to videos</span><span className="sm:hidden">Back</span></Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-8 px-4 py-6 sm:px-7 lg:py-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
            <video
              src={video.videoFile}
              poster={video.thumbnail}
              controls
              preload="metadata"
              onPlay={handlePlay}
              className="aspect-video max-h-[75vh] w-full bg-black"
            />
          </div>

          <section>
            <h1 className="text-xl font-semibold leading-7 text-white sm:text-2xl">{video.title}</h1>
            <div className="mt-4 flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-center">
              <Link
                to={`/channel/${encodeURIComponent(video.owner?.username || "")}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar className="size-11">
                  <AvatarImage src={video.owner?.avatar} alt={video.owner?.fullName || "Creator"} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-200">
                    {video.owner?.fullName?.slice(0, 1) || "C"}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">
                    {video.owner?.fullName || "Creator"}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    @{video.owner?.username || "creator"}
                  </span>
                </span>
              </Link>
              {!isOwnVideo && video.owner?._id && (
                isAuthenticated ? (
                  <Button
                    disabled={isSubscribing}
                    onClick={() => toggleSubscription(video.owner._id)}
                    className={isSubscribed
                      ? "border border-white/10 bg-white/[0.05] text-zinc-200 hover:bg-white/10"
                      : "bg-red-600 text-white hover:bg-red-500"}
                  >
                    {isSubscribing ? <LoaderCircle className="animate-spin" /> : isSubscribed ? <BellDot /> : <BellPlus />}
                    {isSubscribed ? "Subscribed" : "Subscribe"}
                  </Button>
                ) : (
                  <Button asChild className="bg-red-600 text-white hover:bg-red-500">
                    <Link to="/login"><BellPlus />Sign in to subscribe</Link>
                  </Button>
                )
              )}
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  disabled={isLiking || isDisliking}
                  aria-pressed={liked}
                  onClick={() => toggleLike(video._id)}
                  className={liked
                    ? "border-rose-300/20 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15"
                    : "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"}
                >
                  {isLiking ? <LoaderCircle className="animate-spin" /> : <Heart className={liked ? "fill-current" : ""} />}
                  {liked ? "Liked" : "Like"}
                </Button>
              ) : (
                <Button asChild variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200">
                  <Link to="/login"><Heart />Like</Link>
                </Button>
              )}
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  disabled={isLiking || isDisliking}
                  aria-pressed={disliked}
                  onClick={() => toggleDislike(video._id)}
                  className={disliked
                    ? "border-zinc-300/20 bg-zinc-300/10 text-zinc-100 hover:bg-zinc-300/15"
                    : "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"}
                >
                  {isDisliking ? <LoaderCircle className="animate-spin" /> : <ThumbsDown className={disliked ? "fill-current" : ""} />}
                  {disliked ? "Disliked" : "Dislike"}
                </Button>
              ) : (
                <Button asChild variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200">
                  <Link to="/login"><ThumbsDown />Dislike</Link>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleShare}
                className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
              >
                <Share2 />Share
              </Button>
            </div>
          </section>

          <Card className="border-white/[0.07] bg-[#121216]">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5"><Eye className="size-4" />{Number(video.views || 0).toLocaleString()} views</span>
                {video.createdAt && <span>{new Date(video.createdAt).toLocaleDateString()}</span>}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{video.description}</p>
            </CardContent>
          </Card>

          {isAuthenticated && (
            <Card className="border-white/[0.07] bg-[#121216]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">Save to playlist</CardTitle>
                <CardDescription className="text-zinc-500">Add this video to one of your collections.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <select
                  aria-label="Choose playlist"
                  value={selectedPlaylist}
                  onChange={(event) => setSelectedPlaylist(event.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1a1a1f] px-3 text-sm text-zinc-200 outline-none focus:border-red-400/50"
                  disabled={!playlists.length}
                >
                  <option value="">{playlists.length ? "Choose a playlist" : "No playlists yet"}</option>
                  {playlists.map((playlist) => (
                    <option key={playlist._id} value={playlist._id}>{playlist.name}</option>
                  ))}
                </select>
                <Button
                  onClick={handleSaveToPlaylist}
                  disabled={isSavingPlaylist || !playlists.length}
                  className="bg-white/[0.08] text-white hover:bg-white/[0.12]"
                >
                  {isSavingPlaylist ? <LoaderCircle className="animate-spin" /> : <Check />}
                  Add to playlist
                </Button>
                {!playlists.length && (
                  <Button asChild variant="outline" className="border-white/10">
                    <Link to="/playlists">Create playlist</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {isAuthenticated && (
            <p className="text-xs text-zinc-500">
              When you’re signed in, creators can see your name on videos you watch.
            </p>
          )}
          {(error || currentUserError || likedVideosError || dislikedVideosError || subscriptionsError || playlistsError || viewError || historyError || likeError || dislikeError || subscriptionError || playlistError || actionError) && (
            <RequestError error={error || currentUserError || likedVideosError || dislikedVideosError || subscriptionsError || playlistsError || viewError || historyError || likeError || dislikeError || subscriptionError || playlistError || { data: { message: actionError } }} />
          )}
          {actionMessage && <p role="status" className="text-sm text-emerald-300">{actionMessage}</p>}

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5 text-red-300" />
              <h2 className="text-lg font-semibold text-white">
                Comments <span className="text-sm font-normal text-zinc-500">({commentsData?.totalComments || 0})</span>
              </h2>
            </div>

            {isAuthenticated ? (
              <form onSubmit={handleAddComment} className="space-y-3">
                <textarea
                  aria-label="Write a comment"
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value.slice(0, 2000))}
                  maxLength={2000}
                  rows={3}
                  placeholder="Share your thoughts..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#121216] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-red-400/40"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-600">{commentText.length}/2000</span>
                  <Button type="submit" disabled={isAddingComment || !commentText.trim()} className="bg-red-600 text-white hover:bg-red-500">
                    {isAddingComment && <LoaderCircle className="animate-spin" />}
                    Comment
                  </Button>
                </div>
              </form>
            ) : (
              <Card className="border-white/[0.07] bg-[#121216]">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="text-sm text-zinc-400">Sign in to join the conversation.</p>
                  <Button asChild variant="outline" className="border-white/10 text-zinc-200">
                    <Link to="/login">Sign in</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <RequestError error={commentsError} />
            {commentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-xl bg-white/[0.05]" />
                <Skeleton className="h-20 rounded-xl bg-white/[0.05]" />
              </div>
            ) : comments.length ? (
              <div className="space-y-3">
                {comments.map((comment) => {
                  const isCommentOwner = currentUserId && String(comment.owner?._id) === currentUserId;
                  const isEditing = editingCommentId === comment._id;
                  return (
                    <Card key={comment._id} className="border-white/[0.06] bg-[#121216]">
                      <CardContent className="flex gap-3 p-4">
                        <Avatar className="size-9 shrink-0">
                          <AvatarImage src={comment.owner?.avatar} alt={comment.owner?.fullName || "Viewer"} />
                          <AvatarFallback className="bg-zinc-800 text-zinc-200">
                            {comment.owner?.fullName?.slice(0, 1) || "V"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-medium text-zinc-200">{comment.owner?.fullName || "Viewer"}</span>
                            <span className="text-xs text-zinc-600">@{comment.owner?.username || "viewer"}</span>
                            <span className="text-xs text-zinc-600">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          {isEditing ? (
                            <form
                              className="mt-3 space-y-2"
                              onSubmit={async (event) => {
                                event.preventDefault();
                                setActionError("");
                                try {
                                  await updateComment({ commentId: comment._id, content: editingText.trim() }).unwrap();
                                  setEditingCommentId("");
                                  setActionMessage("Your comment was updated.");
                                } catch (requestError) {
                                  setActionError(requestError.data?.message || "Could not update your comment.");
                                }
                              }}
                            >
                              <textarea
                                aria-label="Edit comment"
                                value={editingText}
                                onChange={(event) => setEditingText(event.target.value.slice(0, 2000))}
                                maxLength={2000}
                                required
                                className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-red-400/40"
                              />
                              <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={isUpdatingComment || !editingText.trim()}>
                                  {isUpdatingComment ? <LoaderCircle className="animate-spin" /> : <Check />}
                                  Save
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingCommentId("")}>
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{comment.content}</p>
                          )}
                          {isCommentOwner && !isEditing && (
                            <div className="mt-2 flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-zinc-500 hover:text-white"
                                onClick={() => {
                                  setEditingCommentId(comment._id);
                                  setEditingText(comment.content);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-zinc-500 hover:text-red-300"
                                onClick={async () => {
                                  setActionError("");
                                  try {
                                    await deleteComment(comment._id).unwrap();
                                    setActionMessage("Your comment was deleted.");
                                  } catch (requestError) {
                                    setActionError(requestError.data?.message || "Could not delete your comment.");
                                  }
                                }}
                              >
                                <Trash2 />Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : !commentsError ? (
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
                No comments yet. Be the first to share a thought.
              </p>
            ) : null}
            {commentsData?.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                <Button
                  variant="outline"
                  disabled={commentPage <= 1}
                  onClick={() => setCommentPage((page) => page - 1)}
                  className="border-white/10 text-zinc-300"
                >
                  Previous
                </Button>
                <span className="text-xs text-zinc-500">
                  Page {commentsData.page} of {commentsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={commentPage >= commentsData.totalPages}
                  onClick={() => setCommentPage((page) => page + 1)}
                  className="border-white/10 text-zinc-300"
                >
                  Next
                </Button>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">Keep watching</p>
            <h2 className="mt-1 text-lg font-semibold text-white">More videos</h2>
          </div>
          <RequestError error={relatedVideosError} />
          {relatedVideosLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl bg-white/[0.05]" />
              ))}
            </div>
          ) : relatedVideos.length ? relatedVideos.map((related) => (
            <Link
              key={related._id}
              to={`/watch/${related._id}`}
              className="group flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <img src={related.thumbnail} alt="" className="aspect-video w-36 shrink-0 rounded-lg bg-black object-cover" />
              <span className="min-w-0 py-0.5">
                <span className="line-clamp-2 block text-sm font-medium leading-5 text-zinc-200 group-hover:text-white">{related.title}</span>
                <span className="mt-2 block truncate text-xs text-zinc-500">{related.owner?.fullName || "Creator"}</span>
                <span className="mt-1 block text-xs text-zinc-600">{Number(related.views || 0).toLocaleString()} views</span>
              </span>
            </Link>
          )) : (
            <Card className="border-white/[0.07] bg-[#121216]">
              <CardContent className="p-4 text-sm text-zinc-500">No other videos are available yet.</CardContent>
            </Card>
          )}
        </aside>
      </main>
    </div>
  );
}

export default WatchPage;
