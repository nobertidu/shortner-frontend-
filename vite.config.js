import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// in dev, vite forwards /api and /s/ (the short links) to the backend.
// on the server, nginx does the same job, so the code never changes.
//
// note the "^/s/" below: a key starting with ^ is a regex. a plain "/s" would
// also match /src/main.jsx and break the dev server, because proxy keys match
// by prefix.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3002",
      "^/s/": "http://localhost:3002",
    },
  },
});
