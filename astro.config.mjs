import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// The preview host injects PORT and requires the dev server to listen on all
// interfaces. HMR stays disabled in this environment.
export default defineConfig({
  site: "https://typekori.vercel.app",
  output: "static",
  trailingSlash: "ignore",
  integrations: [
    preact(),
    sitemap({
      // An error page is crawlable, not recommendable: keep every 404 route
      // out of the sitemap (the localised one builds to /en/404/).
      filter: (page) => !page.includes("/404"),
    }),
  ],
  server: {
    host: true,
    port: Number(process.env.PORT ?? 4321),
  },
  vite: {
    plugins: [tailwindcss()],
    server: { hmr: false },
  },
});
