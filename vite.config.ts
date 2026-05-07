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
 },
 preview: {
   host: "0.0.0.0",
 },
});
