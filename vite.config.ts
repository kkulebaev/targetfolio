/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.test.ts"],
    // Node 25+ exposes a built-in localStorage that is undefined without --localstorage-file
    // and shadows the jsdom implementation, so tests would crash on localStorage.clear().
    execArgv: ["--no-webstorage"],
  },
});
