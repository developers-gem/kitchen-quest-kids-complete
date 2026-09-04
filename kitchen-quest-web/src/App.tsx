import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./context/AuthContext";
import { ActiveChildProvider } from "./context/ActiveChildContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ParentalGateProvider } from "./context/ParentalGateContext";
import { router } from "./routes/router";

/**
 * Provider composition order matters here:
 * QueryClientProvider (server-state cache) -> AuthProvider (needs nothing
 * else) -> ActiveChildProvider (needs auth's `user`/`isAuthenticated`,
 * and uses React Query) -> NotificationProvider / ParentalGateProvider
 * (independent of the above, but nested inside so any page can use
 * either). RouterProvider is innermost since every route needs all four
 * contexts available.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ActiveChildProvider>
          <NotificationProvider>
            <ParentalGateProvider>
              <RouterProvider router={router} />
            </ParentalGateProvider>
          </NotificationProvider>
        </ActiveChildProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
