import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmounts rendered components after each test so one test's DOM never
// leaks into the next -- React Testing Library doesn't do this
// automatically outside a Jest+jest-dom auto-cleanup setup.
afterEach(() => {
  cleanup();
});
