import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base must match your GitHub repo name for GitHub Pages
export default defineConfig({
  base: "/Finance/",
  plugins: [react(), tailwindcss()],
});
