import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingState } from "../../components/LoadingState";

/**
 * Separate from `RequireAuth` (routes/RequireAuth.tsx) -- being logged in
 * is necessary but not sufficient for the admin surface. This is the
 * frontend half of "keep admin functionality separated from the
 * child-facing experience": a parent account without the platform_admin
 * role is bounced to the regular dashboard, never shown an admin nav
 * item or an admin route, even transiently. The actual enforcement is
 * server-side (authorize(platform_admin) on every /admin/* route) --
 * this guard exists so a non-admin never even sees the admin UI shell,
 * not as the security boundary itself.
 */
export function AdminGuard() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState label="Checking access..." />;

  const isAdmin = user?.role.includes("platform_admin") ?? false;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
