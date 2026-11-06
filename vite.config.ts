import { defineConfig } from "vite";

// Relative base so the build works when served from a sub-path (GitHub Pages: /<repo>/).
export default defineConfig({ base: "./" });
