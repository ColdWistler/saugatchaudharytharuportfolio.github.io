import { defineConfig } from "vite";

// GitHub Pages serves from a subpath; a relative base keeps every asset
// working at any repo name and on the custom domain in public/CNAME.
export default defineConfig({
    base: "./",
    build: {
        target: "es2020",
        assetsInlineLimit: 4096,
        rollupOptions: {
            output: {
                manualChunks: {
                    three: ["three"],
                    motion: ["motion"],
                },
            },
        },
    },
});
