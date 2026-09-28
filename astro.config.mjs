import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// The preview host injects PORT and requires the dev server to listen on all
// interfaces. HMR stays disabled in this environment.
export default defineConfig({
  site: "https://type-kori.pages.dev",
  output: "static",
  trailingSlash: "ignore",
  integrations: [preact(), sitemap()],
  server: {
    host: true,
    port: Number(process.env.PORT ?? 4321),
  },
  vite: {
    plugins: [tailwindcss()],
    server: { hmr: false },
  },
});
