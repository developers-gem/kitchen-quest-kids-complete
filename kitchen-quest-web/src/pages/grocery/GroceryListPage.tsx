import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { GroceryItem } from "../../components/GroceryItem";
import { getErrorMessage } from "../../lib/errors";
import { useNotifications } from "../../context/NotificationContext";
import * as groceryApi from "../../api/grocery";
import type { GroceryItem as GroceryItemType, GroceryList } from "../../types/api";

const QUERY_KEY = groceryApi.GROCERY_QUERY_KEY;

/**
 * Closes the last major slice of production readiness audit finding A4.
 * Grocery is family-scoped (not per-child, unlike Games/Recipes/Flavor
 * Hub) -- matches grocery.service.js's contract exactly, which keys off
 * `req.user.organizationId` alone with no childId anywhere in the API.
 *
 * No offline support here -- that's a deliberate, existing architectural
 * split, not an oversight: the Flutter app's OfflineCacheService is
 * where offline-aware grocery behavior lives (per the mobile app's own
 * docs), since a shopping trip with spotty connectivity is a mobile
 * scenario, not a desktop-web one.
 */
export function GroceryListPage() {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const [newItemName, setNewItemName] = useState("");
  const [adding, setAdding] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: groceryApi.getActiveGroceryList,
  });

  function updateCache(list: GroceryList) {
    queryClient.setQueryData(QUERY_KEY, list);
  }

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      groceryApi.setGroceryItemChecked(itemId, checked),
    onSuccess: updateCache,
    onError: (err) => notify(getErrorMessage(err), "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => groceryApi.removeGroceryItem(itemId),
    onSuccess: (list) => {
      updateCache(list);
      notify("Item removed", "info");
    },
    onError: (err) => notify(getErrorMessage(err), "error"),
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => groceryApi.addCustomGroceryItem({ name }),
    onSuccess: (list) => {
      updateCache(list);
      setNewItemName("");
    },
    onError: (err) => notify(getErrorMessage(err), "error"),
  });

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await addMutation.mutateAsync(trimmed);
    } finally {
      setAdding(false);
    }
  }

  if (isLoading) return <LoadingState label="Loading your grocery list..." />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  const needed = data.items.filter((i) => !i.checked);
  const checked = data.items.filter((i) => i.checked);
  const groupedNeeded = groupByCategory(needed);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-black text-foreground">Grocery List</h1>

      <form onSubmit={handleAddItem} className="mb-6 flex gap-2">
        <input
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Add an item..."
          className="min-h-11 flex-1 rounded-full border border-foreground/10 px-5 py-2.5 outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={adding || !newItemName.trim()}
          className="min-h-11 rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </form>

      {data.items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="Your grocery list is empty"
          description="Add ingredients from a recipe, or type in something above."
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNeeded).map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/40">{category}</h2>
              <ul className="space-y-2">
                {items.map((item) => (
                  <GroceryItem
                    key={item._id}
                    item={item}
                    onToggle={(checkedValue) => toggleMutation.mutate({ itemId: item._id, checked: checkedValue })}
                    onRemove={() => removeMutation.mutate(item._id)}
                  />
                ))}
              </ul>
            </section>
          ))}

          {checked.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/40">
                Checked off ({checked.length})
              </h2>
              <ul className="space-y-2">
                {checked.map((item) => (
                  <GroceryItem
                    key={item._id}
                    item={item}
                    onToggle={(checkedValue) => toggleMutation.mutate({ itemId: item._id, checked: checkedValue })}
                    onRemove={() => removeMutation.mutate(item._id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function groupByCategory(items: GroceryItemType[]): Record<string, GroceryItemType[]> {
  const groups: Record<string, GroceryItemType[]> = {};
  items.forEach((item) => {
    const key = item.category || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}
