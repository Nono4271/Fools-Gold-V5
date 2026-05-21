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
       manualChunks(id) {
         // Co-locate pixi with MapRenderer so their dependency edge across
         // chunks never triggers a TDZ on pixi's const exports.
         // This preserves the caching benefit (renderer is its own
         // cache-stable file) while keeping the correct module init sequence.
         if (id.includes("pixi.js") || id.includes("MapRenderer")) {
           return "renderer";
         }
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
