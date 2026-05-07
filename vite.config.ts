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
