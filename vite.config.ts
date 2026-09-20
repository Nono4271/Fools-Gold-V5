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
     input: {
       main: path.resolve(import.meta.dirname, "index.html"),
       threeDemo: path.resolve(import.meta.dirname, "three-demo.html"),
     },
     output: {
       manualChunks(id) {
         // PixiJS never changes between deploys — isolate for long-term cache hits.
         if (id.includes("pixi.js") || id.includes("node_modules/pixi")) {
           return "pixi";
         }
         // Force all shared constants and utils into their own chunk so they
         // initialize before the main bundle — prevents TDZ errors caused by
         // skills.js / heroes.js being accessed before their module bodies run
         // (Rollup chunk ordering issue with battle.worker.js imports).
         if (id.includes("shared/constants") || id.includes("shared/utils")) {
           return "shared";
         }
       },
     },
   },
 },
 server: {
   host: "0.0.0.0",
   proxy: {
     '/ws': { target: 'ws://localhost:3001', ws: true, rewrite: (p) => p.replace(/^\/ws/, '') },
   },
 },
 preview: {
   host: "0.0.0.0",
 },
});
