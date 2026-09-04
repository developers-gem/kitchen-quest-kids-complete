import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "../LoginPage";
import { AuthProvider } from "../../../context/AuthContext";
import { setAccessToken } from "../../../api/tokenStore";
import * as authApi from "../../../api/auth";
import * as usersApi from "../../../api/users";

// The API layer is mocked at the module boundary -- these tests exercise
// real component code (form state, validation-adjacent UI, navigation)
// against a fake network, not real HTTP calls. This is the same boundary
// the app's own architecture draws (components never talk to fetch
// directly, only through api/*.ts), so mocking here doesn't paper over
// anything the component itself is responsible for.
vi.mock("../../../api/auth");
vi.mock("../../../api/users");

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard Home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

const fakeUser = {
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

beforeEach(() => {
  vi.clearAllMocks();
  setAccessToken(null);
  // Every test starts as "no existing session" unless a test overrides
  // it -- matches a fresh page load with no valid refresh cookie.
  vi.mocked(authApi.refresh).mockRejectedValue(new Error("no session"));
});

describe("Login flow", () => {
  it("renders the login form", async () => {
    renderLoginPage();
    await waitFor(() => expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument());
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("submits credentials and navigates to the dashboard on success", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({ user: fakeUser as never, accessToken: "fake-token", refreshToken: "fake-refresh-token" });
    vi.mocked(usersApi.getMe).mockResolvedValue(fakeUser as never);

    renderLoginPage();
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/email/i), "jamie@example.com");
    await user.type(screen.getByLabelText(/password/i), "StrongPass123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(authApi.login).toHaveBeenCalledWith("jamie@example.com", "StrongPass123");
    await waitFor(() => expect(screen.getByText("Dashboard Home")).toBeInTheDocument());
  });

  it("shows an error message and stays on the login page when credentials are rejected", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockRejectedValue(new Error("Invalid email or password"));

    renderLoginPage();
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/email/i), "jamie@example.com");
    await user.type(screen.getByLabelText(/password/i), "WrongPassword");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/invalid email or password/i));
    // Never navigated away -- still on the login form.
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("disables the submit button while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveLogin!: (v: { user: unknown; accessToken: string; refreshToken: string }) => void;
    vi.mocked(authApi.login).mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }) as never
    );

    renderLoginPage();
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());
    await user.type(screen.getByLabelText(/email/i), "jamie@example.com");
    await user.type(screen.getByLabelText(/password/i), "StrongPass123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(screen.getByRole("button", { name: /logging in/i })).toBeDisabled();

    resolveLogin({ user: fakeUser, accessToken: "fake-token", refreshToken: "fake-refresh-token" });
    vi.mocked(usersApi.getMe).mockResolvedValue(fakeUser as never);
    await waitFor(() => expect(screen.getByText("Dashboard Home")).toBeInTheDocument());
  });
});
