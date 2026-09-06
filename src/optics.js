export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export function gate(aspect) {
  return { w: 36 * Math.min(1, aspect), h: 36 / Math.max(1, aspect) };
}
export function verticalFov(focal, aspect) {
  return (2 * Math.atan(gate(aspect).h / (2 * focal)) * 180) / Math.PI;
}
export function depthOfField(focal, aperture, focus) {
  const f = focal / 1000,
    c = 0.00003,
    H = (f * f) / (aperture * c) + f;
  return {
    near: (H * focus) / (H + focus - f),
    far: H > focus - f ? (H * focus) / (H - focus + f) : Infinity,
  };
}
export function cocDiameter(focal, aperture, focus, depth) {
  const f = focal / 1000;
  return (f * f * Math.abs(depth - focus)) / (aperture * depth * (focus - f));
}
export const defaults = {
  focal: 65,
  aperture: 2.8,
  distance: 2.31,
  height: 1.23,
  yaw: 0,
  pitch: 0,
  pan: 0,
  tilt: 0,
  roll: 0,
  focus: 2.22,
  autoFocus: true,
  ev: 0,
  aspect: "2:3",
  grid: "thirds",
  dof: true,
  modelYaw: -12,
  pose: "relaxed",
  skin: "#c99478",
  shirt: "#53675e",
  backdrop: "#797b74",
  bgDistance: 3,
  decor: true,
  keyAngle: -40,
  keyHeight: 2.7,
  keyPower: 85,
  keyColor: "#fff1df",
  fillPower: 25,
  rimPower: 50,
  softness: 2,
  lesson: "free",
};
export const ranges = {
  focal: [24, 135],
  aperture: [1.4, 16],
  distance: [0.65, 10],
  height: [0.3, 2.8],
  yaw: [-150, 150],
  pitch: [-45, 45],
  pan: [-1.5, 1.5],
  tilt: [-0.7, 0.7],
  roll: [-25, 25],
  focus: [0.4, 14],
  ev: [-3, 3],
  modelYaw: [-180, 180],
  bgDistance: [1.5, 6],
  keyAngle: [-180, 180],
  keyHeight: [0.5, 4],
  keyPower: [0, 200],
  fillPower: [0, 150],
  rimPower: [0, 200],
  softness: [0, 5],
};
export function sanitize(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("方案格式不正确");
  const out = { ...defaults };
  for (const [k, [min, max]] of Object.entries(ranges)) {
    if (Number.isFinite(input[k])) out[k] = clamp(input[k], min, max);
  }
  for (const k of ["autoFocus", "dof", "decor"])
    if (typeof input[k] === "boolean") out[k] = input[k];
  for (const k of ["skin", "shirt", "backdrop", "keyColor"])
    if (/^#[\da-f]{6}$/i.test(input[k])) out[k] = input[k];
  for (const [k, choices] of Object.entries({
    aspect: ["2:3", "3:2", "1:1", "4:5"],
    grid: ["thirds", "center", "none"],
    pose: ["relaxed", "hip"],
    lesson: ["free", "thirds", "portrait", "perspective", "light"],
  }))
    if (choices.includes(input[k])) out[k] = input[k];
  return out;
}
