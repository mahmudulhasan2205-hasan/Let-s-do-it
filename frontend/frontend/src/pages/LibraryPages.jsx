import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
  Clock3,
  Eye,
  Heart,
  ListVideo,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Tv2,
  Video,
  UsersRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetChannelProfileQuery,
  useGetCurrentUserQuery,
  useGetLoginActivityQuery,
  useGetActiveSessionsQuery,
  useRevokeSessionMutation,
  useRevokeAllSessionsMutation,
  useRequestEmailVerificationMutation,
  useSetupTwoFactorMutation,
  useEnableTwoFactorMutation,
  useDisableTwoFactorMutation,
  useUpdateAccountMutation,
} from "@/features/auth/authApi";
import {
  useAddVideoToPlaylistMutation,
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  useGetLikedVideosQuery,
  useGetPlaylistQuery,
  useGetPlaylistsQuery,
  useGetSubscriptionsQuery,
  useGetWatchHistoryQuery,
  useRecordWatchHistoryMutation,
  useRemoveVideoFromPlaylistMutation,
  useToggleSubscriptionMutation,
  useToggleVideoLikeMutation,
} from "@/features/library/libraryApi";
import {
  useGetCurrentUserVideosQuery,
  useGetVideoViewersQuery,
  useGetVideosQuery,
  useDeleteVideoMutation,
  useToggleVideoPublishStatusMutation,
  useUpdateVideoMutation,
} from "@/features/video/videoApi";
import {
  useGetChannelVideosQuery,
  useRecordVideoViewMutation,
} from "@/features/video/videoApi";
import { logout, setUser } from "@/features/auth/authSlice";
import {
  useGetReportsQuery,
  useRemoveReportedContentMutation,
  useResolveReportMutation,
} from "@/features/community/reportApi";

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">{eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[38px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ErrorMessage({ error }) {
  if (!error) return null;
  return (
    <div role="alert" className="mb-5 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200">
      {typeof error === "string"
        ? error
        : error?.data?.message || error?.error || "Something went wrong. Please try again."}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="border-white/[0.07] bg-white/[0.02]">
      <CardContent className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-5 grid size-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-zinc-300">
          <Icon className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </CardContent>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="overflow-hidden border-white/[0.07] bg-white/[0.02]">
          <Skeleton className="aspect-video rounded-none bg-white/[0.06]" />
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-4 w-4/5 bg-white/[0.06]" />
            <Skeleton className="h-3 w-2/5 bg-white/[0.06]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VideoGrid({ videos = [], action, onPlay }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const viewedVideoIds = useRef(new Set());
  const [recordVideoView, { error: viewError }] = useRecordVideoViewMutation();
  const [recordWatchHistory, { error: historyError }] = useRecordWatchHistoryMutation();
  if (!videos.length) return null;
  return (
    <>
      {isAuthenticated && (
        <p className="mb-4 text-xs text-zinc-500">
          When you’re signed in, creators can see your name on videos you watch.
        </p>
      )}
      <ErrorMessage error={viewError || historyError} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {videos.map((video) => (
          <Card key={video._id} className="group overflow-hidden border-white/[0.07] bg-[#121216] transition hover:-translate-y-0.5 hover:border-white/[0.14]">
            <div className="relative aspect-video overflow-hidden bg-black">
              <video
                src={video.videoFile}
                poster={video.thumbnail}
                controls
                preload="none"
                onPlay={() => {
                  if (!viewedVideoIds.current.has(video._id)) {
                    viewedVideoIds.current.add(video._id);
                    recordVideoView(video._id);
                  }
                  if (isAuthenticated) recordWatchHistory(video._id);
                  onPlay?.(video._id);
                }}
                className="h-full w-full object-cover"
              />
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/watch/${video._id}`}
                    className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-100 transition hover:text-red-200"
                  >
                    {video.title}
                  </Link>
                  <p className="mt-2 truncate text-xs text-zinc-400">
                    {video.owner?.username ? (
                      <Link
                        to={`/channel/${encodeURIComponent(video.owner.username)}`}
                        className="transition hover:text-red-200"
                      >
                        {video.owner.fullName || `@${video.owner.username}`}
                      </Link>
                    ) : (
                      video.owner?.fullName || "Creator"
                    )}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {Number(video.views || 0).toLocaleString()} views
                    {video.createdAt ? ` · ${new Date(video.createdAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                {action?.(video)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export function ChannelProfilePage() {
  const { username = "" } = useParams();
  const { isAuthenticated, user: storedViewer } = useSelector((state) => state.auth);
  const { data: currentViewer } = useGetCurrentUserQuery(undefined, {
    skip: !isAuthenticated,
  });
  const viewer = currentViewer || storedViewer;
  const {
    data: channel,
    isLoading: isProfileLoading,
    error: profileError,
  } = useGetChannelProfileQuery(username);
  const {
    data: videos = [],
    isLoading: isVideosLoading,
    error: videosError,
  } = useGetChannelVideosQuery(username);
  const { data: subscriptions = [] } = useGetSubscriptionsQuery(viewer?._id, {
    skip: !isAuthenticated || !viewer?._id,
  });
  const [toggleSubscription, { isLoading: isToggling, error: subscriptionError }] =
    useToggleSubscriptionMutation();
  const isSubscribed = subscriptions.some(
    (subscription) => subscription.channel?._id === channel?._id,
  );
  const isOwnChannel =
    viewer?._id &&
    channel?._id &&
    String(viewer._id) === String(channel._id);

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-[#0b0b0e] px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <Skeleton className="h-52 rounded-2xl bg-white/[0.05]" />
          <Skeleton className="h-20 rounded-2xl bg-white/[0.05]" />
          <LoadingGrid />
        </div>
      </div>
    );
  }

  if (profileError || !channel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0e] px-4 text-zinc-100">
        <EmptyState
          icon={UsersRound}
          title="We couldn’t find that creator"
          description={profileError?.data?.message || "The profile may have been removed or the username may be incorrect."}
          action={<Button asChild className="bg-red-600 text-white hover:bg-red-500"><Link to="/">Back to videos</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-zinc-100">
      <header className="sticky top-0 z-20 flex h-[68px] items-center border-b border-white/[0.07] bg-[#0b0b0e]/90 px-4 backdrop-blur-xl sm:px-7">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-white">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-red-400 to-red-700 text-sm font-black">L</span>
          <span>Lets-do-it</span>
        </Link>
        <Button asChild variant="outline" size="sm" className="ml-auto border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]">
          <Link to="/"><ArrowLeft />Back to videos</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-7 sm:py-9">
        <Card className="mb-8 overflow-hidden border-white/[0.08] bg-[#121216]">
          <div className="relative h-40 overflow-hidden bg-gradient-to-r from-red-950/70 via-[#28202a] to-[#111114] sm:h-64">
            {channel.coverImage && (
              <img src={channel.coverImage} alt="" className="absolute inset-0 size-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-transparent" />
          </div>
          <CardContent className="flex flex-col gap-5 px-5 pb-6 pt-0 sm:flex-row sm:items-end sm:px-8">
            <Avatar className="-mt-10 size-20 shrink-0 border-4 border-[#121216] sm:-mt-12 sm:size-24">
              <AvatarImage src={channel.avatar} alt={channel.fullName} />
              <AvatarFallback className="bg-zinc-800 text-2xl text-zinc-200">{channel.fullName?.slice(0, 1) || "C"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 sm:pb-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-white">{channel.fullName}</h1>
              <p className="mt-1 text-sm text-zinc-400">@{channel.username}</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <UsersRound className="size-4" />
                {Number(channel.subscribersCount || 0).toLocaleString()} subscribers
                <span>·</span>
                {Number(channel.channelsSubscribedToCount || 0).toLocaleString()} following
              </p>
            </div>
            {isOwnChannel ? (
              <Button asChild className="bg-red-600 text-white hover:bg-red-500">
                <Link to="/upload"><Plus />Upload video</Link>
              </Button>
            ) : (
              isAuthenticated ? (
                <Button
                  disabled={isToggling}
                  onClick={() => toggleSubscription(channel._id)}
                  className={isSubscribed
                    ? "border border-white/10 bg-white/[0.05] text-zinc-200 hover:bg-white/10"
                    : "bg-red-600 text-white hover:bg-red-500"}
                >
                  {isToggling && <LoaderCircle className="animate-spin" />}
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </Button>
              ) : (
                <Button asChild className="bg-red-600 text-white hover:bg-red-500">
                  <Link to="/login">Sign in to subscribe</Link>
                </Button>
              )
            )}
          </CardContent>
        </Card>

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">From this creator</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Videos</h2>
          </div>
          {!isVideosLoading && !videosError && (
            <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-300">
              {videos.length} {videos.length === 1 ? "video" : "videos"}
            </Badge>
          )}
        </div>
        <ErrorMessage error={subscriptionError || videosError} />
        {isVideosLoading ? <LoadingGrid /> : videos.length ? (
          <VideoGrid videos={videos} />
        ) : (
          <EmptyState
            icon={Video}
            title={isOwnChannel ? "Your channel is ready" : "No videos yet"}
            description={
              isOwnChannel
                ? "You haven’t published any videos yet. Upload your first video to get started."
                : "This creator hasn’t published any videos yet. Check back later."
            }
            action={isOwnChannel && (
              <Button asChild className="bg-red-600 text-white hover:bg-red-500">
                <Link to="/upload"><Plus />Upload your first video</Link>
              </Button>
            )}
          />
        )}
      </main>
    </div>
  );
}

export function SubscriptionsPage() {
  const { user } = useOutletContext();
  const { data: subscriptions = [], isLoading, error } = useGetSubscriptionsQuery(user?._id, { skip: !user?._id });
  const [toggleSubscription, { error: actionError }] = useToggleSubscriptionMutation();

  return (
    <>
      <PageHeading
        eyebrow="Stay in the loop"
        title="Subscriptions"
        description="Creators you follow, all in one place. New videos from your favorite channels are never far away."
      />
      <ErrorMessage error={error || actionError} />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl bg-white/[0.05]" />)}
        </div>
      ) : subscriptions.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subscriptions.map(({ _id, channel }) => channel && (
            <Card key={_id} className="border-white/[0.07] bg-[#121216] transition hover:border-white/[0.14]">
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar className="size-12 border border-white/10">
                  <AvatarImage src={channel.avatar} alt={channel.fullName} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-200">{channel.fullName?.slice(0, 1) || "C"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{channel.fullName}</p>
                  <p className="truncate text-xs text-zinc-500">@{channel.username}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!channel._id}
                  className="border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-red-500/10 hover:text-red-200"
                  onClick={() => toggleSubscription(channel._id)}
                >
                  Following
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Tv2}
          title="Your subscriptions will show up here"
          description="Find creators you enjoy and follow their channels to keep up with new uploads."
          action={<Button asChild className="bg-red-600 text-white hover:bg-red-500"><Link to="/">Explore videos</Link></Button>}
        />
      )}
    </>
  );
}

export function HistoryPage() {
  const { data: videos = [], isLoading, error } = useGetWatchHistoryQuery();

  return (
    <>
      <PageHeading
        eyebrow="Pick up where you left off"
        title="Watch history"
        description="Videos you’ve recently watched are saved here, with the newest at the top."
        action={videos.length > 0 && (
          <Badge variant="outline" className="w-fit border-white/10 bg-white/[0.03] px-3 py-1.5 text-zinc-300">
            {videos.length} {videos.length === 1 ? "video" : "videos"}
          </Badge>
        )}
      />
      <ErrorMessage error={error} />
      {isLoading ? <LoadingGrid /> : videos.length ? (
        <VideoGrid videos={videos} />
      ) : (
        <EmptyState
          icon={Clock3}
          title="Your history starts with a play"
          description="Watch a video while signed in and it will appear here so you can easily find it again."
          action={<Button asChild className="bg-red-600 text-white hover:bg-red-500"><Link to="/">Browse videos</Link></Button>}
        />
      )}
    </>
  );
}

export function LikedVideosPage() {
  const { data: videos = [], isLoading, error } = useGetLikedVideosQuery();
  const [toggleLike, { error: actionError }] = useToggleVideoLikeMutation();

  return (
    <>
      <PageHeading
        eyebrow="Saved with a heart"
        title="Liked videos"
        description="A personal collection of videos you’ve enjoyed. Come back to any of them whenever you like."
        action={videos.length > 0 && (
          <Badge variant="outline" className="w-fit border-white/10 bg-white/[0.03] px-3 py-1.5 text-zinc-300">
            {videos.length} {videos.length === 1 ? "video" : "videos"}
          </Badge>
        )}
      />
      <ErrorMessage error={error || actionError} />
      {isLoading ? <LoadingGrid /> : videos.length ? (
        <VideoGrid
          videos={videos}
          action={(video) => (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Unlike ${video.title}`}
              className="shrink-0 text-red-300 hover:bg-red-500/10 hover:text-red-200"
              onClick={() => toggleLike(video._id)}
            >
              <Heart className="fill-current" />
            </Button>
          )}
        />
      ) : (
        <EmptyState
          icon={Heart}
          title="Nothing liked yet"
          description="Tap the like button on videos you enjoy and they’ll be gathered here."
          action={<Button asChild className="bg-red-600 text-white hover:bg-red-500"><Link to="/">Explore videos</Link></Button>}
        />
      )}
    </>
  );
}

export function PlaylistsPage() {
  const { user } = useOutletContext();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const { data: playlists = [], isLoading, error } = useGetPlaylistsQuery(user?._id, { skip: !user?._id });
  const [createPlaylist, { isLoading: isCreating, error: createError }] = useCreatePlaylistMutation();
  const [deletePlaylist, { error: deleteError }] = useDeletePlaylistMutation();

  const handleCreatePlaylist = async (event) => {
    event.preventDefault();
    setFormError("");
    try {
      await createPlaylist({ name: name.trim(), description: description.trim() }).unwrap();
      setName("");
      setDescription("");
      setShowCreateForm(false);
    } catch {
      setFormError("Could not create playlist. Check the details and try again.");
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="Organize your favorites"
        title="Playlists"
        description="Create collections around the videos, ideas, and creators you want to revisit."
        action={
          <Button
            onClick={() => setShowCreateForm((show) => !show)}
            className="w-fit bg-red-600 text-white hover:bg-red-500"
          >
            <Plus />
            Create playlist
          </Button>
        }
      />
      <ErrorMessage error={error || createError || deleteError} />

      {showCreateForm && (
        <Card className="mb-6 border-white/10 bg-[#121216]">
          <CardHeader>
            <CardTitle className="text-lg text-white">New playlist</CardTitle>
            <CardDescription className="text-zinc-400">Give your collection a name and a short description.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePlaylist} className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
              <label className="space-y-2 text-xs font-medium text-zinc-300">
                Playlist name
                <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} placeholder="Weekend watchlist" className="border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-600" />
              </label>
              <label className="space-y-2 text-xs font-medium text-zinc-300">
                Description
                <Input value={description} onChange={(event) => setDescription(event.target.value)} required maxLength={300} placeholder="Videos to enjoy later" className="border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-600" />
              </label>
              <Button type="submit" disabled={isCreating} className="bg-red-600 text-white hover:bg-red-500">
                {isCreating ? <LoaderCircle className="animate-spin" /> : <Plus />}
                Create
              </Button>
              {formError && <p role="alert" className="text-sm text-red-300 sm:col-span-3">{formError}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-44 rounded-2xl bg-white/[0.05]" />)}
        </div>
      ) : playlists.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {playlists.map((playlist) => (
            <Card key={playlist._id} className="border-white/[0.07] bg-[#121216] transition hover:border-white/[0.14]">
              <CardContent className="p-5">
                <div className="mb-5 flex items-start justify-between">
                  <div className="grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                    <ListVideo className="size-5" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${playlist.name}`}
                    className="text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => deletePlaylist(playlist._id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <Link to={`/playlists/${playlist._id}`} className="group">
                  <h2 className="truncate font-semibold text-white group-hover:text-red-200">{playlist.name}</h2>
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-400">{playlist.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-zinc-300">
                    Open playlist <ArrowUpRight className="size-3.5" />
                  </span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ListVideo}
          title="Make your first playlist"
          description="Create a playlist to keep related videos together and easy to find."
          action={<Button onClick={() => setShowCreateForm(true)} className="bg-red-600 text-white hover:bg-red-500"><Plus />Create playlist</Button>}
        />
      )}
    </>
  );
}

export function PlaylistDetailPage() {
  const { playlistId } = useParams();
  const { data: playlist, isLoading, error } = useGetPlaylistQuery(playlistId);
  const { data: videosResponse } = useGetVideosQuery("");
  const [addVideo, { error: addError }] = useAddVideoToPlaylistMutation();
  const [removeVideo, { error: removeError }] = useRemoveVideoFromPlaylistMutation();
  const [actionError, setActionError] = useState("");
  const videos = videosResponse?.videos || [];
  const playlistVideoIds = new Set((playlist?.videos || []).map((video) => video._id));
  const availableVideos = videos.filter((video) => !playlistVideoIds.has(video._id));

  if (isLoading) return <LoadingGrid />;
  if (error || !playlist) {
    return (
      <>
        <ErrorMessage error={error} />
        <Button asChild variant="outline" className="border-white/10 text-zinc-200"><Link to="/playlists"><ArrowLeft />Back to playlists</Link></Button>
      </>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" className="mb-5 -ml-3 text-zinc-400 hover:text-white">
        <Link to="/playlists"><ArrowLeft />All playlists</Link>
      </Button>
      <PageHeading
        eyebrow="Your collection"
        title={playlist.name}
        description={playlist.description}
        action={<Badge variant="outline" className="w-fit border-white/10 bg-white/[0.03] text-zinc-300">{playlist.videos?.length || 0} videos</Badge>}
      />
      <ErrorMessage error={actionError || addError || removeError} />
      {playlist.videos?.length ? (
        <VideoGrid
          videos={playlist.videos}
          action={(video) => (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${video.title} from playlist`}
              className="shrink-0 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
              onClick={async () => {
                try {
                  await removeVideo({ playlistId, videoId: video._id }).unwrap();
                } catch (requestError) {
                  setActionError(requestError?.data?.message || "Could not remove this video.");
                }
              }}
            >
              <Trash2 />
            </Button>
          )}
        />
      ) : (
        <EmptyState icon={Video} title="This playlist is ready for videos" description="Add videos from the suggestions below to start building your collection." />
      )}

      {!!availableVideos.length && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-white">Discover videos to add</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {availableVideos.slice(0, 6).map((video) => (
              <Card key={video._id} className="border-white/[0.07] bg-[#121216]">
                <CardContent className="flex items-center gap-3 p-3">
                  <img src={video.thumbnail} alt="" className="aspect-video w-24 rounded-lg bg-black object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-medium text-zinc-200">{video.title}</p>
                    <p className="mt-1 truncate text-[11px] text-zinc-500">{video.owner?.username || "Creator"}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={`Add ${video.title} to playlist`}
                    className="size-8 shrink-0 border-white/10 bg-white/[0.03] text-zinc-300"
                    onClick={async () => {
                      setActionError("");
                      try {
                        await addVideo({ playlistId, videoId: video._id }).unwrap();
                      } catch (requestError) {
                        setActionError(requestError?.data?.message || "Could not add this video.");
                      }
                    }}
                  >
                    <Plus />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function StatCard({ icon: Icon, label, value, to, accent }) {
  return (
    <Card className="border-white/[0.07] bg-[#121216]">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid size-11 place-items-center rounded-xl ${accent}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <Button asChild variant="ghost" size="icon" className="text-zinc-500 hover:text-white">
          <Link to={to} aria-label={`View ${label}`}><ArrowUpRight /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: layoutUser } = useOutletContext();
  const { data: user } = useGetCurrentUserQuery();
  const profile = user || layoutUser;
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [formMessage, setFormMessage] = useState("");
  const [editingVideoId, setEditingVideoId] = useState("");
  const [editVideoTitle, setEditVideoTitle] = useState("");
  const [editVideoDescription, setEditVideoDescription] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState("");
  const [videoActionMessage, setVideoActionMessage] = useState("");
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorMessage, setTwoFactorMessage] = useState("");
  const [emailVerificationMessage, setEmailVerificationMessage] = useState("");
  const [videoActionError, setVideoActionError] = useState("");
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useGetSubscriptionsQuery(profile?._id, { skip: !profile?._id });
  const { data: likedVideos = [], isLoading: likedVideosLoading } = useGetLikedVideosQuery();
  const { data: playlists = [], isLoading: playlistsLoading } = useGetPlaylistsQuery(profile?._id, { skip: !profile?._id });
  const { data: history = [], isLoading: historyLoading } = useGetWatchHistoryQuery();
  const {
    data: uploadedVideoData,
    isLoading: uploadedVideosLoading,
    error: uploadedVideosError,
  } = useGetCurrentUserVideosQuery();
  const uploadedVideos = uploadedVideoData?.videos || [];
  const uploadedVideoCount = uploadedVideoData?.totalVideos || 0;
  const {
    data: videoViewers = [],
    isLoading: viewersLoading,
    error: viewersError,
  } = useGetVideoViewersQuery();
  const [updateAccount, { isLoading: isSaving, error }] = useUpdateAccountMutation();
  const [updateVideo, { isLoading: isUpdatingVideo }] = useUpdateVideoMutation();
  const [deleteVideo, { isLoading: isDeletingVideo }] = useDeleteVideoMutation();
  const [togglePublishStatus, { isLoading: isChangingPublishStatus }] =
    useToggleVideoPublishStatusMutation();
  const [setupTwoFactor, { isLoading: isSettingUpTwoFactor }] = useSetupTwoFactorMutation();
  const [enableTwoFactor, { isLoading: isEnablingTwoFactor }] = useEnableTwoFactorMutation();
  const [disableTwoFactor, { isLoading: isDisablingTwoFactor }] = useDisableTwoFactorMutation();
  const [requestEmailVerification, { isLoading: isRequestingEmailVerification }] = useRequestEmailVerificationMutation();
  const { data: loginActivities = [], isLoading: loginActivityLoading } = useGetLoginActivityQuery();
  const { data: activeSessions = [], isLoading: activeSessionsLoading } = useGetActiveSessionsQuery();
  const [revokeSession] = useRevokeSessionMutation();
  const [revokeAllSessions, { isLoading: isRevokingAllSessions }] = useRevokeAllSessionsMutation();
  const isModerator = ["moderator", "admin"].includes(profile?.role);
  const { data: pendingReports = [], isLoading: reportsLoading } = useGetReportsQuery("pending", {
    skip: !isModerator,
  });
  const [resolveReport] = useResolveReportMutation();
  const [removeReportedContent] = useRemoveReportedContentMutation();

  useEffect(() => {
    setFullName(profile?.fullName || "");
    setEmail(profile?.email || "");
  }, [profile?.fullName, profile?.email]);

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setFormMessage("");
    try {
      const updatedUser = await updateAccount({ fullName: fullName.trim(), email: email.trim() }).unwrap();
      dispatch(setUser(updatedUser));
      setFormMessage("Your account details were saved.");
    } catch {
      setFormMessage("");
    }
  };

  const handleVideoSave = async (event, videoId) => {
    event.preventDefault();
    setVideoActionError("");
    setVideoActionMessage("");
    try {
      await updateVideo({
        videoId,
        changes: {
          title: editVideoTitle.trim(),
          description: editVideoDescription.trim(),
        },
      }).unwrap();
      setEditingVideoId("");
      setVideoActionMessage("Video details updated.");
    } catch (requestError) {
      setVideoActionError(requestError.data?.message || "Could not update this video.");
    }
  };

  const handleVideoDelete = async (videoId) => {
    setVideoActionError("");
    setVideoActionMessage("");
    try {
      await deleteVideo(videoId).unwrap();
      setConfirmingDeleteId("");
      setVideoActionMessage("Video deleted.");
    } catch (requestError) {
      setVideoActionError(requestError.data?.message || "Could not delete this video.");
    }
  };

  const handlePublishToggle = async (videoId) => {
    setVideoActionError("");
    setVideoActionMessage("");
    try {
      await togglePublishStatus(videoId).unwrap();
      setVideoActionMessage("Video visibility updated.");
    } catch (requestError) {
      setVideoActionError(requestError.data?.message || "Could not change video visibility.");
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="Your creator space"
        title="Dashboard"
        description="Manage your account and take a quick look at your activity."
      />

      <Card className="mb-6 overflow-hidden border-white/[0.08] bg-[#121216]">
        <div className="relative h-36 overflow-hidden bg-gradient-to-r from-red-950/70 via-[#28202a] to-[#111114] sm:h-48">
          {profile?.coverImage && (
            <img
              src={profile.coverImage}
              alt={`${profile.fullName || "Your"} profile cover`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/10" />
          {!profile?.coverImage && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_15%,rgba(248,113,113,0.2),transparent_40%)]" />
          )}
          <div className="absolute bottom-3 right-4 flex items-center gap-2 text-xs text-white/75 sm:bottom-4 sm:right-5">
            <Sparkles className="size-4 text-amber-200" />
            Make something worth sharing
          </div>
        </div>
        <CardContent className="relative flex flex-col gap-4 px-5 pb-5 pt-0 sm:flex-row sm:items-end sm:gap-5 sm:px-7 sm:pb-6">
          <Avatar className="-mt-9 size-[76px] shrink-0 border-4 border-[#121216] sm:-mt-11 sm:size-[92px]">
            <AvatarImage src={profile?.avatar} alt={profile?.fullName || "Your profile"} />
            <AvatarFallback className="bg-zinc-800 text-xl text-zinc-200">{profile?.fullName?.slice(0, 1) || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 sm:pb-1">
            <Badge variant="outline" className="mb-2 border-red-400/20 bg-red-400/[0.06] text-red-200">Your account</Badge>
            <h2 className="truncate text-xl font-semibold text-white">{profile?.fullName || "Welcome back"}</h2>
            <p className="mt-1 text-sm text-zinc-400">@{profile?.username || "creator"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {profile?.emailVerified ? (
          <Badge variant="outline" className="border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200">Email verified</Badge>
        ) : (
          <>
            <Badge variant="outline" className="border-amber-400/20 bg-amber-400/[0.06] text-amber-200">Email not verified</Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={isRequestingEmailVerification}
              onClick={async () => {
                setEmailVerificationMessage("");
                try {
                  await requestEmailVerification().unwrap();
                  setEmailVerificationMessage("Verification email sent.");
                } catch (requestError) {
                  setEmailVerificationMessage(requestError.data?.message || "Could not send verification email.");
                }
              }}
              className="border-white/10 text-zinc-200"
            >
              {isRequestingEmailVerification ? <LoaderCircle className="animate-spin" /> : null}Send verification email
            </Button>
            {emailVerificationMessage && <span role="status" className="text-xs text-zinc-300">{emailVerificationMessage}</span>}
          </>
        )}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Tv2} label="Subscriptions" value={subscriptionsLoading ? "—" : subscriptions.length} to="/subscriptions" accent="bg-blue-400/10 text-blue-300" />
        <StatCard icon={Heart} label="Liked videos" value={likedVideosLoading ? "—" : likedVideos.length} to="/liked" accent="bg-rose-400/10 text-rose-300" />
        <StatCard icon={ListVideo} label="Playlists" value={playlistsLoading ? "—" : playlists.length} to="/playlists" accent="bg-violet-400/10 text-violet-300" />
        <StatCard icon={Clock3} label="Watch history" value={historyLoading ? "—" : history.length} to="/history" accent="bg-amber-400/10 text-amber-200" />
      </div>

      <Card className="mb-6 border-amber-400/15 bg-[#121216]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <ShieldCheck className="size-5 text-amber-300" />Two-factor authentication
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {profile?.twoFactorEnabled ? "Your account requires an authenticator code when signing in." : "Add a second security step to your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {twoFactorMessage && <p role="status" className="mb-4 text-sm text-emerald-300">{twoFactorMessage}</p>}
          {profile?.twoFactorEnabled ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm text-zinc-300">
                Authenticator code
                <input
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="000000"
                  className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#1a1a1f] px-3 text-sm text-white outline-none"
                />
              </label>
              <Button
                variant="outline"
                disabled={isDisablingTwoFactor || twoFactorCode.length !== 6}
                onClick={async () => {
                  setTwoFactorMessage("");
                  try {
                    await disableTwoFactor({ code: twoFactorCode }).unwrap();
                    setTwoFactorCode("");
                    setTwoFactorMessage("Two-factor authentication disabled.");
                  } catch (requestError) {
                    setTwoFactorMessage(requestError.data?.message || "Could not disable two-factor authentication.");
                  }
                }}
                className="border-red-400/20 text-red-200"
              >
                {isDisablingTwoFactor ? <LoaderCircle className="animate-spin" /> : null}Disable 2FA
              </Button>
            </div>
          ) : twoFactorSetup ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <img src={twoFactorSetup.qrCodeDataUrl} alt="Authenticator QR code" className="size-44 rounded-xl bg-white p-2" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-500">Secret</p>
                <code className="mt-1 block break-all rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2 text-sm text-zinc-200">{twoFactorSetup.secret}</code>
                <label className="mt-4 block text-sm text-zinc-300">
                  Enter the six-digit code
                  <input
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="000000"
                    className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#1a1a1f] px-3 text-sm text-white outline-none"
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <Button
                    disabled={isEnablingTwoFactor || twoFactorCode.length !== 6}
                    onClick={async () => {
                      setTwoFactorMessage("");
                      try {
                        await enableTwoFactor({ secret: twoFactorSetup.secret, code: twoFactorCode }).unwrap();
                        setTwoFactorSetup(null);
                        setTwoFactorCode("");
                        setTwoFactorMessage("Two-factor authentication enabled.");
                      } catch (requestError) {
                        setTwoFactorMessage(requestError.data?.message || "Could not enable two-factor authentication.");
                      }
                    }}
                    className="bg-red-600 text-white hover:bg-red-500"
                  >
                    {isEnablingTwoFactor ? <LoaderCircle className="animate-spin" /> : null}Verify and enable
                  </Button>
                  <Button variant="ghost" onClick={() => setTwoFactorSetup(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              disabled={isSettingUpTwoFactor}
              onClick={async () => {
                setTwoFactorMessage("");
                try {
                  setTwoFactorSetup(await setupTwoFactor().unwrap());
                } catch (requestError) {
                  setTwoFactorMessage(requestError.data?.message || "Could not create two-factor setup.");
                }
              }}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              {isSettingUpTwoFactor ? <LoaderCircle className="animate-spin" /> : null}Set up 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 border-white/[0.07] bg-[#121216]">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <ShieldCheck className="size-5 text-amber-300" />Active sessions
            </CardTitle>
            <CardDescription className="mt-2 text-zinc-400">Devices currently authorized to access your account.</CardDescription>
          </div>
          <Button
            variant="outline"
            disabled={isRevokingAllSessions || activeSessions.length === 0}
            onClick={async () => {
              try {
                await revokeAllSessions().unwrap();
                dispatch(logout());
                navigate("/login");
              } catch {
                return;
              }
            }}
            className="border-red-400/20 text-red-200"
          >
            {isRevokingAllSessions ? <LoaderCircle className="animate-spin" /> : null}Sign out all devices
          </Button>
        </CardHeader>
        <CardContent>
          {activeSessionsLoading ? (
            <Skeleton className="h-20 rounded-xl bg-white/[0.05]" />
          ) : activeSessions.length ? (
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <div key={session._id} className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200">{session.ipAddress}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{session.userAgent}</p>
                    <p className="mt-1 text-[11px] text-zinc-600">Last seen {new Date(session.lastSeenAt).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => revokeSession(session._id)} className="shrink-0 text-zinc-400 hover:text-red-300">Sign out</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">No active sessions.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 border-white/[0.07] bg-[#121216]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <ShieldCheck className="size-5 text-amber-300" />Recent login activity
          </CardTitle>
          <CardDescription className="text-zinc-400">Review devices and locations used to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {loginActivityLoading ? (
            <Skeleton className="h-24 rounded-xl bg-white/[0.05]" />
          ) : loginActivities.length ? (
            <div className="space-y-2">
              {loginActivities.slice(0, 10).map((activity) => (
                <div key={activity._id} className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200">{activity.ipAddress}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{activity.userAgent}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {activity.suspicious && <Badge variant="outline" className="border-amber-400/20 bg-amber-400/[0.06] text-amber-200">New device/IP</Badge>}
                    <span className="text-xs text-zinc-500">{new Date(activity.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">No login activity recorded yet.</p>
          )}
        </CardContent>
      </Card>

      {isModerator && (
        <Card className="mb-6 border-amber-400/15 bg-[#121216]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <ShieldCheck className="size-5 text-amber-300" />Moderation queue
              <Badge variant="outline" className="border-amber-400/20 bg-amber-400/[0.06] text-amber-200">
                {reportsLoading ? "…" : pendingReports.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-zinc-400">Pending reports from videos, comments, and users.</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <Skeleton className="h-24 rounded-xl bg-white/[0.05]" />
            ) : pendingReports.length ? (
              <div className="space-y-3">
                {pendingReports.map((report) => (
                  <div key={report._id} className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{report.targetType} report · {report.reason}</p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        Reported by @{report.reporter?.username || "viewer"}{report.details ? ` · ${report.details}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="outline" onClick={() => resolveReport(report._id)} className="border-white/10 text-zinc-300">Resolve</Button>
                      <Button size="sm" onClick={() => removeReportedContent(report._id)} className="bg-red-600 text-white hover:bg-red-500">Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">No pending reports.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 border-white/[0.07] bg-[#121216]">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Video className="size-5 text-red-300" />
              Your uploaded videos
              <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-200">
                {uploadedVideosLoading ? "…" : uploadedVideoCount}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2 text-zinc-400">
              {uploadedVideoCount > 100
                ? "Showing your 100 most recent uploads."
                : "All the videos you’ve uploaded to your channel."}
            </CardDescription>
          </div>
          <Button asChild className="w-full bg-red-600 text-white hover:bg-red-500 sm:w-auto">
            <Link to="/upload"><Plus />Upload video</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ErrorMessage error={uploadedVideosError || videoActionError} />
          {videoActionMessage && (
            <p role="status" className="mb-4 text-sm text-emerald-300">{videoActionMessage}</p>
          )}
          {uploadedVideosError ? null : uploadedVideosLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="aspect-video rounded-xl bg-white/[0.05]" />
              ))}
            </div>
          ) : uploadedVideos.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {uploadedVideos.map((video) => (
                <div
                  key={video._id}
                  className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]"
                >
                  <div className="relative aspect-video bg-black">
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="size-full object-cover"
                    />
                    <Badge
                      variant="outline"
                      className={`absolute right-2 top-2 ${
                        video.isPublished
                          ? "border-emerald-300/20 bg-black/70 text-emerald-200"
                          : "border-amber-300/20 bg-black/70 text-amber-200"
                      }`}
                    >
                      {video.isPublished ? "Published" : "Unpublished"}
                    </Badge>
                  </div>
                  <div className="p-3">
                    {editingVideoId === video._id ? (
                      <form onSubmit={(event) => handleVideoSave(event, video._id)} className="space-y-3">
                        <label className="block space-y-1.5 text-xs text-zinc-400">
                          Video title
                          <Input
                            value={editVideoTitle}
                            onChange={(event) => setEditVideoTitle(event.target.value.slice(0, 100))}
                            maxLength={100}
                            required
                            className="border-white/10 bg-white/[0.04] text-white"
                          />
                        </label>
                        <label className="block space-y-1.5 text-xs text-zinc-400">
                          Description
                          <textarea
                            value={editVideoDescription}
                            onChange={(event) => setEditVideoDescription(event.target.value.slice(0, 2000))}
                            maxLength={2000}
                            required
                            rows={3}
                            className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-red-400/40"
                          />
                        </label>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={isUpdatingVideo} className="bg-red-600 text-white hover:bg-red-500">
                            {isUpdatingVideo ? <LoaderCircle className="animate-spin" /> : <Save />}
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingVideoId("")}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h3 className="line-clamp-2 text-sm font-medium text-zinc-100">{video.title}</h3>
                        <p className="mt-2 text-xs text-zinc-500">
                          {Number(video.views || 0).toLocaleString()} views
                          {video.createdAt && ` · ${new Date(video.createdAt).toLocaleDateString()}`}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-white/10 bg-white/[0.03] text-zinc-300"
                            onClick={() => {
                              setVideoActionError("");
                              setEditingVideoId(video._id);
                              setEditVideoTitle(video.title);
                              setEditVideoDescription(video.description || "");
                            }}
                          >
                            <Pencil />Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isChangingPublishStatus}
                            className="border-white/10 bg-white/[0.03] text-zinc-300"
                            onClick={() => handlePublishToggle(video._id)}
                          >
                            {isChangingPublishStatus && <LoaderCircle className="animate-spin" />}
                            {video.isPublished ? "Unpublish" : "Publish"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                            onClick={() => {
                              setVideoActionError("");
                              setConfirmingDeleteId(video._id);
                            }}
                          >
                            <Trash2 />Delete
                          </Button>
                        </div>
                        {confirmingDeleteId === video._id && (
                          <div className="mt-3 rounded-lg border border-red-500/15 bg-red-500/[0.05] p-3">
                            <p className="text-xs text-zinc-300">Delete this video? This action can’t be undone.</p>
                            <div className="mt-2 flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isDeletingVideo}
                                onClick={() => handleVideoDelete(video._id)}
                              >
                                {isDeletingVideo && <LoaderCircle className="animate-spin" />}
                                Confirm delete
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmingDeleteId("")}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Video}
              title="You haven’t uploaded any videos yet"
              description="Upload your first video and it will appear here."
              action={
                <Button asChild className="bg-red-600 text-white hover:bg-red-500">
                  <Link to="/upload"><Plus />Upload your first video</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 border-white/[0.07] bg-[#121216]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Eye className="size-5 text-red-300" />
            Who watched your videos
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Signed-in viewers are listed by the videos they watched. Anonymous views only increase view counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorMessage error={viewersError} />
          {viewersError ? null : viewersLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-xl bg-white/[0.05]" />
              <Skeleton className="h-16 rounded-xl bg-white/[0.05]" />
            </div>
          ) : videoViewers.length ? (
            <div className="space-y-3">
              {videoViewers.map((viewer) => (
                <div
                  key={viewer._id}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4"
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={viewer.avatar} alt={viewer.fullName} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-200">
                      {viewer.fullName?.slice(0, 1) || "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{viewer.fullName}</p>
                    <p className="truncate text-xs text-zinc-500">@{viewer.username}</p>
                    {viewer.watchedVideos[0]?.lastViewedAt && (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Last watched {new Date(viewer.watchedVideos[0].lastViewedAt).toLocaleString()}
                      </p>
                    )}
                    <p className="mt-2 text-xs leading-5 text-zinc-400">
                      Watched: {viewer.watchedVideos.slice(0, 3).map((video) => video.title).join(", ")}
                      {viewer.watchedVideos.length > 3 && `, and ${viewer.watchedVideos.length - 3} more`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-sm text-zinc-500">
              No signed-in viewers have watched your videos yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/[0.07] bg-[#121216]">
        <CardHeader>
          <CardTitle className="text-lg text-white">Account details</CardTitle>
          <CardDescription className="text-zinc-400">Keep your name and email address up to date.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-xs font-medium text-zinc-300">
              Full name
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required autoComplete="name" className="border-white/10 bg-white/[0.04] text-white" />
            </label>
            <label className="space-y-2 text-xs font-medium text-zinc-300">
              Email address
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="border-white/10 bg-white/[0.04] text-white" />
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={isSaving || !profile} className="bg-red-600 text-white hover:bg-red-500">
                {isSaving && <LoaderCircle className="animate-spin" />}
                Save changes
              </Button>
              {formMessage && <span role="status" className="text-sm text-emerald-300">{formMessage}</span>}
              <ErrorMessage error={error} />
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
