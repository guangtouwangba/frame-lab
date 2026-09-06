import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeLocalAI, localRequestAllowed } from "../server/local-ai.js";
const handleAI = makeLocalAI();
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../site");
const files = new Set([
  "/index.html",
  "/style.css",
  "/layout.css",
  "/dist/app.js",
  "/LICENSE",
  "/THREE-LICENSE.txt",
  "/SOURCES.md",
  "/ASSETS.md",
]);
for (const file of await readdir(resolve(root, "assets"), {
  recursive: true,
})) {
  if (/\.(gltf|bin|png|json)$/.test(file)) files.add("/assets/" + file);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  ".png": "image/png",
  ".json": "application/json",
};
const server = createServer(async (req, res) => {
  const port = server.address().port;
  if (!localRequestAllowed(req, port)) {
    res.writeHead(403);
    res.end("Local access only");
    return;
  }
  const path = new URL(req.url, "http://localhost").pathname;
  if (await handleAI(req, res, path, port)) return;
  const file = path === "/" ? "/index.html" : path;
  if (!["GET", "HEAD"].includes(req.method) || !files.has(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    const data = await readFile(resolve(root, "." + file));
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404);
    res.end("Run npm run build first.");
  }
});
server.listen(Number(process.env.PORT) || 8769, "127.0.0.1", () =>
  console.log("FRAME LAB: http://127.0.0.1:" + server.address().port),
);
server.on("error", (err) => {
  console.error(
    err.code === "EADDRINUSE"
      ? "Port in use. Try PORT=8770 npm start"
      : err.message,
  );
  process.exit(1);
});
