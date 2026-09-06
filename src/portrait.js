import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { makeModel as makeFallback } from "./model.js";

// CC0 Quaternius assets; base geometry is trimmed to head and optional hands.
// Each outfit has its own matching skeleton, posed with the same world rotations.
export function makePortrait(onReady) {
  const fallback = makeFallback();
  const root = new T.Group();
  root.add(fallback.root);
  const skin = new T.MeshStandardMaterial({ color: "#ffffff" });
  const cloth = new T.MeshStandardMaterial({ color: "#e0c9ac" });
  const loader = new GLTFLoader();
  const portraits = new Map();
  let selected = "mira",
    hip = false;
  const load = (name) => loader.loadAsync("assets/models/" + name + ".gltf");
  function rotateWorld(bone, angle) {
    if (!bone) return;
    bone.updateWorldMatrix(true, false);
    const p = bone.parent.getWorldQuaternion(new T.Quaternion());
    const delta = new T.Quaternion().setFromAxisAngle(
      new T.Vector3(0, 0, 1).applyQuaternion(
        root.getWorldQuaternion(new T.Quaternion()),
      ),
      angle,
    );
    bone.quaternion.premultiply(p.clone().invert().multiply(delta).multiply(p));
    bone.updateWorldMatrix(false, true);
  }
  function applyPose(p) {
    for (const [bone, q] of p.rest) bone.quaternion.copy(q);
    p.group.updateMatrixWorld(true);
    for (const scene of p.rigs) {
      rotateWorld(scene.getObjectByName("upperarm_l"), hip ? -0.92 : -1.25);
      rotateWorld(scene.getObjectByName("lowerarm_l"), hip ? -1.12 : -0.1);
      rotateWorld(scene.getObjectByName("upperarm_r"), 1.27);
      rotateWorld(scene.getObjectByName("lowerarm_r"), 0.12);
    }
    p.group.updateMatrixWorld(true);
  }
  const ready = Promise.all(
    [
      ["mira", "Female", "hair/Hair_Long"],
      ["noah", "Male", "hair/Hair_SimpleParted"],
    ].map(async ([id, gender, hairName]) => {
      const [base, outfit, hair] = await Promise.all([
        load(`Superhero_${gender}_FullBody`),
        load(`${gender}_Peasant`),
        load(hairName),
      ]);
      const group = new T.Group(),
        skins = [],
        clothes = [],
        rest = [];
      base.scene.traverse((m) => {
        if (!m.isMesh) return;
        if (/^superhero/i.test(m.name)) {
          const g = m.geometry.clone(),
            pos = g.attributes.position,
            ix = g.index,
            kept = [];
          for (let i = 0; i < ix.count; i += 3) {
            const tri = [ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)];
            if (
              tri.every((j) => pos.getY(j) > 1.475) ||
              (gender === "Female" &&
                tri.every((j) => Math.abs(pos.getX(j)) > 0.64))
            )
              kept.push(...tri);
          }
          g.setIndex(kept);
          m.geometry = g;
          m.material.roughness = 0.68;
          skins.push(m.material);
        }
        if (m.name === "Eyes") m.material.roughness = 0.3;
        if (m.name === "Eyebrows") m.material.color.set("#33251f");
        m.material.vertexColors = false;
      });
      outfit.scene.traverse((m) => {
        if (m.isMesh) {
          m.material = m.material.clone();
          m.material.vertexColors = false;
          if (m.material.name.includes("Regular")) {
            skins.push(m.material);
            return;
          }
          m.material.map = null;
          m.material.roughness = 0.88;
          if (gender === "Female" && m.name.includes("Arms")) {
            const g = m.geometry.clone(),
              pos = g.attributes.position,
              ix = g.index,
              kept = [];
            for (let i = 0; i < ix.count; i += 3) {
              const tri = [ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)];
              if (tri.some((j) => Math.abs(pos.getX(j)) < 0.647))
                kept.push(...tri);
            }
            g.setIndex(kept);
            m.geometry = g;
          }
          if (m.name.includes("Legs")) m.material.color.set("#343d40");
          else if (m.name.includes("Feet")) m.material.color.set("#6d5140");
          else clothes.push(m.material);
        }
      });
      hair.scene.traverse((m) => {
        if (m.isMesh) {
          m.material.color.set("#33251f");
          m.material.roughness = 0.62;
        }
      });
      group.add(base.scene, outfit.scene, hair.scene);
      group.traverse((m) => {
        if (m.isBone) rest.push([m, m.quaternion.clone()]);
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
          m.frustumCulled = false;
        }
      });
      group.visible = false;
      root.add(group);
      const p = {
        group,
        skins,
        clothes,
        rest,
        rigs: [base.scene, outfit.scene],
      };
      portraits.set(id, p);
      applyPose(p);
    }),
  ).then(() => {
    fallback.root.visible = false;
    update(selected);
    onReady();
  });
  function update(id) {
    selected = id;
    for (const [key, p] of portraits) {
      p.group.visible = key === id;
      p.skins.forEach((m) => m.color.copy(skin.color));
      p.clothes.forEach((m) => m.color.copy(cloth.color));
    }
  }
  return {
    root,
    skin,
    cloth,
    ready,
    update,
    pose(value) {
      hip = value;
      portraits.forEach(applyPose);
    },
    get face() {
      return new T.Vector3(0, selected === "noah" ? 1.7 : 1.654, 0.075);
    },
  };
}
