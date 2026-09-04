import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useActiveChild } from "../context/ActiveChildContext";
import { ToastViewport } from "./ToastViewport";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Home" },
  { to: "/flavor-hub", label: "Flavor Hub" },
  { to: "/games", label: "Games" },
  { to: "/recipes", label: "Recipes" },
  { to: "/grocery", label: "Grocery" },
  { to: "/parent", label: "Parent Dashboard" },
  { to: "/parent/children", label: "Manage Children" },
];

/**
 * The one layout every authenticated route renders inside (see routes/).
 * Contains the persistent child switcher -- per the requirement that the
 * switcher works "under one family" across every screen, not just the
 * dashboard -- plus a skip-to-content link and keyboard-navigable nav,
 * per the accessibility requirements.
 */
export function AppLayout() {
  const { logout } = useAuth();
  const { children, activeChildId, setActiveChildId } = useActiveChild();

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <div className="border-b border-foreground/10 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <nav aria-label="Main" className="flex flex-wrap gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-foreground text-white" : "text-foreground/60 hover:bg-foreground/5"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={() => void logout()}
            className="min-h-11 rounded-full border border-foreground/10 px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-foreground/5"
          >
            Log out
          </button>
        </div>

        {children.length > 0 && (
          <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6" aria-label="Switch active child">
            <div className="flex gap-2" role="tablist" aria-label="Children">
              {children.map((child) => {
                const active = child._id === activeChildId;
                return (
                  <button
                    key={child._id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveChildId(child._id)}
                    className={`min-h-11 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active ? "bg-primary text-primary-foreground" : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                    }`}
                  >
                    {child.displayName}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <ToastViewport />
    </div>
  );
}
