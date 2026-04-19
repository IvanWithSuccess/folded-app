import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  // Vite options tailored for Tauri development
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  optimizeDeps: {
    exclude: ["@tauri-apps/api", "@tauri-apps/plugin-dialog"],
    entries: ["index.html"], // Restrict scanning to index.html only
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  }
}));
