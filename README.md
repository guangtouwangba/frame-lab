# FRAME LAB · 人像摄影练习室

[Open studio / 在线练习](https://frame-lab-kohl.vercel.app) · [Source](https://github.com/guangtouwangba/frame-lab)

A small, open-source 3D portrait photography studio that runs in your browser. Practice framing, shot sizes, camera perspective, depth of field, and lighting, then capture the result as a PNG.

一个浏览器里的三维人像摄影练习室：移动机位、调整焦距和景别、观察光影，再按快门保存照片。无需账号、API key 或后端服务。

## Features / 功能

- Camera orbit, height, tilt, horizontal/vertical offset, roll, and 24–135 mm focal length.
- Sony α7 IV / α6700 and Fujifilm X-T5 bodies, five native compatible lenses, plus a free virtual lens. Real sensor dimensions, prime/zoom limits, aperture ranges and minimum focus distances.
- Two CC0 rigged portraits with detailed faces, hands and hair; recolorable clothing and three original 3D sets: cream arches, a quiet gallery and an olive courtyard.
- Close-up, bust, half-body and full-body presets; portrait/landscape/square aspect ratios and composition guides.
- Face autofocus, click-to-focus, manual focus, aperture, and background distance.
- Key-light angle/height/color, fill light, rim light, and approximate shadow softness.
- Live preview and PNG capture (1600 px on the long side), photo review and parameter restore.
- JSON setup import/export and browser-local settings persistence.
- Guided exercises for composition, shallow depth of field, perspective, and single-light portraits.

## Run locally

Requires Node.js 22 and a browser supporting WebGL 2.

```bash
npm ci
npm test
npm run build
npm start
```

Open the localhost address printed by the server. If the default port is occupied, use `PORT=8770 npm start`.

The build generates a self-contained `site/` folder, including the bundled models. Once built, it can be served offline; no third-party runtime CDN or remote model service is needed. An optional Python launcher (`启动摄影练习室.command`) is included for macOS and works after the build has generated `dist/app.js`.

## Deploy to Vercel

Import this GitHub repository into Vercel. The checked-in `vercel.json` configures:

| Setting | Value |
| --- | --- |
| Framework | Other |
| Install | `npm ci` |
| Build | `npm test && npm run build` |
| Output | `site` |
| Environment variables | None |

Only the static build output is served. Python is not used in production. Vercel's Git integration can deploy `main` to production and pull requests to previews. Ensure production access is public if you want visitors to open it without signing in.

## Controls / 操作

Drag the viewfinder to orbit; Shift-drag to pan; scroll to move closer/farther; click the subject to focus. Sliders expose the same controls for touch and keyboard users. Press Space while the viewfinder is focused, or click **拍摄照片**. Open the **练习** tab for guided starting points.

Photos are kept in memory for the current page session (latest 20 only) and disappear on refresh. Download PNGs to keep them. Current settings use localStorage; export a JSON setup to carry settings across browsers. PNGs do not embed EXIF metadata.

## Simulation limits

The models are adapted Quaternius CC0 stylized adults, not photorealistic scans. Camera perspective and lighting are rendered with Three.js. Depth of field uses a thin-lens circle of confusion and a capped screen-space blur; silhouettes and strong defocus can show artifacts. This is not a calibrated lens simulator or path tracer.

Aperture affects depth of field only (compensated automatic-exposure preview); exposure compensation independently controls brightness. Shutter blur, ISO noise, lens aberrations, manufacturer color science and subsurface skin scattering are not simulated. Output ratios crop inside the selected body's physical sensor rectangle. DoF readouts use active gate diagonal / 1500, a conventional equal-output criterion. Shadow softness is a filter, not a physical softbox size. All cameras export 1600 px, not native sensor resolution. See [SOURCES.md](SOURCES.md) for official specifications, formulas and precise boundaries.

## Privacy

Rendering, photos, and imported setups stay in your browser. The application has no analytics, account system, uploads, cookies, database, or API keys. The hosting provider may process ordinary web request logs; this app does not add telemetry.

## License & contributing

Application code is MIT licensed; see [LICENSE](LICENSE). Character assets are separately CC0; see [ASSETS.md](ASSETS.md) for author, primary license sources, pinned mirror and modifications. Three.js 0.185.1 is MIT licensed; its notice is preserved in the bundle and [THREE-LICENSE.txt](THREE-LICENSE.txt). esbuild is an MIT-licensed build dependency. This project does not reuse VLS code or assets.

See [CONTRIBUTING.md](CONTRIBUTING.md). GitHub Actions runs the optics tests and static build on pushes and pull requests.
