import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      png: {
        quality: 80,
        compressionLevel: 9,
        palette: true,
        effort: 10,
      },
      jpeg: { quality: 82 },
      jpg: { quality: 82 },
      webp: { quality: 82 },
    }),
  ],
});
