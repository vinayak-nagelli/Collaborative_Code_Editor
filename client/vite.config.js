import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Monaco + Yjs are lazy-loaded (see client/src/pages/Workspace.jsx) and
    // never part of the initial bundle login/dashboard actually pay for —
    // this just quiets the warning for that expected, deferred chunk.
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ["@monaco-editor/react", "monaco-editor"],
          yjs: ["yjs", "y-monaco"],
        },
      },
    },
  },
});
