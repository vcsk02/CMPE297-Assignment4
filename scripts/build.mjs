import { build } from "esbuild";
await build({
  entryPoints: ["app/web/main.jsx"],
  bundle: true,
  format: "esm",
  outfile: "app/web/dist/app.js",
  define: { "process.env.NODE_ENV": '"production"' },
  minify: true,
});
console.log(
  "Browser bundle built with the official A2UI, OpenUI, and json-render libraries.",
);
