import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Leaf,
  Compass,
  MessageSquareText,
  Info,
  User,
  LogOut,
} from "lucide-react";
import { logout } from "../utils/auth";

export default function AppLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    // Why: remove token so user is no longer authenticated
    logout();

    // Why: send them back to landing (public)
    navigate("/", { replace: true });
  }

  const linkBase =
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition";
  const linkActive =
    "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20";
  const linkInactive =
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Brand */}
          <div className="mb-5">
            <div className="text-lg tracking-wide">
              <span className="font-brand font-semibold">CKVS</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Preserving and validating knowledge
            </p>
          </div>

          {/* Nav */}
          <nav className="space-y-2">
            <NavLink
              to="practices"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <Leaf className="h-5 w-5" />
              Practices
            </NavLink>

            <NavLink
              to="discover"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <Compass className="h-5 w-5" />
              Discover
            </NavLink>

            <NavLink
              to="discussions"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <MessageSquareText className="h-5 w-5" />
              Discussions
            </NavLink>

            <NavLink
              to="about"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <Info className="h-5 w-5" />
              About
            </NavLink>

            <NavLink
              to="profile"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <User className="h-5 w-5" />
              Profile
            </NavLink>
          </nav>

          {/* Logout */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
