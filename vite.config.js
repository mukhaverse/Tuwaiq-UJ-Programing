import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

// The Cloudflare plugin runs the Worker (worker/index.ts) and a local D1
// alongside the site in `npm run dev`, and builds both for `wrangler deploy`.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
