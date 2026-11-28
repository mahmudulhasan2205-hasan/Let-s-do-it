
import { useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  BellDot,
  BellPlus,
  Bell,
  Clapperboard,
  Clock3,
  Compass,
  Heart,
  House,
  LayoutDashboard,
  ListVideo,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  Play,
  MoreHorizontal,
  Sparkles,
  Tv2,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { ThemeProvider, ThemeToggle } from "./components/ThemeProvider";
import LocalGuideAssistant from "./components/LocalGuideAssistant";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Upload from "./pages/Upload";
import ShortsPage from "./pages/ShortsPage";
import { CommunityPage, NotificationsPage } from "./pages/CommunityPages";
import WatchPage from "./pages/WatchPage";
import { useGetNotificationsQuery } from "./features/community/communityApi";
import {
  useGetRecommendedVideosQuery,
  useRecordVideoViewMutation,
} from "./features/video/videoApi";
import {
  useGetCurrentUserQuery,
  useLogoutUserMutation,
  useSearchCreatorsQuery,
} from "./features/auth/authApi";
import { logout } from "./features/auth/authSlice";
import {
  useGetLikedVideosQuery,
  useGetSubscriptionsQuery,
  useToggleSubscriptionMutation,
  useToggleVideoLikeMutation,
} from "./features/library/libraryApi";
import { Button } from "./components/ui/button";
import LibraryLayout from "./components/LibraryLayout";
import {
  ChannelProfilePage,
  DashboardPage,
  HistoryPage,
  LikedVideosPage,
  PlaylistDetailPage,
  PlaylistsPage,
  SubscriptionsPage,
} from "./pages/LibraryPages";
import { useRecordWatchHistoryMutation } from "./features/library/libraryApi";

function RequireAuth() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

const homeNavigation = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/shorts", label: "Shorts", icon: Clapperboard },
  { to: "/community", label: "Community", icon: MessageSquareText },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/subscriptions", label: "Subscriptions", icon: Tv2 },
  { to: "/history", label: "Watch history", icon: Clock3 },
  { to: "/liked", label: "Liked videos", icon: Heart },
  { to: "/playlists", label: "Playlists", icon: ListVideo },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function HomeNavigation({ onNavigate }) {
  return homeNavigation.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? "border-red-400/15 bg-gradient-to-r from-red-500/[0.12] to-red-500/[0.03] text-white shadow-[inset_2px_0_0_#f87171]"
            : "border-transparent text-zinc-400 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-zinc-100"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`grid size-8 place-items-center rounded-lg transition ${
            isActive
              ? "bg-red-400/10 text-red-300"
              : "bg-white/[0.035] text-zinc-500 group-hover:bg-white/[0.07] group-hover:text-zinc-200"
          }`}>
            <Icon className="size-[17px]" />
          </span>
          <span className="flex-1">{label}</span>
          {isActive && <span className="size-1.5 rounded-full bg-red-300 shadow-[0_0_10px_#f87171]" />}
        </>
      )}
    </NavLink>
  ));
}

function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const viewedVideoIds = useRef(new Set());
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { data: currentUser } = useGetCurrentUserQuery(undefined, {
    skip: !isAuthenticated,
  });
  const viewer = currentUser || user;
  const [logoutUser] = useLogoutUserMutation();
  const [recordWatchHistory] = useRecordWatchHistoryMutation();
  const [recordVideoView, { error: viewError }] = useRecordVideoViewMutation();
  const { data, isLoading, error } = useGetRecommendedVideosQuery(search);
  const { data: likedVideos = [] } = useGetLikedVideosQuery(undefined, {
    skip: !isAuthenticated,
  });
  const { data: notificationData } = useGetNotificationsQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 30_000,
  });
  const { data: subscriptions = [] } = useGetSubscriptionsQuery(viewer?._id, {
    skip: !isAuthenticated || !viewer?._id,
  });
  const [toggleLike, { error: likeError }] = useToggleVideoLikeMutation();
  const [toggleSubscription, { error: subscriptionError }] =
    useToggleSubscriptionMutation();
  const likedVideoIds = new Set(likedVideos.map((video) => video._id));
  const subscribedChannelIds = new Set(
    subscriptions.map((subscription) => subscription.channel?._id).filter(Boolean),
  );
  const viewerId = viewer?._id ? String(viewer._id) : null;
  const viewerUsername = viewer?.username?.toLowerCase();
  const { data: creatorResults = [] } = useSearchCreatorsQuery(search, {
    skip: search.trim().length < 2,
  });
  const visibleVideos = (data?.videos || []).filter((video) => {
    if (selectedCategory === "All") return true;
    const searchable = `${video.title || ""} ${video.description || ""} ${video.owner?.fullName || ""} ${video.owner?.username || ""}`.toLowerCase();
    if (selectedCategory === "Trending") return Number(video.views || 0) >= 1;
    return searchable.includes(selectedCategory.toLowerCase());
  }).sort((first, second) => {
    if (selectedCategory !== "Trending") return 0;
    return Number(second.views || 0) - Number(first.views || 0);
  });

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
    } finally {
      dispatch(logout());
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-zinc-100">
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0b0b0d]/90 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-red-400 to-red-700 text-sm font-black text-white shadow-lg shadow-red-950/40">L</span>
            <span className="hidden text-lg font-semibold tracking-tight text-white sm:inline">Lets-do-it</span>
          </Link>
        </div>
        <div className="relative mx-2 hidden w-full max-w-[620px] sm:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[17px] -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            aria-label="Search videos"
            placeholder="Search videos, creators, topics..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-full border border-white/[0.09] bg-white/[0.04] pl-11 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-red-400/40 focus:bg-white/[0.06]"
          />
          {search.trim().length >= 2 && creatorResults.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-white/[0.08] bg-[#151518] p-1 shadow-2xl">
              {creatorResults.map((creator) => (
                <Link
                  key={creator._id}
                  to={`/channel/${encodeURIComponent(creator.username)}`}
                  onClick={() => setSearch("")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.06]"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={creator.avatar} alt={creator.fullName} />
                    <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">{creator.fullName?.slice(0, 1) || "C"}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">{creator.fullName}</span>
                    <span className="block truncate text-xs text-zinc-500">@{creator.username}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/notifications"
                aria-label={`${notificationData?.unreadCount || 0} unread notifications`}
                className="relative grid size-10 place-items-center rounded-full text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                <Bell className="size-[18px]" />
                {(notificationData?.unreadCount || 0) > 0 && (
                  <span className="absolute right-0 top-0 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {notificationData.unreadCount > 99 ? "99+" : notificationData.unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/dashboard" aria-label="Open your dashboard" className="hidden items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-white/[0.06] sm:flex">
                <Avatar className="size-8 border border-white/10">
                  <AvatarImage src={viewer?.avatar} alt={viewer?.fullName || "Your profile"} />
                  <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
                    {viewer?.fullName?.slice(0, 1)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-28 truncate text-xs text-zinc-300">{viewer?.fullName || "Your profile"}</span>
              </Link>
              <Link to="/dashboard" aria-label="Open your dashboard" className="sm:hidden">
                <Avatar className="size-8 border border-white/10">
                  <AvatarImage src={viewer?.avatar} alt={viewer?.fullName || "Your profile"} />
                  <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
                    {viewer?.fullName?.slice(0, 1)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button asChild size="sm" className="bg-red-600 text-white hover:bg-red-500">
                <Link to="/upload"><Clapperboard />Upload</Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleLogout} className="text-zinc-400 hover:text-white">
                <LogOut />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="text-zinc-300 hover:text-white">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-red-600 text-white hover:bg-red-500">
                <Link to="/register">Create account</Link>
              </Button>
            </>
          )}
          <ThemeToggle className="text-zinc-400 hover:text-white" />
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-[250px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.07] bg-gradient-to-b from-white/[0.025] via-[#101014] to-[#0d0d10] p-4 lg:flex">
          <div className="mb-5 shrink-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-red-500/[0.12] via-[#1a1418] to-[#111114] p-4">
            <div className="mb-3 flex size-9 items-center justify-center rounded-xl border border-red-300/10 bg-red-400/10 text-red-300">
              <Sparkles className="size-[17px]" />
            </div>
            <p className="text-sm font-semibold tracking-tight text-white">Find your next favorite</p>
            <p className="mt-1.5 text-xs leading-5 text-zinc-500">Fresh videos and creators picked for your curiosity.</p>
            <Link to="/" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-300 transition hover:text-red-200">
              Explore videos <Compass className="size-3.5" />
            </Link>
          </div>
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Browse</p>
          <nav className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
            <HomeNavigation />
            </div>
          </nav>
          {isAuthenticated ? (
            <div className="mt-auto shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
              <div className="mb-2 flex min-w-0 items-center gap-2.5 px-1 py-1">
                <Link to="/dashboard" aria-label="Open your dashboard" className="shrink-0">
                  <Avatar className="size-8 border border-white/10">
                    <AvatarImage src={viewer?.avatar} alt={viewer?.fullName || "Your profile"} />
                    <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
                      {viewer?.fullName?.slice(0, 1)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0">
                  <Link to="/dashboard" className="block truncate text-xs font-medium text-zinc-200 hover:text-white">
                    {viewer?.fullName || "Your profile"}
                  </Link>
                  <p className="truncate text-[11px] text-zinc-500">@{viewer?.username || "creator"}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-3 px-2 text-xs text-zinc-500 hover:bg-red-500/[0.07] hover:text-red-200"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <div className="mt-auto shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <p className="text-xs font-semibold text-zinc-200">Make it yours</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Sign in to save videos and follow creators.</p>
              <Link to="/login" className="mt-3 inline-flex text-xs font-semibold text-red-300 hover:text-red-200">
                Sign in to your account
              </Link>
            </div>
          )}
        </aside>

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
                <HomeNavigation onNavigate={() => setMobileMenuOpen(false)} />
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

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="relative mb-5 sm:hidden">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[17px] -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              aria-label="Search videos"
              placeholder="Search videos and creators..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-full border border-white/[0.09] bg-white/[0.04] pl-11 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
            {search.trim().length >= 2 && creatorResults.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-white/[0.08] bg-[#151518] p-1 shadow-2xl">
                {creatorResults.map((creator) => (
                  <Link
                    key={creator._id}
                    to={`/channel/${encodeURIComponent(creator.username)}`}
                    onClick={() => setSearch("")}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.06]"
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={creator.avatar} alt={creator.fullName} />
                      <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">{creator.fullName?.slice(0, 1) || "C"}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{creator.fullName}</span>
                      <span className="block truncate text-xs text-zinc-500">@{creator.username}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="mb-7">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">
              {data?.personalized ? "For you" : "Discover"}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-[38px]">
              {search ? `Results for "${search}"` : data?.personalized ? "Picked for you" : "Explore videos"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              {data?.personalized
                ? "Fresh videos from creators and topics that match your interests."
                : "Popular and recently uploaded videos, refreshed as you explore."}
            </p>
          </div>
          <div className="-mx-4 mb-7 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {["All", "Trending", "Learning", "Music", "Technology", "Gaming", "Lifestyle", "Sports"].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition ${
                  selectedCategory === category
                    ? "border-red-400/40 bg-red-500 text-white shadow-sm shadow-red-950/30"
                    : "border-white/[0.08] bg-white/[0.035] text-zinc-400 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-zinc-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          {isAuthenticated && (
            <p className="mb-5 text-xs text-gray-500">
              When you’re signed in, creators can see your name on videos you watch.
            </p>
          )}

          {isLoading && (
            <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Loading videos">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#121216]">
                  <div className="aspect-video animate-pulse bg-white/[0.05]" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-4/5 animate-pulse rounded bg-white/[0.07]" />
                    <div className="h-3 w-2/5 animate-pulse rounded bg-white/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-red-400">Could not load videos.</p>}
          {(likeError || subscriptionError) && (
            <p role="alert" className="mb-5 text-sm text-red-300">
              {likeError?.data?.message ||
                subscriptionError?.data?.message ||
                "Could not update your preferences. Please try again."}
            </p>
          )}
          {viewError && (
            <p role="alert" className="mb-5 text-sm text-red-300">
              {viewError?.data?.message || "Could not record this video view."}
            </p>
          )}
          {!isLoading && visibleVideos.length === 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center">
              <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-red-400/10 text-red-300">
                <Search className="size-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No videos found</h3>
              <p className="text-sm text-zinc-500">
                {search ? "Try a different search or clear a category." : "Check back when more videos are available."}
              </p>
              {(search || selectedCategory !== "All") && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSelectedCategory("All"); }}
                  className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {visibleVideos.map((video) => (
              <article
                key={video._id}
                className="video-card-3d group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#121216] transition-[border-color,box-shadow] duration-300 hover:border-white/[0.14]"
                onMouseMove={(event) => {
                  const card = event.currentTarget;
                  const rect = card.getBoundingClientRect();
                  const x = (event.clientX - rect.left) / rect.width;
                  const y = (event.clientY - rect.top) / rect.height;
                  const rotateX = (0.5 - y) * 8;
                  const rotateY = (x - 0.5) * 8;
                  card.style.setProperty("--rotate-x", `${rotateX}deg`);
                  card.style.setProperty("--rotate-y", `${rotateY}deg`);
                  card.style.setProperty("--glow-x", `${x * 100}%`);
                  card.style.setProperty("--glow-y", `${y * 100}%`);
                }}
                onMouseLeave={(event) => {
                  const card = event.currentTarget;
                  card.style.setProperty("--rotate-x", "0deg");
                  card.style.setProperty("--rotate-y", "0deg");
                }}
              >
                <Link
                  to={`/watch/${video._id}`}
                  className="relative block aspect-video overflow-hidden bg-black"
                  onClick={() => {
                    if (!viewedVideoIds.current.has(video._id)) {
                      viewedVideoIds.current.add(video._id);
                      recordVideoView(video._id);
                    }
                    if (isAuthenticated) recordWatchHistory(video._id);
                  }}
                >
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <video src={video.videoFile} preload="metadata" muted className="h-full w-full object-cover" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-60" />
                  <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                    <span className="grid size-12 place-items-center rounded-full bg-white/90 text-zinc-950 shadow-xl">
                      <Play className="ml-0.5 size-5 fill-current" />
                    </span>
                  </span>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-[15px] font-semibold leading-5 text-zinc-100">
                        <Link to={`/watch/${video._id}`} className="transition hover:text-red-300">
                          {video.title}
                        </Link>
                      </h3>
                      {video.description && (
                        <p className="mt-1.5 line-clamp-1 text-xs text-zinc-500">{video.description}</p>
                      )}
                      <p className="mt-2.5 text-xs text-zinc-500">
                        {video.owner?.username ? (
                          <Link
                            to={`/channel/${encodeURIComponent(video.owner.username)}`}
                            className="transition hover:text-red-300"
                          >
                            @{video.owner.username}
                          </Link>
                        ) : (
                          "Creator"
                        )}{" "}
                        · {video.views} views
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {isAuthenticated ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-pressed={likedVideoIds.has(video._id)}
                          onClick={() => toggleLike(video._id)}
                          className={`border-gray-700 bg-gray-800 text-xs ${
                            likedVideoIds.has(video._id)
                              ? "text-rose-300 hover:bg-rose-950"
                              : "text-gray-200 hover:bg-gray-700"
                          }`}
                        >
                          <Heart
                            className={
                              likedVideoIds.has(video._id) ? "fill-current" : ""
                            }
                          />
                          {likedVideoIds.has(video._id) ? "Liked" : "Like"}
                        </Button>
                      ) : (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-gray-700 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                        >
                          <Link to="/login">
                            <Heart />
                            Like
                          </Link>
                        </Button>
                      )}
                      {video.owner?._id &&
                        (!isAuthenticated ||
                          (viewer &&
                            String(video.owner._id) !== viewerId &&
                            video.owner.username?.toLowerCase() !== viewerUsername)) && (
                        isAuthenticated ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-pressed={subscribedChannelIds.has(video.owner._id)}
                            onClick={() => toggleSubscription(video.owner._id)}
                            className={`border-gray-700 bg-gray-800 text-xs ${
                              subscribedChannelIds.has(video.owner._id)
                                ? "text-emerald-300 hover:bg-emerald-950"
                                : "text-gray-200 hover:bg-gray-700"
                            }`}
                          >
                            {subscribedChannelIds.has(video.owner._id) ? (
                              <BellDot />
                            ) : (
                              <BellPlus />
                            )}
                            {subscribedChannelIds.has(video.owner._id)
                              ? "Subscribed"
                              : "Subscribe"}
                          </Button>
                        ) : (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-gray-700 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                          >
                            <Link to="/login">
                              <BellPlus />
                              Subscribe
                            </Link>
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/shorts" element={<ShortsPage />} />
        <Route path="/channel/:username" element={<ChannelProfilePage />} />
        <Route path="/watch/:videoId" element={<WatchPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<LibraryLayout />}>
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/liked" element={<LikedVideosPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlists/:playlistId" element={<PlaylistDetailPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>
        </Routes>
        <LocalGuideAssistant />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
