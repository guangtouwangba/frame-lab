import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cameras,
  lenses,
  constrainEquipment,
  compatibleLenses,
} from "../src/equipment.js";
import { gate, verticalFov, sanitize, defaults } from "../src/optics.js";
test("output crops never exceed oriented physical sensor dimensions", () => {
  for (const c of Object.values(cameras))
    for (const aspect of [2 / 3, 3 / 2, 1, 4 / 5]) {
      const g = gate(aspect, c.sensor),
        [w, h] = aspect < 1 ? [...c.sensor].reverse() : c.sensor;
      assert.ok(g.w <= w + 1e-9 && g.h <= h + 1e-9);
      assert.ok(Math.abs(g.w / g.h - aspect) < 1e-9);
    }
  assert.deepEqual(gate(1), { w: 24, h: 24 });
});
test("same lens on APS-C gives tighter field of view at unchanged position", () => {
  assert.ok(
    verticalFov(85, 2 / 3, cameras.a6700.sensor) <
      verticalFov(85, 2 / 3, cameras.a7iv.sensor),
  );
});
test("mount mismatch is replaced; primes and aperture respect real limits", () => {
  const s = sanitize({
    ...defaults,
    cameraId: "xt5",
    lensId: "fe85",
    focal: 100,
    aperture: 1.2,
  });
  assert.equal(s.lensId, "xf56");
  assert.equal(s.focal, 56);
  assert.equal(s.aperture, 1.2);
  const z = sanitize({
    ...s,
    cameraId: "a7iv",
    lensId: "fe24105",
    aperture: 1.2,
    focal: 135,
    focus: 0.2,
  });
  assert.equal(z.focal, 105);
  assert.equal(z.aperture, 4);
  assert.equal(z.focus, 0.38);
  for (const c of Object.keys(cameras)) assert.ok(compatibleLenses(c).length);
});
test("unknown/prototype equipment IDs and old setups are safe", () => {
  const s = sanitize({
    cameraId: "__proto__",
    lensId: "constructor",
    modelId: "<script>",
  });
  assert.equal(s.cameraId, "virtual");
  assert.equal(s.lensId, "virtual");
  assert.equal(s.modelId, "mira");
  assert.equal(sanitize({ focal: 65 }).focal, 65);
});
