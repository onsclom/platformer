import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022", // Target ES2022 which supports top-level await
    rollupOptions: {
      // Any additional Rollup options if needed
    },
  },
  esbuild: {
    // Force esbuild to use ES2022 as the target
    target: "es2022",
  },
});
