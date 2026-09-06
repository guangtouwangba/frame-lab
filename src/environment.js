import * as T from "three";
export const environments = {
  atelier: {
    name: "01 · 奶油拱廊",
    wall: "#bcb0a0",
    floor: "#b3a694",
    cloth: "#e0c9ac",
  },
  gallery: {
    name: "02 · 静谧画廊",
    wall: "#9aa6a0",
    floor: "#817467",
    cloth: "#b5c6cb",
  },
  garden: {
    name: "03 · 橄榄庭院",
    wall: "#c3b2a0",
    floor: "#c8baaa",
    cloth: "#dbc7b2",
  },
};
export function makeEnvironment() {
  const root = new T.Group(),
    sets = {};
  const mat = (color, roughness = 0.85) =>
    new T.MeshStandardMaterial({ color, roughness });
  const plaster = mat("#ded2c0"),
    stone = mat("#9c8b77"),
    wood = mat("#715441"),
    brass = new T.MeshStandardMaterial({
      color: "#99805b",
      roughness: 0.32,
      metalness: 0.65,
    });
  function mesh(parent, g, m, x, y, z) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function box(p, m, x, y, z, w, h, d) {
    return mesh(p, new T.BoxGeometry(w, h, d), m, x, y, z);
  }
  function cylinder(p, m, x, y, z, rt, rb, h) {
    return mesh(p, new T.CylinderGeometry(rt, rb, h, 48), m, x, y, z);
  }
  function arch(p, x, z, color) {
    const shape = new T.Shape();
    shape.moveTo(-0.78, 0);
    shape.lineTo(0.78, 0);
    shape.lineTo(0.78, 1.98);
    shape.absarc(0, 1.98, 0.78, 0, Math.PI, false);
    shape.lineTo(-0.78, 0);
    const o = mesh(
      p,
      new T.ExtrudeGeometry(shape, {
        depth: 0.15,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 3,
        steps: 1,
      }),
      mat(color),
      x,
      0,
      z,
    );
    return o;
  }
  function vase(p, x, y, z, s = 1) {
    const pts = [
      [0, 0],
      [0.12, 0],
      [0.2, 0.12],
      [0.21, 0.28],
      [0.15, 0.42],
      [0.08, 0.5],
      [0.075, 0.64],
      [0.06, 0.66],
    ].map(([a, b]) => new T.Vector2(a * s, b * s));
    mesh(p, new T.LatheGeometry(pts, 48), plaster, x, y, z);
  }
  function olive(p, x, z, scale = 1) {
    const tree = new T.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    p.add(tree);
    cylinder(tree, stone, 0, 0.24, 0, 0.27, 0.2, 0.48);
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(0, 0.45, 0),
      new T.Vector3(0.03, 1.1, 0),
      new T.Vector3(-0.09, 1.65, -0.04),
      new T.Vector3(0.01, 2.45, 0),
    ]);
    mesh(tree, new T.TubeGeometry(curve, 20, 0.028, 8, false), wood, 0, 0, 0);
    const leaves = [mat("#667454"), mat("#819076"), mat("#50624d")];
    for (let i = 0; i < 90; i++) {
      const a = i * 2.39996,
        r = 0.16 + 0.31 * (((i * 17) % 29) / 29),
        y = 1.3 + (i / 90) * 1.12;
      const lx = Math.sin(a) * r,
        lz = Math.cos(a) * r;
      if (i % 6 === 0) {
        const branch = new T.LineCurve3(
          new T.Vector3(0, y - 0.18, 0),
          new T.Vector3(lx, y, lz),
        );
        mesh(
          tree,
          new T.TubeGeometry(branch, 1, 0.006, 5, false),
          wood,
          0,
          0,
          0,
        );
      }
      const leaf = mesh(
        tree,
        new T.SphereGeometry(1, 8, 6),
        leaves[i % 3],
        lx,
        y,
        lz,
      );
      leaf.scale.set(0.09, 0.012, 0.035);
      leaf.rotation.set(a, 0.5, a * 0.6);
    }
  }
  const atelier = (sets.atelier = new T.Group());
  root.add(atelier);
  arch(atelier, -0.5, -0.1, "#aa9983");
  arch(atelier, -0.5, -0.04, "#b1a08c").scale.set(0.88, 0.96, 1);
  cylinder(atelier, plaster, 1.03, 0.38, 0.35, 0.29, 0.29, 0.76);
  vase(atelier, 1.03, 0.76, 0.35, 0.72);
  for (let i = 0; i < 9; i++)
    box(atelier, plaster, -1.8 + i * 0.045, 1.4, -0.05, 0.018, 2.8, 0.045);
  const gallery = (sets.gallery = new T.Group());
  root.add(gallery);
  for (let i = 0; i < 19; i++)
    box(gallery, wood, 1.0 + i * 0.065, 1.55, 0, 0.034, 3.1, 0.08);
  box(gallery, brass, -1.1, 1.55, 0.04, 0.94, 1.25, 0.05);
  box(gallery, plaster, -1.1, 1.55, 0.075, 0.88, 1.19, 0.03);
  const circle = mesh(
    gallery,
    new T.CircleGeometry(0.29, 64),
    mat("#a87355"),
    -1.1,
    1.66,
    0.1,
  );
  circle.scale.x = 0.75;
  box(gallery, mat("#777d71"), -1.12, 1.24, 0.105, 0.53, 0.11, 0.01);
  box(gallery, wood, 0.7, 0.42, 0.55, 1.4, 0.08, 0.45);
  for (const x of [0.12, 1.28])
    box(gallery, wood, x, 0.21, 0.55, 0.06, 0.42, 0.36);
  vase(gallery, 0.87, 0.46, 0.55, 0.65);
  const garden = (sets.garden = new T.Group());
  root.add(garden);
  olive(garden, -1.1, 0.3);
  olive(garden, 1.5, -0.05, 0.85);
  for (let i = 0; i < 3; i++)
    box(
      garden,
      plaster,
      1.15,
      0.07 + i * 0.12,
      0.8 - i * 0.2,
      1.2 - i * 0.13,
      0.14 + i * 0.24,
      0.75 - i * 0.15,
    );
  arch(garden, 0.15, -0.1, "#a18e75");
  for (let i = 0; i < 5; i++)
    cylinder(garden, plaster, -0.7 + i * 0.34, 0.38, 0.05, 0.035, 0.035, 0.76);
  return {
    root,
    update(id, distance, visible) {
      root.position.z = -distance + 0.3;
      root.visible = visible;
      for (const [key, set] of Object.entries(sets)) set.visible = key === id;
    },
  };
}
