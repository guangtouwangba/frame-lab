import * as T from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { makePortrait } from "./portrait.js";
import { makeEnvironment, environments } from "./environment.js";
import {
  cameras,
  lenses,
  compatibleLenses,
  constrainEquipment,
  sensorFor,
  cropFactor,
} from "./equipment.js";
import {
  defaults,
  ranges,
  sanitize,
  clamp,
  gate,
  verticalFov,
  depthOfField,
} from "./optics.js";
const $ = (s) => document.querySelector(s);
let state = { ...defaults },
  currentTab = "camera",
  photos = [],
  selected = null,
  timer;
try {
  const s = localStorage.getItem("frame-lab-state");
  if (s) state = sanitize(JSON.parse(s));
} catch {}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").style.opacity = 1;
  clearTimeout(timer);
  timer = setTimeout(() => ($("#toast").style.opacity = 0), 3500);
}
function persist() {
  try {
    localStorage.setItem("frame-lab-state", JSON.stringify(state));
  } catch {
    toast("浏览器未允许本地保存，请导出方案保留设置");
  }
}
let renderer;
try {
  renderer = new T.WebGLRenderer({
    canvas: $("#view"),
    antialias: true,
    preserveDrawingBuffer: true,
  });
} catch (e) {
  $("#view-error").hidden = false;
  $("#view-error").textContent =
    "无法启动 WebGL 2。请在 Chrome / Safari 中启用硬件加速后重新打开。";
  $("#status").textContent = "三维渲染不可用";
  throw e;
}
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.outputColorSpace = T.SRGBColorSpace;
const scene = new T.Scene(),
  camera = new T.PerspectiveCamera(40, 2 / 3, 0.08, 60);
let modelReady = false;
const modelLoadTimer = setTimeout(() => {
  if (!modelReady)
    $("#status").textContent = "模型加载超过 20 秒，请检查连接或刷新重试";
}, 20000);
const model = makePortrait(() => {
  clearTimeout(modelLoadTimer);
  modelReady = true;
  update();
  $("#status").textContent = "摄影棚已就绪 · CC0 三维模特";
  $("#shutter").disabled = false;
});
model.ready.catch(() => {
  clearTimeout(modelLoadTimer);
  $("#status").textContent = "精细模特加载失败 · 显示简化人偶";
  toast("模特资源未能加载，请刷新重试。当前为简化预览。");
});
scene.add(model.root);
scene.add(new T.HemisphereLight(0xbecbda, 0x60554b, 0.6));
const floor = new T.Mesh(
  new T.PlaneGeometry(50, 50),
  new T.MeshStandardMaterial({ color: 0x656861, roughness: 1 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const wall = new T.Mesh(
  new T.PlaneGeometry(50, 15),
  new T.MeshStandardMaterial({ color: state.backdrop, roughness: 1 }),
);
wall.position.y = 6;
wall.receiveShadow = true;
scene.add(wall);
const environment = makeEnvironment();
scene.add(environment.root);
function spot(color) {
  const l = new T.SpotLight(color, 70, 25, Math.PI / 3, 0.7, 2);
  l.castShadow = true;
  l.shadow.mapSize.set(1024, 1024);
  l.shadow.bias = -0.00015;
  l.shadow.normalBias = 0.008;
  l.target.position.set(0, 1.2, 0);
  scene.add(l, l.target);
  return l;
}
const key = spot(0xfff1df),
  fill = spot(0xdce8ff),
  rim = spot(0xffdfbe);
fill.position.set(2, 1.9, 2);
rim.position.set(1.4, 2.5, -1.5);
const target = new T.WebGLRenderTarget(640, 960, { type: T.HalfFloatType });
target.depthTexture = new T.DepthTexture(640, 960);
target.depthTexture.type = T.UnsignedIntType;
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
const dof = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: target.depthTexture },
    near: { value: 0.08 },
    far: { value: 60 },
    focus: { value: 3.6 },
    focal: { value: 0.065 },
    aperture: { value: 2.8 },
    sensorW: { value: 0.024 },
    aspect: { value: 2 / 3 },
    enabled: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `
 varying vec2 vUv;uniform sampler2D tDiffuse;uniform sampler2D tDepth;uniform float near,far,focus,focal,aperture,sensorW,aspect,enabled;
 float depthAt(vec2 uv){float z=texture2D(tDepth,uv).x;return near*far/(far-z*(far-near));}
 void main(){float z=depthAt(vUv);float coc=focal*focal*abs(z-focus)/(aperture*z*max(.05,focus-focal));float r=min(.025,coc/sensorW*.5)*enabled;vec4 sum=texture2D(tDiffuse,vUv);float count=1.;for(int i=0;i<32;i++){float a=float(i)*2.399963;float rr=sqrt((float(i)+.5)/32.);vec2 uv=clamp(vUv+vec2(cos(a),sin(a)*aspect)*r*rr,vec2(.001),vec2(.999));float zd=depthAt(uv);float w=zd<z-max(.06,z*.025)?0.:1.;sum+=texture2D(tDiffuse,uv)*w;count+=w;}gl_FragColor=sum/count;}`,
});
composer.addPass(dof);
composer.addPass(new OutputPass());
const labels = {
  focal: ["焦距", "mm", 1],
  aperture: ["光圈", "f", 0.1],
  distance: ["机位距离", "m", 0.05],
  height: ["机位高度", "m", 0.02],
  yaw: ["环绕角度", "°", 1],
  pitch: ["俯仰角（负数俯拍）", "°", 1],
  pan: ["水平构图偏移", "m", 0.01],
  tilt: ["垂直构图偏移", "m", 0.01],
  roll: ["画面倾斜", "°", 1],
  focus: ["手动对焦距离", "m", 0.02],
  ev: ["曝光补偿", "EV", 0.1],
  modelYaw: ["模特朝向", "°", 1],
  bgDistance: ["人物到背景", "m", 0.1],
  keyAngle: ["主光方位", "°", 1],
  keyHeight: ["主光高度", "m", 0.05],
  keyPower: ["主光强度", "", 1],
  fillPower: ["补光强度", "", 1],
  rimPower: ["轮廓光强度", "", 1],
  softness: ["阴影软化（近似）", "", 0.1],
};
function val(k) {
  const v = state[k],
    u = labels[k][1];
  return u === "f"
    ? `f/${v.toFixed(1)}`
    : `${["m", "EV"].includes(u) ? v.toFixed(2) : v}${u ? " " + u : ""}`;
}
function slider(k) {
  const lens = lenses[state.lensId];
  const range =
    k === "focal"
      ? lens.focal
      : k === "aperture"
        ? lens.aperture
        : k === "focus"
          ? [lens.minFocus, 14]
          : ranges[k];
  return `<label class="control"><span>${labels[k][0]}<output id="out-${k}">${val(k)}</output></span><input aria-label="${labels[k][0]}" data-key="${k}" type="range" min="${range[0]}" max="${range[1]}" step="${labels[k][2]}" value="${state[k]}" ${range[0] === range[1] ? "disabled" : ""}></label>`;
}
function check(k, text) {
  return `<label class="check"><input type="checkbox" data-key="${k}" ${state[k] ? "checked" : ""}>${text}</label>`;
}
function select(k, text, options) {
  return `<label class="control"><span>${text}</span><select data-key="${k}" aria-label="${text}">${options.map(([v, t]) => `<option value="${v}" ${state[k] === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
}
function color(k, text) {
  return `<label class="control"><span>${text}</span><input type="color" aria-label="${text}" data-key="${k}" value="${state[k]}"></label>`;
}
const lessons = {
  free: "自由拍摄：先拍一张基准照，每次只改变一个参数，观察画面的变化。",
  thirds:
    "三分构图：选择近景，将面部放在左上或右上交点附近。平移取景中心，观察留白对人物视线的影响。",
  portrait:
    "浅景深：选择近景、85 mm 和 f/1.8，开启面部对焦。把背景拉远，再收至 f/8 拍第二张，比较虚化。",
  perspective:
    "透视比较：先用 35 mm 拍半身，拍照。改成 85 mm，再点“半身”保持近似景别，拍第二张。比较脸部透视和背景大小。",
  light:
    "塑造脸部：先把补光与轮廓光降至 0，主光从正面移至侧面。观察鼻影，再逐渐增加补光。",
};
function controls() {
  let html = "";
  if (currentTab === "camera")
    html = `<h2>选择你的器材</h2>${select(
      "cameraId",
      "相机机身",
      Object.entries(cameras).map(([id, c]) => [id, c.name]),
    )}${select(
      "lensId",
      "镜头",
      compatibleLenses(state.cameraId).map(([id, l]) => [id, l.name]),
    )}<div class="equipment-note" id="equipment-note"></div><h2>镜头与机位</h2>${slider("focal")}${slider("distance")}${slider("height")}${slider("yaw")}${slider("pitch")}${slider("pan")}${slider("tilt")}${slider("roll")}<h2>景深与取景</h2>${slider("aperture")}${check("dof", "开启景深预览")}${check("autoFocus", "自动对焦面部")}${slider("focus")}${slider("ev")}${select(
      "grid",
      "辅助线",
      [
        ["thirds", "三分线"],
        ["center", "中心十字"],
        ["none", "关闭"],
      ],
    )}<p>定焦镜头锁定焦距；更换机身保持机位不变。使用上方景别按钮可重新取景。自动曝光预览：光圈改变景深，曝光补偿控制亮度。</p><p>准确参数：画幅、视角、焦距 / 光圈范围、最近对焦限制。近似：薄透镜景深与实时散景。未模拟品牌色彩、噪点、像差、呼吸效应、防抖与实机分辨率。<a href="SOURCES.md" target="_blank" rel="noopener">规格来源与边界 ↗</a></p>`;
  if (currentTab === "light")
    html = `<h2>布光起点</h2><div class="presets"><button data-light="soft">柔和侧光</button><button data-light="split">侧面分割</button><button data-light="butterfly">正面高光</button><button data-light="rim">逆光轮廓</button></div>${slider("keyAngle")}${slider("keyHeight")}${slider("keyPower")}${slider("fillPower")}${slider("rimPower")}${slider("softness")}${color("keyColor", "主光颜色")}<p>灯光强度为模拟相对值。三盏灯会产生真实几何阴影；软化滑块调整阴影滤波，不代表柔光箱物理尺寸。</p>`;
  if (currentTab === "scene")
    html = `<h2>肖像与空间</h2>${select("modelId", "模特", [
      ["mira", "Mira · 长发"],
      ["noah", "Noah · 短发"],
    ])}${select(
      "environment",
      "三维布景",
      Object.entries(environments).map(([id, e]) => [id, e.name]),
    )}${select("pose", "姿态", [
      ["relaxed", "自然站姿"],
      ["hip", "单手扶腰"],
    ])}${slider("modelYaw")}<div class="two">${color("skin", "肤色调色")}${color("shirt", "服装调色")}</div>${color("backdrop", "背景颜色")}${slider("bgDistance")}${check("decor", "显示背景道具")}<p>Quaternius CC0 风格化人物，约 1.8 m，非真人扫描。保留面部结构、发型、服装与手指；肤色调色叠加在原始材质上。布景是三维几何体，改变机位会改变透视。<a href="ASSETS.md" target="_blank" rel="noopener">模型来源 ↗</a></p>`;
  if (currentTab === "learn")
    html = `<h2>一次练一个变量</h2>${select("lesson", "练习主题", [
      ["free", "自由拍摄"],
      ["thirds", "01 · 三分构图"],
      ["portrait", "02 · 浅景深"],
      ["perspective", "03 · 焦距与透视"],
      ["light", "04 · 单灯塑形"],
    ])}<div class="lesson-note">${lessons[state.lesson]}</div><h2>对比方法</h2><p>先拍基准照，再调整一个参数拍第二张。点击下方照片可回看参数，恢复当时机位。</p><p>这里不对美感打分。构图线提供参照，是否保留留白、居中或倾斜，由你决定。</p><button id="lesson-start">载入练习起点</button>`;
  $("#controls").innerHTML =
    `<section class="control-section">${html}</section>`;
  $("#controls")
    .querySelectorAll("[data-key]")
    .forEach((el) =>
      el.addEventListener("input", () => {
        const k = el.dataset.key;
        state[k] =
          el.type === "checkbox"
            ? el.checked
            : el.type === "range"
              ? Number(el.value)
              : el.value;
        if (k === "focus") state.autoFocus = false;
        if (k === "environment") {
          state.backdrop = environments[state.environment].wall;
          state.shirt = environments[state.environment].cloth;
        }
        constrainEquipment(state);
        update();
        if (["lesson", "cameraId", "lensId", "environment"].includes(k))
          controls();
      }),
    );
  $("#controls")
    .querySelectorAll("[data-light]")
    .forEach(
      (el) =>
        (el.onclick = () => {
          const presets = {
            soft: {
              keyAngle: -40,
              keyHeight: 2.7,
              keyPower: 85,
              fillPower: 25,
              rimPower: 50,
              softness: 2,
            },
            split: {
              keyAngle: -90,
              keyHeight: 1.8,
              keyPower: 110,
              fillPower: 0,
              rimPower: 0,
              softness: 0.5,
            },
            butterfly: {
              keyAngle: 0,
              keyHeight: 3.2,
              keyPower: 115,
              fillPower: 8,
              rimPower: 25,
              softness: 2,
            },
            rim: {
              keyAngle: 145,
              keyHeight: 2.5,
              keyPower: 180,
              fillPower: 10,
              rimPower: 100,
              softness: 1,
            },
          };
          Object.assign(state, presets[el.dataset.light]);
          update();
          controls();
        }),
    );
  if ($("#lesson-start"))
    $("#lesson-start").onclick = () => {
      const l = state.lesson;
      state = { ...defaults, lesson: l };
      if (l === "thirds") frameShot("bust");
      if (l === "portrait") {
        state.focal = 85;
        state.aperture = 1.8;
        state.bgDistance = 5;
        frameShot("bust");
      }
      if (l === "perspective") {
        state.focal = 35;
        frameShot("half");
      }
      if (l === "light") {
        state.fillPower = 0;
        state.rimPower = 0;
        state.keyAngle = 0;
        frameShot("bust");
      }
      update();
      controls();
      toast("练习起点已载入");
    };
  updateEquipmentReadout();
}
function updateEquipmentReadout() {
  const c = cameras[state.cameraId],
    l = lenses[state.lensId],
    s = c.sensor,
    g = gate(aspect(), s);
  const node = $("#equipment-note");
  if (node)
    node.textContent = `传感器 ${s[0]} × ${s[1]} mm · ${cropFactor(s).toFixed(2)}× 裁切系数\n当前取景门 ${g.w.toFixed(2)} × ${g.h.toFixed(2)} mm · 等效约 ${(state.focal * cropFactor(s)).toFixed(0)} mm（裁切前）\n最近对焦 ${l.minFocus.toFixed(2)} m · ${l.focal[0] === l.focal[1] ? "定焦" : "变焦"}镜头`;
}
let lastPose = "",
  dirty = true;
function aspect() {
  const [a, b] = state.aspect.split(":").map(Number);
  return a / b;
}
function update() {
  document
    .querySelectorAll("[data-shot]")
    .forEach((b) => b.classList.remove("active"));
  constrainEquipment(state);
  const a = aspect();
  camera.aspect = a;
  camera.fov = verticalFov(state.focal, a, sensorFor(state));
  camera.updateProjectionMatrix();
  const yaw = T.MathUtils.degToRad(state.yaw),
    pitch = T.MathUtils.degToRad(state.pitch);
  const right = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  camera.position.set(
    Math.sin(yaw) * state.distance,
    state.height,
    Math.cos(yaw) * state.distance,
  );
  camera.position.addScaledVector(right, state.pan);
  camera.position.y += state.tilt;
  const dir = new T.Vector3(
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(camera.position.clone().add(dir));
  camera.rotateZ(T.MathUtils.degToRad(state.roll));
  camera.updateMatrixWorld();
  model.root.rotation.y = T.MathUtils.degToRad(state.modelYaw);
  model.skin.color.set(state.skin);
  model.cloth.color.set(state.shirt);
  model.update(state.modelId);
  if (lastPose !== state.pose) {
    model.pose(state.pose === "hip");
    lastPose = state.pose;
  }
  model.root.updateMatrixWorld(true);
  const face = model.root.localToWorld(model.face.clone());
  if (state.autoFocus)
    state.focus = clamp(
      face.clone().applyMatrix4(camera.matrixWorldInverse).z * -1,
      lenses[state.lensId].minFocus,
      14,
    );
  wall.position.z = -state.bgDistance;
  wall.material.color.set(state.backdrop);
  scene.background = new T.Color(state.backdrop);
  environment.update(state.environment, state.bgDistance, state.decor);
  floor.material.color.set(environments[state.environment].floor);
  const ka = T.MathUtils.degToRad(state.keyAngle);
  key.position.set(2.5 * Math.sin(ka), state.keyHeight, 2.5 * Math.cos(ka));
  key.intensity = state.keyPower;
  fill.intensity = state.fillPower;
  rim.intensity = state.rimPower;
  key.color.set(state.keyColor);
  for (const l of [key, fill, rim]) l.shadow.radius = state.softness;
  renderer.toneMappingExposure = 2 ** state.ev;
  Object.assign(dof.uniforms.focus, { value: state.focus });
  dof.uniforms.focal.value = state.focal / 1000;
  dof.uniforms.aperture.value = state.aperture;
  dof.uniforms.sensorW.value = gate(a, sensorFor(state)).w / 1000;
  dof.uniforms.aspect.value = a;
  dof.uniforms.enabled.value = state.dof ? 1 : 0;
  $("#aspect").value = state.aspect;
  $("#grid").className = state.grid;
  $("#read-focal").textContent = state.focal + " mm";
  $("#equipment-caption").textContent =
    `${cameras[state.cameraId].name} · ${lenses[state.lensId].name}`;
  $("#read-aperture").textContent = "f/" + state.aperture.toFixed(1);
  $("#read-focus").textContent = state.focus.toFixed(2) + " m";
  const g = gate(a, sensorFor(state));
  const d = depthOfField(
    state.focal,
    state.aperture,
    state.focus,
    Math.hypot(g.w, g.h) / 1500,
  );
  updateEquipmentReadout();
  $("#read-dof").textContent =
    d.near.toFixed(2) +
    "–" +
    (Number.isFinite(d.far) ? d.far.toFixed(2) : "∞") +
    " m";
  for (const k of Object.keys(labels)) {
    if ($("#out-" + k)) $("#out-" + k).textContent = val(k);
    const input = $(`[data-key="${k}"]`);
    if (input && document.activeElement !== input) input.value = state[k];
  }
  const af = $('[data-key="autoFocus"]');
  if (af) af.checked = state.autoFocus;
  const p = face.project(camera);
  $("#focus-mark").style.left = (p.x * 0.5 + 0.5) * 100 + "%";
  $("#focus-mark").style.top = (-p.y * 0.5 + 0.5) * 100 + "%";
  $("#focus-mark").style.opacity =
    state.autoFocus && Math.abs(p.x) < 1 && Math.abs(p.y) < 1 ? 0.8 : 0;
  persist();
  drawMap();
  dirty = true;
}
function frameShot(name) {
  const shots = {
    close: [1.64, 0.42],
    bust: [1.46, 0.88],
    half: [1.23, 1.28],
    full: [0.91, 2.12],
  };
  const [y, h] = shots[name];
  state.distance = clamp(
    (h * state.focal) / gate(aspect(), sensorFor(state)).h,
    0.65,
    10,
  );
  state.height = y;
  state.pitch = 0;
  state.pan = 0;
  state.tilt = 0;
  state.roll = 0;
  state.autoFocus = true;
  update();
  document
    .querySelectorAll("[data-shot]")
    .forEach((b) => b.classList.toggle("active", b.dataset.shot === name));
  controls();
}
function drawMap() {
  const c = $("#map").getContext("2d"),
    w = 520,
    h = 300;
  c.clearRect(0, 0, w, h);
  const scale = 20,
    px = (x) => w / 2 + x * scale,
    py = (z) => 125 + z * scale;
  c.strokeStyle = "#2a302b";
  c.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    c.beginPath();
    c.moveTo(px(i), 0);
    c.lineTo(px(i), h);
    c.stroke();
  }
  for (let i = -6; i <= 8; i++) {
    c.beginPath();
    c.moveTo(0, py(i));
    c.lineTo(w, py(i));
    c.stroke();
  }
  c.strokeStyle = "#f3a87570";
  c.beginPath();
  c.moveTo(px(camera.position.x), py(camera.position.z));
  c.lineTo(px(0), py(0));
  c.stroke();
  for (const [pos, text, color] of [
    [model.root.position, "模特", "#eef1e7"],
    [camera.position, "相机", "#f3a875"],
    [key.position, "K", "#eed4b5"],
    [fill.position, "F", "#bacde0"],
    [rim.position, "R", "#dcc5ae"],
  ]) {
    c.fillStyle = color;
    c.beginPath();
    c.arc(px(pos.x), py(pos.z), 6, 0, Math.PI * 2);
    c.fill();
    c.font = "15px sans-serif";
    c.fillText(text, px(pos.x) + 10, py(pos.z) + 4);
  }
  c.strokeStyle = "#889186";
  c.beginPath();
  c.moveTo(35, py(-state.bgDistance));
  c.lineTo(w - 35, py(-state.bgDistance));
  c.stroke();
}
let renderW = 0,
  renderH = 0;
function setRenderSize(w, h) {
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  dof.uniforms.tDepth.value = composer.renderTarget2.depthTexture;
}
function resize() {
  const el = $("#stage"),
    a = aspect(),
    maxW = el.clientWidth - 36,
    maxH = el.clientHeight - 58;
  let w = Math.min(maxW, maxH * a),
    h = w / a;
  $("#frame").style.width = w + "px";
  $("#frame").style.height = h + "px";
  const scale = Math.min(devicePixelRatio || 1, 1.5);
  renderW = Math.max(1, Math.round(w * scale));
  renderH = Math.max(1, Math.round(h * scale));
  setRenderSize(renderW, renderH);
  dirty = true;
}
function render() {
  // RenderPass writes into readBuffer, whose depth accompanies the scene colour.
  dof.uniforms.tDepth.value = composer.readBuffer.depthTexture;
  composer.render();
}
function animate() {
  requestAnimationFrame(animate);
  if (dirty) {
    render();
    dirty = false;
  }
}
new ResizeObserver(resize).observe($("#stage"));
$("#aspect").onchange = (e) => {
  state.aspect = e.target.value;
  update();
  resize();
};
document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      currentTab = b.dataset.tab;
      document
        .querySelectorAll("[data-tab]")
        .forEach((x) => x.classList.toggle("active", x === b));
      controls();
    }),
);
document
  .querySelectorAll("[data-shot]")
  .forEach((b) => (b.onclick = () => frameShot(b.dataset.shot)));
$("#reset").onclick = () => {
  state = { ...defaults };
  update();
  resize();
  controls();
  toast("已恢复默认场景");
};
$("#help").onclick = () => $("#help-dialog").showModal();
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => $("#" + b.dataset.close).close()));
function download(blob, name) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
$("#save-setup").onclick = () =>
  download(
    new Blob(
      [JSON.stringify({ app: "frame-lab", version: 1, state }, null, 2)],
      { type: "application/json" },
    ),
    "frame-lab-方案.json",
  );
$("#import-setup").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100000) throw Error("方案文件过大");
    const obj = JSON.parse(await file.text());
    if (obj.app !== "frame-lab" || obj.version !== 1 || !obj.state)
      throw Error("请导入本应用导出的版本 1 方案");
    state = sanitize(obj.state);
    update();
    resize();
    controls();
    toast("方案已恢复");
  } catch (err) {
    toast("导入失败：" + err.message);
  }
  e.target.value = "";
};
let drag = null;
const view = $("#view");
view.onpointerdown = (e) => {
  view.setPointerCapture(e.pointerId);
  drag = {
    x: e.clientX,
    y: e.clientY,
    s: { ...state },
    moved: false,
    pan: e.shiftKey,
  };
};
view.onpointermove = (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 4) drag.moved = true;
  if (!drag.moved) return;
  if (drag.pan) {
    const m =
      (state.distance * gate(aspect()).w) / state.focal / view.clientWidth;
    state.pan = clamp(drag.s.pan - dx * m, -1.5, 1.5);
    state.tilt = clamp(drag.s.tilt + dy * m, -0.7, 0.7);
  } else {
    state.yaw = clamp(drag.s.yaw - dx * 0.18, -150, 150);
    state.pitch = clamp(drag.s.pitch + dy * 0.12, -45, 45);
  }
  update();
};
view.onpointerup = (e) => {
  if (drag && !drag.moved) {
    const r = view.getBoundingClientRect(),
      mouse = new T.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      ),
      ray = new T.Raycaster();
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(scene.children, true).find((h) => {
      if (!h.object.isMesh) return false;
      for (let p = h.object; p; p = p.parent) if (!p.visible) return false;
      return true;
    });
    if (hit) {
      state.autoFocus = false;
      state.focus = clamp(
        -hit.point.clone().applyMatrix4(camera.matrixWorldInverse).z,
        lenses[state.lensId].minFocus,
        14,
      );
      update();
      controls();
      $("#focus-mark").style.left = (mouse.x * 0.5 + 0.5) * 100 + "%";
      $("#focus-mark").style.top = (-mouse.y * 0.5 + 0.5) * 100 + "%";
      $("#focus-mark").style.opacity = 1;
    }
  }
  drag = null;
};
view.onpointercancel = () => (drag = null);
view.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    state.distance = clamp(state.distance + e.deltaY * 0.003, 0.65, 10);
    update();
  },
  { passive: false },
);
let shooting = false;
async function shoot() {
  if (shooting || !modelReady) return;
  shooting = true;
  $("#shutter").disabled = true;
  try {
    const a = aspect(),
      w = Math.round(a >= 1 ? 1600 : 1600 * a),
      h = Math.round(a >= 1 ? 1600 / a : 1600);
    setRenderSize(w, h);
    render();
    const blob = await new Promise((resolve) =>
      view.toBlob(resolve, "image/png"),
    );
    if (!blob) throw Error("图片编码失败");
    const thumb = document.createElement("canvas");
    thumb.width = 150;
    thumb.height = Math.round(150 / a);
    thumb.getContext("2d").drawImage(view, 0, 0, thumb.width, thumb.height);
    const shot = {
      blob,
      url: URL.createObjectURL(blob),
      thumb: thumb.toDataURL("image/jpeg", 0.8),
      state: { ...state },
      w,
      h,
      time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    };
    photos.push(shot);
    if (photos.length > 20) {
      const old = photos.shift();
      URL.revokeObjectURL(old.url);
    }
    gallery();
    view.classList.remove("flash");
    void view.offsetWidth;
    view.classList.add("flash");
    toast(`照片已保存到下方 · ${w} × ${h}`);
  } catch (e) {
    toast("拍摄失败：" + e.message);
  } finally {
    setRenderSize(renderW, renderH);
    dirty = true;
    shooting = false;
    $("#shutter").disabled = false;
  }
}
function gallery() {
  $("#gallery").replaceChildren();
  photos.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "shot";
    b.setAttribute("aria-label", `查看照片 ${i + 1}`);
    const img = document.createElement("img");
    img.src = s.thumb;
    img.alt = `${s.state.focal} mm 人像`;
    const span = document.createElement("span");
    span.textContent = `${s.state.focal}mm · f/${s.state.aperture}`;
    b.append(img, span);
    b.onclick = () => {
      selected = s;
      $("#photo-preview").src = s.url;
      $("#photo-meta").textContent =
        `${s.time} · ${s.w} × ${s.h} · ${cameras[s.state.cameraId].name} + ${lenses[s.state.lensId].name} · ${s.state.focal} mm · f/${s.state.aperture} · 机位 ${s.state.distance.toFixed(2)} m · 对焦 ${s.state.focus.toFixed(2)} m · EV ${s.state.ev} · ${s.state.modelId} · ${environments[s.state.environment].name}`;
      $("#photo-dialog").showModal();
    };
    $("#gallery").append(b);
  });
  $("#shot-count").textContent = photos.length + " 张 · 点击照片查看 / 下载";
  $("#gallery").scrollLeft = $("#gallery").scrollWidth;
}
$("#shutter").onclick = shoot;
$("#download-photo").onclick = () => {
  if (selected)
    download(
      selected.blob,
      "FRAME-" +
        selected.time.replaceAll(":", "") +
        "-" +
        selected.state.focal +
        "mm.png",
    );
};
$("#restore-shot").onclick = () => {
  if (selected) {
    state = { ...selected.state };
    update();
    resize();
    controls();
    $("#photo-dialog").close();
    toast("已恢复这张照片的拍摄参数");
  }
};
document.addEventListener("keydown", (e) => {
  if (
    e.code === "Space" &&
    !e.repeat &&
    !["INPUT", "SELECT", "BUTTON", "TEXTAREA"].includes(
      document.activeElement.tagName,
    ) &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    shoot();
  }
});
view.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  $("#view-error").hidden = false;
  $("#view-error").textContent =
    "显卡上下文中断，请刷新页面恢复。当前设置已保存。";
  $("#shutter").disabled = true;
});
controls();
update();
resize();
render();
animate();
$("#shutter").disabled = !modelReady;
if (!modelReady) $("#status").textContent = "正在加载三维模特…";
