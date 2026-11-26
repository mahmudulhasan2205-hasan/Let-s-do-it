import { NavLink } from "react-router-dom";
import {
  Bell,
  Clapperboard,
  Compass,
  Heart,
  House,
  LayoutDashboard,
  ListVideo,
  MessageSquareText,
  Sparkles,
  Tv2,
  Clock3,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navigation = [
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

export function PrimaryNavigation({ onNavigate }) {
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
          {isActive && <span className="size-1.5 rounded-full bg-red-300 shadow-[0_0_10px_#f87171]" />}
        </>
      )}
    </NavLink>
  ));
}

export function PrimarySidebar({ isAuthenticated, user, onLogout }) {
  return (
    <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-[250px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.07] bg-gradient-to-b from-white/[0.025] via-[#101014] to-[#0d0d10] p-4 lg:flex">
      <div className="mb-5 shrink-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-red-500/[0.12] via-[#1a1418] to-[#111114] p-4">
        <div className="mb-3 flex size-9 items-center justify-center rounded-xl border border-red-300/10 bg-red-400/10 text-red-300">
          <Sparkles className="size-[17px]" />
        </div>
        <p className="text-sm font-semibold tracking-tight text-white">Find your next favorite</p>
        <p className="mt-1.5 text-xs leading-5 text-zinc-500">Fresh videos and creators picked for your curiosity.</p>
        <NavLink to="/" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-300 transition hover:text-red-200">
          Explore videos <Compass className="size-3.5" />
        </NavLink>
      </div>
      <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Browse</p>
      <nav className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1.5">
          <PrimaryNavigation />
        </div>
      </nav>
      {!isAuthenticated && (
        <div className="mt-auto shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="text-xs font-semibold text-zinc-200">Make it yours</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Sign in to save videos and follow creators.</p>
          <NavLink to="/login" className="mt-3 inline-flex text-xs font-semibold text-red-300 hover:text-red-200">
            Sign in to your account
          </NavLink>
        </div>
      )}
      {isAuthenticated && (
        <div className="mt-auto shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="mb-2 flex min-w-0 items-center gap-2.5 px-1 py-1">
            <NavLink to="/dashboard" aria-label="Open your dashboard" className="shrink-0">
              <Avatar className="size-8 border border-white/10">
                <AvatarImage src={user?.avatar} alt={user?.fullName || "Your profile"} />
                <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
                  {user?.fullName?.slice(0, 1)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </NavLink>
            <div className="min-w-0">
              <NavLink to="/dashboard" className="block truncate text-xs font-medium text-zinc-200 hover:text-white">
                {user?.fullName || "Your profile"}
              </NavLink>
              <p className="truncate text-[11px] text-zinc-500">@{user?.username || "creator"}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-3 px-2 text-xs text-zinc-500 hover:bg-red-500/[0.07] hover:text-red-200"
            onClick={onLogout}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      )}
    </aside>
  );
}
