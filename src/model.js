import * as T from "three";
export function makeModel() {
  const root = new T.Group();
  const skin = new T.MeshStandardMaterial({
    color: "#c99478",
    roughness: 0.75,
  });
  const cloth = new T.MeshStandardMaterial({
    color: "#53675e",
    roughness: 0.95,
  });
  const pants = new T.MeshStandardMaterial({ color: "#303638", roughness: 1 });
  const hair = new T.MeshStandardMaterial({ color: "#241e1c", roughness: 0.9 });
  const white = new T.MeshStandardMaterial({
    color: "#e1d6c8",
    roughness: 0.7,
  });
  const iris = new T.MeshStandardMaterial({ color: "#36342a", roughness: 0.5 });
  const lips = new T.MeshStandardMaterial({
    color: "#9b635c",
    roughness: 0.85,
  });
  function ell(parent, mat, x, y, z, sx, sy, sz) {
    const mesh = new T.Mesh(new T.SphereGeometry(1, 32, 24), mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function limb(parent, mat, a, b, r1, r2) {
    const av = new T.Vector3(...a),
      bv = new T.Vector3(...b),
      m = new T.Mesh(
        new T.CylinderGeometry(r2, r1, av.distanceTo(bv), 24),
        mat,
      );
    m.position.copy(av).add(bv).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      bv.clone().sub(av).normalize(),
    );
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  // Original procedural stylized adult model, built in metres, facing +Z.
  const torsoPoints = [
    [0, 0.91],
    [0.17, 0.93],
    [0.18, 1.02],
    [0.18, 1.18],
    [0.23, 1.34],
    [0.255, 1.4],
    [0.21, 1.44],
    [0.085, 1.47],
    [0, 1.47],
  ].map(([x, y]) => new T.Vector2(x, y));
  const torso = new T.Mesh(new T.LatheGeometry(torsoPoints, 48), cloth);
  torso.scale.z = 0.6;
  torso.castShadow = true;
  torso.receiveShadow = true;
  root.add(torso);
  ell(root, pants, 0, 0.94, -0.01, 0.205, 0.17, 0.125);
  limb(root, pants, [-0.11, 0.96, 0], [-0.13, 0.52, 0.015], 0.092, 0.082);
  limb(root, pants, [-0.13, 0.52, 0.015], [-0.14, 0.09, 0.035], 0.073, 0.05);
  limb(root, pants, [0.11, 0.96, 0], [0.15, 0.52, -0.035], 0.092, 0.082);
  limb(root, pants, [0.15, 0.52, -0.035], [0.16, 0.09, -0.01], 0.073, 0.05);
  ell(root, white, -0.14, 0.055, 0.09, 0.071, 0.055, 0.15);
  ell(root, white, 0.16, 0.055, 0.05, 0.071, 0.055, 0.15);
  limb(root, skin, [0, 1.43, 0], [0, 1.58, 0], 0.063, 0.065);
  const head = new T.Group();
  head.position.y = 1.65;
  root.add(head);
  ell(head, skin, 0, -0.008, 0, 0.106, 0.15, 0.102);
  ell(head, skin, -0.109, -0.015, -0.007, 0.018, 0.034, 0.021);
  ell(head, skin, 0.109, -0.015, -0.007, 0.018, 0.034, 0.021);
  // Forehead, cheek planes, nose bridge and lips give visible lighting cues.
  ell(head, skin, 0, -0.015, 0.094, 0.013, 0.033, 0.018);
  ell(head, skin, 0, -0.037, 0.108, 0.015, 0.011, 0.013);
  for (const x of [-0.039, 0.039]) {
    ell(head, white, x, 0.014, 0.091, 0.022, 0.011, 0.009);
    ell(head, iris, x, 0.014, 0.1, 0.009, 0.009, 0.003);
    ell(head, hair, x, 0.014, 0.103, 0.004, 0.005, 0.002);
    const brow = ell(head, hair, x, 0.037, 0.092, 0.025, 0.004, 0.004);
    brow.rotation.z = x < 0 ? 0.07 : -0.07;
  }
  ell(head, lips, 0, -0.07, 0.088, 0.029, 0.004, 0.007);
  ell(head, lips, 0, -0.078, 0.087, 0.026, 0.005, 0.006);
  const cap = new T.Mesh(
    new T.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, 1.4),
    hair,
  );
  cap.scale.set(0.116, 0.157, 0.11);
  cap.position.set(0, 0.007, -0.006);
  cap.castShadow = true;
  head.add(cap);
  ell(head, hair, -0.075, 0.094, 0.061, 0.065, 0.027, 0.055);
  ell(head, hair, 0.076, 0.076, 0.024, 0.037, 0.06, 0.071);
  ell(head, hair, -0.097, 0.028, -0.025, 0.016, 0.079, 0.055);
  ell(head, hair, 0.099, 0.028, -0.025, 0.016, 0.079, 0.055);
  const arms = new T.Group();
  root.add(arms);
  function pose(hip) {
    arms.children.slice().forEach((m) => {
      m.geometry.dispose();
      arms.remove(m);
    });
    limb(arms, cloth, [-0.23, 1.4, 0], [-0.285, 1.17, 0.015], 0.069, 0.055);
    limb(
      arms,
      skin,
      [-0.285, 1.17, 0.015],
      [-0.265, 0.97, 0.075],
      0.045,
      0.034,
    );
    ell(arms, skin, -0.264, 0.93, 0.078, 0.036, 0.065, 0.027);
    const elbow = hip ? [0.38, 1.18, 0.02] : [0.28, 1.16, -0.015],
      hand = hip ? [0.2, 1.07, 0.13] : [0.29, 0.94, 0.045];
    limb(arms, cloth, [0.23, 1.4, 0], elbow, 0.069, 0.052);
    limb(arms, skin, elbow, hand, 0.045, 0.03);
    ell(arms, skin, ...hand, 0.033, 0.061, 0.026);
  }
  pose(false);
  return { root, head, skin, cloth, pose };
}
