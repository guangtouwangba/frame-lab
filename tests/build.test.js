import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("deployment serves only generated static output", () => {
  const config = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url)),
  );
  assert.equal(config.outputDirectory, "site");
  assert.equal(config.buildCommand, "npm test && npm run build");
  assert.equal(config.framework, null);
});
test("production entry references no external scripts or styles", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(
    /<(?:script|link)[^>]+(?:src|href)=["'](?:https?:)?\/\//i.test(html),
    false,
  );
  assert.ok(html.includes("dist/app.js"));
  assert.ok(html.includes("connect-src 'self'"));
});
