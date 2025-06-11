import { defineConfig, mergeConfig, loadEnv } from "vite";
import { defaults } from "../../packages/vite-config";
import react from "@vitejs/plugin-react";
import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";

export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd());

  return mergeConfig(
    defaults,
    defineConfig({
      server: {
        port: 3000,
        ...(mode === "development" && {
          proxy: {
            "/api": {
              target:"http://localhost:4000",
              changeOrigin: true
            }
          }
        })
      },
      define: {
        "import.meta.env.VITE_CDN_URL": JSON.stringify(env.VITE_CDN_URL)
      },
      css: {
        modules: {
          localsConvention: "camelCaseOnly",
          generateScopedName:
            mode === "production"
              ? "[hash:base64:8]"
              : "[local]_[hash:base64:5]"
        }
      },
      plugins: [react()],
      ssr: {
        noExternal: ["react-router-dom"] // Really?
      },
      build: {
        outDir: isSsrBuild ? "build" : "build/public",
        copyPublicDir: !isSsrBuild,
        ...(isSsrBuild && {  emptyOutDir: false }),
        rollupOptions: {
          ...(isSsrBuild && {
            output: {
              format: "es",
              entryFileNames: "server.mjs"
            }
          }),
          plugins: [
            typescript({
              outDir: isSsrBuild ? "build" : "build/public",
              exclude: ["**/*.old*", "**/*copy*"]
            }),
            ...(!isSsrBuild ? [
              copy({
                targets: [
                  {
                    src: "src/locales/*.json",
                    dest: "build/public/locales",
                    transform: (contents) => JSON.stringify(JSON.parse(contents.toString()))
                  }
                ],
                hook: "writeBundle"
              })
            ] : [])
          ]
        }
      }
    })
  );
});
