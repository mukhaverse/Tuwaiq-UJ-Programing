import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

// The Cloudflare plugin runs the Worker (worker/index.ts) and a local D1
// alongside the site in `npm run dev`, and builds both for `wrangler deploy`.
// Two pages: the public site, and the admin panel at /backstage-q7m4/ (its folder name).
export default defineConfig({
  plugins: [react(), cloudflare()],
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: {
            site: resolve(import.meta.dirname, "index.html"),
            admin: resolve(import.meta.dirname, "backstage-q7m4/index.html"),
          },
        },
      },
    },
  },
});
