import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on 0.0.0.0 so phones on the same Wi-Fi can connect
    proxy: {
      // Forward /api/* to the FastAPI backend so the frontend
      // never has to think about CORS or ports.
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
