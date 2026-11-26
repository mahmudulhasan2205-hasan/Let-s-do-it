import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Clock3,
  Bell,
  Clapperboard,
  Compass,
  House,
  LayoutDashboard,
  ListVideo,
  LogOut,
  Menu,
  MessageSquareText,
  ThumbsUp,
  Tv2,
  Upload,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useGetCurrentUserQuery, useLogoutUserMutation } from "@/features/auth/authApi";
import { logout } from "@/features/auth/authSlice";
import { useGetNotificationsQuery } from "@/features/community/communityApi";

const navigation = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/shorts", label: "Shorts", icon: Clapperboard },
  { to: "/community", label: "Community", icon: MessageSquareText },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/subscriptions", label: "Subscriptions", icon: Tv2 },
  { to: "/history", label: "History", icon: Clock3 },
  { to: "/liked", label: "Liked videos", icon: ThumbsUp },
  { to: "/playlists", label: "Playlists", icon: ListVideo },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function NavigationLinks({ onNavigate, unreadCount = 0 }) {
  return navigation.map(({ to, label, icon: Icon, end }) => (
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
          {to === "/notifications" && unreadCount > 0 && (
            <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-200">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          {isActive && <span className="size-1.5 rounded-full bg-red-300 shadow-[0_0_10px_#f87171]" />}
        </>
      )}
    </NavLink>
  ));
}

export default function LibraryLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const storedUser = useSelector((state) => state.auth.user);
  const { data: currentUser } = useGetCurrentUserQuery();
  const [logoutUser, { isLoading: isLoggingOut }] = useLogoutUserMutation();
  const user = currentUser || storedUser;
  const { data: notificationData } = useGetNotificationsQuery();
  const currentLabel = navigation.find(({ to }) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to),
  )?.label;

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
    } finally {
      dispatch(logout());
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-zinc-100">
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-white/[0.07] bg-[#0b0b0e]/90 px-4 backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-3">
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
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-red-400 to-red-700 text-sm font-black shadow-lg shadow-red-950/40">
              L
            </span>
            <span className="text-[17px]">Lets-do-it</span>
          </Link>
          <span className="hidden text-zinc-700 sm:inline">/</span>
          <span className="hidden text-sm text-zinc-400 sm:inline">{currentLabel || "Your library"}</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="outline" size="sm" className="hidden border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08] sm:inline-flex">
            <Link to="/">
              <Compass />
              Explore
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-red-600 text-white hover:bg-red-500">
            <Link to="/upload">
              <Upload />
              <span className="hidden sm:inline">Upload</span>
            </Link>
          </Button>
          <div className="ml-1 flex items-center gap-2 border-l border-white/10 pl-2 sm:gap-2.5 sm:pl-4">
            <Link to="/dashboard" aria-label="Open your dashboard">
              <Avatar className="size-8 border border-white/10">
                <AvatarImage src={user?.avatar} alt={user?.fullName || "Your profile"} />
                <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
                  {user?.fullName?.slice(0, 1)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Link
              to="/dashboard"
              className="hidden max-w-32 truncate text-sm text-zinc-300 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 md:inline"
              aria-label="Open your dashboard"
            >
              {user?.fullName || "Your account"}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="text-zinc-400 hover:text-white"
            >
              <LogOut />
            </Button>
          </div>
          <ThemeToggle className="text-zinc-400 hover:text-white" />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-[252px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.07] bg-[#0b0b0e] bg-gradient-to-b from-white/[0.015] to-transparent px-4 py-6 lg:flex">
          <div className="mb-7 shrink-0 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-red-500/[0.10] via-white/[0.025] to-transparent p-4">
            <div className="mb-3 grid size-9 place-items-center rounded-xl bg-red-400/10 text-red-300">
              <Compass className="size-[18px]" />
            </div>
            <p className="text-sm font-semibold text-zinc-100">Your video space</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Everything you follow, save, and create.</p>
          </div>
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Library</p>
          <nav className="flex shrink-0 flex-col gap-1.5">
            <NavigationLinks unreadCount={notificationData?.unreadCount} />
          </nav>
          <div className="mt-auto shrink-0 rounded-2xl border border-white/[0.07] bg-[#111114] p-3">
            <div className="mb-2 flex items-center gap-2.5 px-1 py-1">
              <Link to="/dashboard" aria-label="Open your dashboard">
                <Avatar className="size-8 border border-white/10">
                  <AvatarImage src={user?.avatar} alt={user?.fullName || "Your profile"} />
                  <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
                    {user?.fullName?.slice(0, 1)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0">
                <Link
                  to="/dashboard"
                  className="block truncate text-xs font-medium text-zinc-200 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  aria-label="Open your dashboard"
                >
                  {user?.fullName || "Your account"}
                </Link>
                <Link
                  to="/dashboard"
                  className="block truncate text-[11px] text-zinc-500 transition hover:text-zinc-300"
                  aria-label="Open your dashboard"
                >
                  @{user?.username || "creator"}
                </Link>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-2 text-xs text-zinc-500 hover:bg-red-500/[0.07] hover:text-red-200"
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 top-[68px] z-20 bg-black/60 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <aside
              className="h-full w-[min(82vw,300px)] border-r border-white/10 bg-[#101014] p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Your space</p>
              <nav className="flex flex-col gap-1.5">
                <NavigationLinks
                  onNavigate={() => setMobileMenuOpen(false)}
                  unreadCount={notificationData?.unreadCount}
                />
              </nav>
              <Button
                variant="ghost"
                className="mt-5 w-full justify-start gap-3 px-3 text-sm text-zinc-400"
                disabled={isLoggingOut}
                onClick={handleLogout}
              >
                <LogOut />
                Sign out
              </Button>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
