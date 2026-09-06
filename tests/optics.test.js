import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verticalFov,
  depthOfField,
  cocDiameter,
  sanitize,
  gate,
} from "../src/optics.js";
test("50 mm on a 36×24 sensor gives a 27-degree vertical view", () => {
  assert.ok(Math.abs(verticalFov(50, 1.5) - 26.991) < 0.01);
  assert.deepEqual(gate(2 / 3), { w: 24, h: 36 });
});
test("85 mm f/2.8 at 3 m gives roughly 20 cm depth of field", () => {
  const d = depthOfField(85, 2.8, 3);
  assert.ok(d.near > 2.9 && d.near < 2.91);
  assert.ok(d.far > 3.1 && d.far < 3.11);
});
test("focus plane is sharp; wider aperture and farther backdrop blur more", () => {
  assert.equal(cocDiameter(85, 2, 3, 3), 0);
  assert.ok(cocDiameter(85, 2, 3, 6) > cocDiameter(85, 8, 3, 6));
  assert.ok(cocDiameter(85, 2, 3, 6) > cocDiameter(85, 2, 3, 4));
});
test("untrusted setup cannot inject content or out-of-range values", () => {
  const s = sanitize({
    focal: 10000,
    aperture: -5,
    aspect: "<img>",
    skin: "red",
    yaw: NaN,
    dof: "false",
  });
  assert.equal(s.focal, 135);
  assert.equal(s.aperture, 1.4);
  assert.equal(s.aspect, "2:3");
  assert.equal(s.skin, "#c99478");
  assert.equal(s.dof, true);
  assert.throws(() => sanitize(null));
});
