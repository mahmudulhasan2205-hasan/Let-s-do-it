import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Bell, Check, LoaderCircle, MessageSquareText, Send, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCreateCommunityPostMutation,
  useDeleteCommunityPostMutation,
  useGetCommunityFeedQuery,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/features/community/communityApi";

const notificationCopy = {
  new_video: "published a new video",
  new_follower: "started following your channel",
  new_community_post: "shared a community update",
  video_comment: "commented on your video",
  video_like: "liked your video",
  comment_reply: "replied to your comment",
  comment_like: "liked your comment",
  suspicious_login: "detected a login from a new device or location",
};

function RequestError({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="mb-5 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200">
      {error.data?.message || error.error || "Something went wrong. Please try again."}
    </p>
  );
}

function CommunityPage() {
  const user = useSelector((state) => state.auth.user);
  const [content, setContent] = useState("");
  const [actionError, setActionError] = useState(null);
  const { data: posts = [], isLoading, error } = useGetCommunityFeedQuery();
  const [createPost, { isLoading: isPosting }] = useCreateCommunityPostMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeleteCommunityPostMutation();

  const submitPost = async (event) => {
    event.preventDefault();
    setActionError(null);
    try {
      await createPost({ content: content.trim() }).unwrap();
      setContent("");
    } catch (requestError) {
      setActionError(requestError);
    }
  };

  const removePost = async (postId) => {
    setActionError(null);
    try {
      await deletePost(postId).unwrap();
    } catch (requestError) {
      setActionError(requestError);
    }
  };

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-7">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-red-300">Creator community</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[38px]">Community</h1>
        <p className="mt-2 text-sm text-zinc-400">Share updates and see what creators you follow are posting.</p>
      </div>
      <RequestError error={actionError || error} />

      <Card className="mb-6 border-white/[0.07] bg-[#121216]">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={submitPost}>
            <label htmlFor="community-post" className="mb-2 block text-sm font-medium text-zinc-200">
              Share an update
            </label>
            <textarea
              id="community-post"
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, 500))}
              maxLength={500}
              rows={4}
              placeholder="What would you like your community to know?"
              className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-red-400/40"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">{content.length}/500</span>
              <Button type="submit" disabled={isPosting || !content.trim()} className="bg-red-600 text-white hover:bg-red-500">
                {isPosting ? <LoaderCircle className="animate-spin" /> : <Send />}
                Post update
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading && <p className="py-12 text-center text-sm text-zinc-400">Loading community posts…</p>}
      {!isLoading && !error && !posts.length && (
        <Card className="border-white/[0.07] bg-white/[0.02]">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <MessageSquareText className="mb-4 size-9 text-zinc-500" />
            <h2 className="text-lg font-semibold text-white">Your community feed is quiet</h2>
            <p className="mt-2 max-w-sm text-sm text-zinc-400">
              Follow creators to see their community updates, or share your first post above.
            </p>
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">
        {posts.map((post) => {
          const isOwnPost = String(post.owner?._id) === String(user?._id);
          return (
            <Card key={post._id} className="border-white/[0.07] bg-[#121216]">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10 border border-white/10">
                    <AvatarImage src={post.owner?.avatar} alt={post.owner?.fullName || "Creator"} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-200">
                      {post.owner?.fullName?.slice(0, 1)?.toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link to={`/channel/${encodeURIComponent(post.owner?.username || "")}`} className="text-sm font-semibold text-zinc-100 hover:text-red-200">
                        {post.owner?.fullName || "Creator"}
                      </Link>
                      <span className="text-xs text-zinc-500">@{post.owner?.username || "creator"}</span>
                      <span className="text-xs text-zinc-600">· {new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{post.content}</p>
                  </div>
                  {isOwnPost && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Delete post"
                      disabled={isDeleting}
                      onClick={() => removePost(post._id)}
                      className="shrink-0 text-zinc-500 hover:text-red-300"
                    >
                      {isDeleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function NotificationsPage() {
  const { data, isLoading, error } = useGetNotificationsQuery();
  const [markRead, { error: markError }] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll, error: markAllError }] =
    useMarkAllNotificationsReadMutation();
  const notifications = data?.notifications || [];
  const actionError = markError || markAllError;

  const getDestination = (notification) => {
    if (notification.type === "suspicious_login") {
      return "/dashboard";
    }
    if (notification.video?._id && notification.video.isPublished) {
      return `/watch/${notification.video._id}`;
    }
    if (notification.actor?.username) {
      return `/channel/${encodeURIComponent(notification.actor.username)}`;
    }
    return "/notifications";
  };

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-red-300">Stay in the loop</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[38px]">Notifications</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {data?.unreadCount ? `${data.unreadCount} unread updates` : "You’re all caught up."}
          </p>
        </div>
        {!!data?.unreadCount && (
          <Button
            type="button"
            variant="outline"
            disabled={isMarkingAll}
            onClick={() => markAllRead()}
            className="border-white/10 bg-white/[0.03] text-zinc-200"
          >
            {isMarkingAll ? <LoaderCircle className="animate-spin" /> : <Check />}
            Mark all read
          </Button>
        )}
      </div>
      <RequestError error={actionError || error} />
      {isLoading && <p className="py-12 text-center text-sm text-zinc-400">Loading notifications…</p>}
      {!isLoading && !error && !notifications.length && (
        <Card className="border-white/[0.07] bg-white/[0.02]">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <Bell className="mb-4 size-9 text-zinc-500" />
            <h2 className="text-lg font-semibold text-white">No notifications yet</h2>
            <p className="mt-2 text-sm text-zinc-400">Updates from creators and viewers will show up here.</p>
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <Link
            key={notification._id}
            to={getDestination(notification)}
            onClick={() => {
              if (!notification.readAt) markRead(notification._id);
            }}
            className={`flex items-start gap-3 rounded-xl border p-4 transition hover:border-white/[0.14] ${
              notification.readAt
                ? "border-white/[0.06] bg-white/[0.015]"
                : "border-red-300/15 bg-red-400/[0.04]"
            }`}
          >
            <Avatar className="size-10 border border-white/10">
              <AvatarImage src={notification.actor?.avatar} alt={notification.actor?.fullName || "User"} />
              <AvatarFallback className="bg-zinc-800 text-zinc-200">
                {notification.actor?.fullName?.slice(0, 1)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-6 text-zinc-200">
                <span className="font-medium text-white">{notification.actor?.fullName || "Someone"}</span>{" "}
                {notificationCopy[notification.type] || "sent you an update"}
                {notification.video?.title && <span className="text-zinc-400">: {notification.video.title}</span>}
              </span>
              <span className="mt-1 block text-xs text-zinc-500">
                {new Date(notification.createdAt).toLocaleString()}
              </span>
            </span>
            {!notification.readAt && <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-red-300" />}
          </Link>
        ))}
      </div>
    </section>
  );
}

export { CommunityPage, NotificationsPage };
