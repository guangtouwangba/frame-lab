import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../assets/models/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", root)));
test("bundled CC0 assets match pinned hashes", () => {
  for (const [name, hash] of Object.entries(manifest.sha256)) {
    assert.equal(
      createHash("sha256")
        .update(readFileSync(new URL(name, root)))
        .digest("hex"),
      hash,
      name,
    );
  }
});
test("every used glTF buffer and material texture is available offline", () => {
  for (const name of Object.keys(manifest.sha256).filter((n) =>
    n.endsWith(".gltf"),
  )) {
    const path = new URL(name, root),
      g = JSON.parse(readFileSync(path));
    for (const b of g.buffers)
      assert.ok(existsSync(new URL(b.uri, path)), b.uri);
    for (const m of g.materials || []) {
      for (const v of Object.values(m.pbrMetallicRoughness || {})) {
        if (v && typeof v === "object" && "index" in v) {
          const uri = g.images[g.textures[v.index].source].uri;
          assert.ok(existsSync(new URL(uri, path)), `${name}: ${uri}`);
        }
      }
    }
  }
});
