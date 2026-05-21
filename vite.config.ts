import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
 plugins: [
   react(),
   tailwindcss(),
 ],
 resolve: {
   alias: {
     "@": path.resolve(import.meta.dirname, "src"),
   },
   extensions: [".tsx", ".ts", ".jsx", ".js"],
   dedupe: ["react", "react-dom"],
 },
 build: {
   outDir: "dist",
   emptyOutDir: true,
   rollupOptions: {
     output: {
       manualChunks: {
         // PixiJS is ~1.2 MB minified and never changes between game deploys.
         // Isolating it means the browser serves it from cache on every update
         // to game logic, maps, or UI — users never re-download 1.2 MB of
         // renderer code just because a balance patch shipped.
         pixi: ["pixi.js"],
       },
     },
   },
 },
 server: {
   host: "0.0.0.0",
   proxy: {
     // Proxy /ws → ws://localhost:3001 in dev so the hardcoded URL isn't needed
     '/ws': { target: 'ws://localhost:3001', ws: true, rewrite: (p) => p.replace(/^\/ws/, '') },
   },
 },
 preview: {
   host: "0.0.0.0",
 },
});
