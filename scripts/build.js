import { build } from "esbuild";
import { mkdir, copyFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "site");
await build({
  entryPoints: [resolve(root, "src/app.js")],
  bundle: true,
  format: "esm",
  outfile: resolve(root, "dist/app.js"),
  minify: true,
  legalComments: "inline",
});
// Only this generated output directory is removed; no user-authored files live here.
await rm(out, { recursive: true, force: true });
await mkdir(resolve(out, "dist"), { recursive: true });
for (const path of [
  "index.html",
  "style.css",
  "layout.css",
  "dist/app.js",
  "LICENSE",
  "THREE-LICENSE.txt",
])
  await copyFile(resolve(root, path), resolve(out, path));
console.log("Built static site/ and offline-compatible dist/app.js");
