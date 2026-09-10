// /// <reference types="vitest/config" />
// import react from "@vitejs/plugin-react";
// import tailwindcss from "@tailwindcss/vite";
// import { defineConfig } from "vite";

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   server: {
//     // Lets the app call fetch("/api/v1/...") in development without CORS
//     // configuration gymnastics -- the actual API base URL in production is
//     // set via VITE_API_BASE_URL (see src/api/client.ts).
//     proxy: {
//       "/api/v1": {
//         target: process.env.VITE_API_PROXY_TARGET || "http://localhost:4000",
//         changeOrigin: true,
//       },
//     },
//   },
//   test: {
//     environment: "jsdom",
//     setupFiles: ["./src/test/setup.ts"],
//     globals: true,
//     css: true,
//   },
// });
/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  const proxyTarget =
    env.VITE_API_PROXY_TARGET ||
    "https://kitchen-quest-kids-complete.onrender.com";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        // Proxies any request starting with /api (e.g. /api/v1/delete-account)
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      globals: true,
      css: true,
    },
  };
});