import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/games", label: "Games" },
  { to: "/admin/recipes", label: "Recipes" },
  { to: "/admin/regions", label: "Regions" },
  { to: "/admin/nutrition/lessons", label: "Nutrition Lessons" },
  { to: "/admin/nutrition/food-facts", label: "Food Facts" },
  { to: "/admin/achievements", label: "Achievements" },
  { to: "/admin/daily-challenges", label: "Daily Challenges" },
  { to: "/admin/avatar-cosmetics", label: "Avatar Cosmetics" },
];

/**
 * A deliberately different shell from the child/parent-facing AppLayout
 * (dark sidebar vs. the warm rounded-card dashboard aesthetic) -- an
 * admin managing content is doing information-dense editorial work, not
 * a family-facing experience, and the visual language should say so at a
 * glance. This is the second half (with AdminGuard) of keeping admin
 * functionality separated from the child-facing experience.
 */
export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900">
      <aside className="flex w-60 shrink-0 flex-col bg-neutral-900 text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">Kitchen Quest Kids</p>
          <p className="text-lg font-black">Admin</p>
        </div>
        <nav aria-label="Admin" className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block min-h-11 rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  isActive ? "bg-white text-neutral-900" : "text-white/70 hover:bg-white/10"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <p className="truncate px-3 text-xs text-white/50">{user?.email}</p>
          <button
            onClick={() => void logout()}
            className="mt-1 min-h-11 w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-white/70 hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
