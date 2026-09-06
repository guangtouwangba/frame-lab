import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../site");
const files = new Set([
  "/index.html",
  "/style.css",
  "/layout.css",
  "/dist/app.js",
  "/LICENSE",
  "/THREE-LICENSE.txt",
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
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
