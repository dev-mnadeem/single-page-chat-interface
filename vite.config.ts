/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const DEV_PORT = 5173;

export default defineConfig({
  plugins: [react()],
  server: { port: DEV_PORT },
  preview: { port: DEV_PORT },
  build: {
    // Markdown rendering and the animation library are the two heavy imports.
    // Splitting them keeps the first-paint chunk well under the 500 kB warning.
    rollupOptions: {
      output: {
        manualChunks: {
          markdown: ["react-markdown", "remark-gfm"],
          motion: ["framer-motion"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: { reporter: ["text", "html"], include: ["src/**/*.{ts,tsx}"] },
  },
});
