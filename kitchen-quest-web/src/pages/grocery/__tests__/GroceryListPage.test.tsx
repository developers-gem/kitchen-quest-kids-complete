import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GroceryListPage } from "../GroceryListPage";
import { AuthProvider } from "../../../context/AuthContext";
import { NotificationProvider } from "../../../context/NotificationContext";
import { setAccessToken } from "../../../api/tokenStore";
import * as authApi from "../../../api/auth";
import * as usersApi from "../../../api/users";
import * as groceryApi from "../../../api/grocery";
import type { GroceryList, User } from "../../../types/api";

vi.mock("../../../api/auth");
vi.mock("../../../api/users");
vi.mock("../../../api/grocery");

const fakeUser: User = {
  _id: "user1",
  role: ["parent"],
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  emailVerified: true,
  status: "active",
  organizationId: "org1",
  notificationPreferences: [],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <NotificationProvider>
            <GroceryListPage />
          </NotificationProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setAccessToken(null);
  localStorage.clear();
  vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: "fake-token", refreshToken: "fake-refresh-token" });
  vi.mocked(usersApi.getMe).mockResolvedValue(fakeUser);
});

const emptyList: GroceryList = { _id: "list-1", family: "org1", items: [], status: "active" };

describe("Grocery list", () => {
  it("shows an empty state when the list has no items", async () => {
    vi.mocked(groceryApi.getActiveGroceryList).mockResolvedValue(emptyList);
    renderPage();
    await waitFor(() => expect(screen.getByText(/your grocery list is empty/i)).toBeInTheDocument());
  });

  it("groups items by category and separates checked items", async () => {
    vi.mocked(groceryApi.getActiveGroceryList).mockResolvedValue({
      ...emptyList,
      items: [
        { _id: "item-1", name: "Apples", category: "Produce", checked: false, custom: false, sourceRecipes: [] },
        { _id: "item-2", name: "Milk", category: "Dairy", checked: false, custom: false, sourceRecipes: [] },
        { _id: "item-3", name: "Flour", category: "Baking", checked: true, custom: false, sourceRecipes: [] },
      ],
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Apples")).toBeInTheDocument());
    expect(screen.getByText("Produce")).toBeInTheDocument();
    expect(screen.getByText("Dairy")).toBeInTheDocument();
    expect(screen.getByText(/checked off \(1\)/i)).toBeInTheDocument();
  });

  it("toggles an item and updates the cache from the server response", async () => {
    const user = userEvent.setup();
    vi.mocked(groceryApi.getActiveGroceryList).mockResolvedValue({
      ...emptyList,
      items: [{ _id: "item-1", name: "Apples", category: "Produce", checked: false, custom: false, sourceRecipes: [] }],
    });
    vi.mocked(groceryApi.setGroceryItemChecked).mockResolvedValue({
      ...emptyList,
      items: [{ _id: "item-1", name: "Apples", category: "Produce", checked: true, custom: false, sourceRecipes: [] }],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText("Apples")).toBeInTheDocument());

    await user.click(screen.getByRole("checkbox", { name: /mark apples as bought/i }));

    expect(groceryApi.setGroceryItemChecked).toHaveBeenCalledWith("item-1", true);
    await waitFor(() => expect(screen.getByText(/checked off \(1\)/i)).toBeInTheDocument());
  });

  it("removes an item", async () => {
    const user = userEvent.setup();
    vi.mocked(groceryApi.getActiveGroceryList).mockResolvedValue({
      ...emptyList,
      items: [{ _id: "item-1", name: "Apples", category: "Produce", checked: false, custom: false, sourceRecipes: [] }],
    });
    vi.mocked(groceryApi.removeGroceryItem).mockResolvedValue(emptyList);

    renderPage();
    await waitFor(() => expect(screen.getByText("Apples")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /remove apples/i }));

    expect(groceryApi.removeGroceryItem).toHaveBeenCalledWith("item-1");
    await waitFor(() => expect(screen.getByText(/your grocery list is empty/i)).toBeInTheDocument());
  });

  it("adds a custom item via the form", async () => {
    const user = userEvent.setup();
    vi.mocked(groceryApi.getActiveGroceryList).mockResolvedValue(emptyList);
    vi.mocked(groceryApi.addCustomGroceryItem).mockResolvedValue({
      ...emptyList,
      items: [{ _id: "item-new", name: "Bananas", category: "Other", checked: false, custom: true, sourceRecipes: [] }],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText(/your grocery list is empty/i)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/add an item/i), "Bananas");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(groceryApi.addCustomGroceryItem).toHaveBeenCalledWith({ name: "Bananas" });
    await waitFor(() => expect(screen.getByText("Bananas")).toBeInTheDocument());
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });
});
