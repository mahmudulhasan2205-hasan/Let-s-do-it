import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { BellDot, BellPlus, Clapperboard, Heart, LoaderCircle, LogOut, Menu, Video, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PrimaryNavigation, PrimarySidebar } from "@/components/PrimarySidebar";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useGetCurrentUserQuery, useLogoutUserMutation } from "@/features/auth/authApi";
import { logout } from "@/features/auth/authSlice";
import {
  useGetLikedVideosQuery,
  useGetSubscriptionsQuery,
  useRecordWatchHistoryMutation,
  useToggleSubscriptionMutation,
  useToggleVideoLikeMutation,
} from "@/features/library/libraryApi";
import { useGetShortVideosQuery, useRecordVideoViewMutation } from "@/features/video/videoApi";

function ShortsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const storedUser = useSelector((state) => state.auth.user);
  const { data: currentUser } = useGetCurrentUserQuery(undefined, { skip: !isAuthenticated });
  const viewer = currentUser || storedUser;
  const [logoutUser] = useLogoutUserMutation();
  const viewedIds = useRef(new Set());
  const { data, isLoading, error } = useGetShortVideosQuery();
  const { data: likedVideos = [] } = useGetLikedVideosQuery(undefined, { skip: !isAuthenticated });
  const { data: subscriptions = [] } = useGetSubscriptionsQuery(viewer?._id, {
    skip: !isAuthenticated || !viewer?._id,
  });
  const [toggleLike, { error: likeError }] = useToggleVideoLikeMutation();
  const [toggleSubscription, { error: subscriptionError }] = useToggleSubscriptionMutation();
  const [recordVideoView, { error: viewError }] = useRecordVideoViewMutation();
  const [recordWatchHistory, { error: historyError }] = useRecordWatchHistoryMutation();
  const videos = data?.videos || [];
  const likedIds = new Set(likedVideos.map((video) => video._id));
  const subscribedIds = new Set(subscriptions.map((subscription) => subscription.channel?._id));
  const actionError = likeError || subscriptionError || viewError || historyError;

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
    } finally {
      dispatch(logout());
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-zinc-100">
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-white/[0.07] bg-[#0b0b0e]/90 px-4 backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-white">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-red-400 to-red-700 text-sm font-black text-white">L</span>
            <span>Lets-do-it</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.03] text-zinc-200">
            <Link to="/">Videos</Link>
          </Button>
          {isAuthenticated && (
            <>
              <Link to="/dashboard" aria-label="Open your dashboard">
                <Avatar className="size-8 border border-white/10">
                  <AvatarImage src={viewer?.avatar} alt={viewer?.fullName || "Your profile"} />
                  <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
                    {viewer?.fullName?.slice(0, 1)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button asChild size="sm" className="bg-red-600 text-white hover:bg-red-500">
                <Link to="/upload">Upload</Link>
              </Button>
            </>
          )}
          <ThemeToggle className="text-zinc-400 hover:text-white" />
        </div>
      </header>
      <div className="flex">
        <PrimarySidebar isAuthenticated={isAuthenticated} user={viewer} onLogout={handleLogout} />
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-[68px] z-20 bg-black/60 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <aside
              className="h-full w-[min(82vw,300px)] border-r border-white/10 bg-[#101014] p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Browse</p>
              <nav className="flex flex-col gap-1.5">
                <PrimaryNavigation onNavigate={() => setMobileMenuOpen(false)} />
              </nav>
              {isAuthenticated && (
                <div className="mt-5 border-t border-white/[0.08] pt-4">
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="mb-3 flex items-center gap-3 px-2">
                    <Avatar className="size-9 border border-white/10">
                      <AvatarImage src={viewer?.avatar} alt={viewer?.fullName || "Your profile"} />
                      <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
                        {viewer?.fullName?.slice(0, 1)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-200">{viewer?.fullName || "Your profile"}</span>
                      <span className="block truncate text-xs text-zinc-500">Open dashboard</span>
                    </span>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-400" onClick={handleLogout}>
                    <LogOut className="size-4" />Sign out
                  </Button>
                </div>
              )}
            </aside>
          </div>
        )}
        <main className="min-h-[calc(100vh-68px)] min-w-0 flex-1 px-4 py-8 sm:px-7">
        <div className="mx-auto max-w-5xl">
        <div className="mb-7">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-red-300">
            <Clapperboard className="size-3.5" /> Short videos
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[38px]">Shorts</h1>
          <p className="mt-2 text-sm text-zinc-400">Quick videos, each 60 seconds or less.</p>
        </div>

        {actionError && (
          <p role="alert" className="mb-5 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200">
            {actionError.data?.message || "That action failed. Please try again."}
          </p>
        )}
        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-zinc-400">
            <LoaderCircle className="size-5 animate-spin" /> Loading shorts…
          </div>
        )}
        {error && <p role="alert" className="py-12 text-center text-sm text-red-300">Could not load shorts. Please try again.</p>}
        {!isLoading && !error && !videos.length && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-16 text-center">
            <Video className="mx-auto mb-4 size-9 text-zinc-500" />
            <h2 className="text-lg font-semibold text-white">No shorts yet</h2>
            <p className="mt-2 text-sm text-zinc-400">Be the first to share a short video.</p>
            {isAuthenticated && (
              <Button asChild className="mt-5 bg-red-600 text-white hover:bg-red-500">
                <Link to="/upload">Upload a short</Link>
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => {
            const ownerId = String(video.owner?._id || "");
            const isOwnVideo = ownerId && ownerId === String(viewer?._id || "");
            return (
              <article key={video._id} className="mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121216]">
                <div className="relative aspect-[9/16] max-h-[76svh] bg-black">
                  <video
                    src={video.videoFile}
                    poster={video.thumbnail}
                    controls
                    playsInline
                    preload="metadata"
                    onPlay={() => {
                      if (!viewedIds.current.has(video._id)) {
                        viewedIds.current.add(video._id);
                        recordVideoView(video._id);
                      }
                      if (isAuthenticated) recordWatchHistory(video._id);
                    }}
                    className="size-full object-contain"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 border border-white/10">
                      <AvatarImage src={video.owner?.avatar} alt={video.owner?.fullName || "Creator"} />
                      <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
                        {video.owner?.fullName?.slice(0, 1)?.toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      to={`/channel/${encodeURIComponent(video.owner?.username || "")}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200 hover:text-red-200"
                    >
                      @{video.owner?.username || "creator"}
                    </Link>
                    {!isOwnVideo && video.owner?._id && (
                      isAuthenticated ? (
                        <Button
                          size="sm"
                          variant="outline"
                          aria-pressed={subscribedIds.has(video.owner._id)}
                          onClick={() => toggleSubscription(video.owner._id)}
                          className="border-white/10 bg-white/[0.03] text-xs text-zinc-200"
                        >
                          {subscribedIds.has(video.owner._id) ? <BellDot /> : <BellPlus />}
                          {subscribedIds.has(video.owner._id) ? "Following" : "Follow"}
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-xs text-zinc-200">
                          <Link to="/login"><BellPlus />Follow</Link>
                        </Button>
                      )
                    )}
                  </div>
                  <div>
                    <Link to={`/watch/${video._id}`} className="line-clamp-2 text-sm font-semibold text-white hover:text-red-200">
                      {video.title}
                    </Link>
                    {video.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{video.description}</p>}
                    <p className="mt-2 text-xs text-zinc-500">{Number(video.views || 0).toLocaleString()} views</p>
                  </div>
                  {isAuthenticated ? (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-pressed={likedIds.has(video._id)}
                      onClick={() => toggleLike(video._id)}
                      className={`border-white/10 bg-white/[0.03] ${likedIds.has(video._id) ? "text-rose-300" : "text-zinc-300"}`}
                    >
                      <Heart className={likedIds.has(video._id) ? "fill-current" : ""} />
                      {likedIds.has(video._id) ? "Liked" : "Like"}
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.03] text-zinc-300">
                      <Link to="/login"><Heart />Like</Link>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        </div>
      </main>
      </div>
    </div>
  );
}

export default ShortsPage;
