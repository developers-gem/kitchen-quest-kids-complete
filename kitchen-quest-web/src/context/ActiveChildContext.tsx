import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as childrenApi from "../api/children";
import { useAuth } from "./AuthContext";
import type { ChildProfile } from "../types/api";

/**
 * STATE STRATEGY NOTE (active child slice):
 * The *list* of children is server state (React Query, keyed "children" --
 * any mutation like create/update/delete invalidates that one key and
 * every consumer re-renders with fresh data automatically).
 *
 * *Which* child is currently active is genuinely global UI state -- nearly
 * every screen in the app (dashboard, games, recipes, grocery) needs it,
 * and it doesn't belong to any single screen. It's kept here, as a small
 * piece of React state, persisted to localStorage *keyed by user id* so:
 * (a) refreshing the page doesn't reset which child you were viewing, and
 * (b) switching parent accounts on the same browser never leaks the wrong
 * family's active child into the new session.
 *
 * This is NOT the same as `POST /children/:id/activate` (which reissues
 * the parent's own access token with an activeChildId claim for the
 * *play* surfaces on a handed-off device). This context is purely a
 * dashboard-viewing convenience; switching it never calls that endpoint.
 */

interface ActiveChildContextValue {
  children: ChildProfile[];
  isLoading: boolean;
  activeChild: ChildProfile | null;
  activeChildId: string | null;
  setActiveChildId: (id: string | null) => void;
  refetch: () => void;
}

const ActiveChildContext = createContext<ActiveChildContextValue | undefined>(undefined);

function storageKey(userId: string) {
  return `kqk.activeChildId.${userId}`;
}

export function ActiveChildProvider({ children: reactChildren }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: childList = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["children"],
    queryFn: childrenApi.listChildren,
    enabled: isAuthenticated,
  });

  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);

  // Load the persisted choice once we know who's logged in.
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(storageKey(user._id));
    setActiveChildIdState(stored);
  }, [user]);

  // If the persisted/selected child no longer exists (deleted, or none
  // chosen yet) fall back to the first available child automatically.
  useEffect(() => {
    if (isLoading) return;
    if (activeChildId && childList.some((c) => c._id === activeChildId)) return;
    setActiveChildIdState(childList[0]?._id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childList, isLoading]);

  function setActiveChildId(id: string | null) {
    setActiveChildIdState(id);
    if (user) {
      if (id) localStorage.setItem(storageKey(user._id), id);
      else localStorage.removeItem(storageKey(user._id));
    }
  }

  const activeChild = useMemo(
    () => childList.find((c) => c._id === activeChildId) ?? null,
    [childList, activeChildId]
  );

  const value: ActiveChildContextValue = {
    children: childList,
    isLoading,
    activeChild,
    activeChildId,
    setActiveChildId,
    refetch: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["children"] });
    },
  };

  return <ActiveChildContext.Provider value={value}>{reactChildren}</ActiveChildContext.Provider>;
}

export function useActiveChild(): ActiveChildContextValue {
  const ctx = useContext(ActiveChildContext);
  if (!ctx) throw new Error("useActiveChild must be used within an ActiveChildProvider");
  return ctx;
}
