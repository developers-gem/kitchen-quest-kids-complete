import { QueryClient } from "@tanstack/react-query";

/**
 * All server data (games, recipes, dashboard sections, grocery lists, ...)
 * flows through React Query rather than being duplicated into a global
 * store. This is the "avoid unnecessary global state" strategy in
 * practice: a query result IS the state, cached and invalidated by key,
 * with loading/error handled uniformly instead of by hand in every
 * component.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Refetching on window focus is a fine default for a dashboard, but
      // actively harmful mid-game (a child alt-tabbing shouldn't yank the
      // current question out from under them) -- game/recipe session
      // screens manage their own fetch lifecycle instead of relying on
      // this global default.
      refetchOnWindowFocus: false,
    },
  },
});
