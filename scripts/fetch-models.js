// Reproducible, pinned CC0 asset import. Not required for ordinary builds.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const revision = "d65cd213cffb9c0ef17e3f70a6a46ea82ba47dfa";
const base = `https://raw.githubusercontent.com/lord3nd3r/ffxi-browser/${revision}/public/models/chars/`;
const root = new URL("../assets/models/", import.meta.url);
const names = [
  "Superhero_Female_FullBody",
  "Superhero_Male_FullBody",
  "Female_Peasant",
  "Male_Peasant",
  "hair/Hair_Long",
  "hair/Hair_SimpleParted",
];
const files = names
  .flatMap((n) => [n + ".gltf", n + ".bin"])
  .concat([
    "T_Hair_1_BaseColor.png",
    "T_Hair_2_BaseColor.png",
    "T_Eye_Brown.png",
    "T_Superhero_Female_Dark_BaseColor.png",
    "T_Superhero_Male_Dark.png",
    "T_Peasant_BaseColor.png",
    "T_Regular_Male_Dark_BaseColor.png",
  ]);
const hashes = {};
await mkdir(new URL("hair/", root), { recursive: true });
for (const name of files) {
  const res = await fetch(base + name);
  if (!res.ok) throw Error(`${name}: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeFile(new URL(name, root), bytes);
  hashes[name] = createHash("sha256").update(bytes).digest("hex");
  console.log(name, bytes.length);
}
await writeFile(
  new URL("manifest.json", root),
  JSON.stringify({ revision, source: base, sha256: hashes }, null, 2) + "\n",
);
