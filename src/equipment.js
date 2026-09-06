// Published manufacturer specifications, checked 2026-09-06. See SOURCES.md.
export const cameras = {
  virtual: { name: "自由实验 · 36 × 24", sensor: [36, 24], mount: "virtual" },
  a7iv: { name: "Sony α7 IV · 全画幅", sensor: [35.9, 23.9], mount: "E" },
  a6700: { name: "Sony α6700 · APS-C", sensor: [23.3, 15.5], mount: "E" },
  xt5: { name: "Fujifilm X-T5 · APS-C", sensor: [23.5, 15.7], mount: "X" },
};
export const lenses = {
  virtual: {
    name: "自由镜头 · 24–135 mm",
    mount: "virtual",
    focal: [24, 135],
    aperture: [1.2, 22],
    minFocus: 0.2,
  },
  fe85: {
    name: "FE 85 mm F1.8",
    mount: "E",
    focal: [85, 85],
    aperture: [1.8, 22],
    minFocus: 0.8,
  },
  fe35: {
    name: "FE 35 mm F1.8",
    mount: "E",
    focal: [35, 35],
    aperture: [1.8, 22],
    minFocus: 0.22,
  },
  fe24105: {
    name: "FE 24–105 mm F4 G OSS",
    mount: "E",
    focal: [24, 105],
    aperture: [4, 22],
    minFocus: 0.38,
  },
  xf56: {
    name: "XF 56 mm F1.2 R WR",
    mount: "X",
    focal: [56, 56],
    aperture: [1.2, 16],
    minFocus: 0.5,
  },
  xf35: {
    name: "XF 35 mm F1.4 R",
    mount: "X",
    focal: [35, 35],
    aperture: [1.4, 16],
    minFocus: 0.28,
  },
};
export function compatibleLenses(cameraId) {
  const mount = (cameras[cameraId] || cameras.virtual).mount;
  return Object.entries(lenses).filter(([, l]) => l.mount === mount);
}
export function constrainEquipment(state) {
  if (!Object.hasOwn(cameras, state.cameraId)) state.cameraId = "virtual";
  const choices = compatibleLenses(state.cameraId);
  if (!choices.some(([id]) => id === state.lensId))
    state.lensId = choices[0][0];
  const l = lenses[state.lensId];
  state.focal = Math.min(l.focal[1], Math.max(l.focal[0], state.focal));
  state.aperture = Math.min(
    l.aperture[1],
    Math.max(l.aperture[0], state.aperture),
  );
  state.focus = Math.max(l.minFocus, state.focus);
  return state;
}
export function sensorFor(state) {
  return cameras[state.cameraId].sensor;
}
export function cropFactor(sensor) {
  return Math.hypot(36, 24) / Math.hypot(...sensor);
}
