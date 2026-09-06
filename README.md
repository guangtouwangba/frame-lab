# FRAME LAB · 人像摄影练习室

[Open studio / 在线练习](https://frame-lab-kohl.vercel.app) · [Source](https://github.com/guangtouwangba/frame-lab)

A small, open-source 3D portrait photography studio that runs in your browser. Practice framing, shot sizes, camera perspective, depth of field, and lighting, then capture the result as a PNG.

一个浏览器里的三维人像摄影练习室：移动机位、调整焦距和景别、观察光影，再按快门保存照片。摄影模拟无需账号；可选 AI 摄影教练需要用户自己的 API key 或本地 Codex CLI 登录。

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
- Optional AI photo critique: strengths, composition/lighting/DoF feedback and three prioritized changes. User-triggered, no automatic setting changes.

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

Static files come from `site/`; the two `api/*.js` handlers deploy as Node Vercel Functions. Python and Codex CLI are not used in production. No operator-owned API key is required or used. Vercel's Git integration can deploy `main` to production and pull requests to previews. Ensure production access is public if you want visitors to open it without signing in. AI relay requests can consume Vercel function resources; configure hosting spend limits before a large public launch.

## AI 摄影教练

1. 拍摄照片，点击缩略图回看，展开“AI 摄影教练”。
2. 在线版选择 OpenAI API，填写自己的 key 和支持图片的模型名称；默认 `gpt-4.1-mini`，可按账号权限改填。当前不支持任意厂商的兼容key或自定义URL。
3. 本地运行上述 Node 启动命令后，也可选 Codex CLI：需要新版 CLI 已安装并登录（`codex login`）。使用 `--ignore-user-config`、`--ephemeral`、`--image`，因此旧版本可能需要升级。默认模型留空；忽略用户配置以避免加载用户的工具/MCP，不修改其原配置。CLI使用自身登录，不会把网页API key交给CLI。
4. 填写拍摄意图（可选），勾选发送授权，再点“点评这张照片”。点评只绑定这一张照片，不自动调参。重新拍摄后可分别查看两张照片和点评。

Python 启动器及任意纯静态托管只支持摄影功能；完整AI请使用 `npm start` 或部署到Vercel。Vercel网页不会连接访问者的localhost；CLI模式必须在本地摄影室网页使用。

API模式：图片、参数、意图和key通过本站函数转发至OpenAI；固定服务地址、无用户指定代理URL、`store:false`。key仅页面内存，刷新即清除，可手动点“清除key”。请只在信任的部署中输入个人key，不输入组织共享生产密钥。

CLI模式：只监听127.0.0.1，检查Host/Origin及随机会话令牌；最多一个本地点评任务。临时图片在任务结束后删除，shell工具禁用、只读沙箱、无审批提权。CLI通常仍联网发送照片，并非离线模型。模型服务的数据保留政策、CLI认证状态及系统日志由其各自管理；进程被强制中止或断电可能留下系统临时文件。不要把本机服务暴露到公网。

点评图压缩到长边1024px，不能用于精密像素锐度判断。取消会中止本应用等待并尝试终止请求/进程，但已发送请求可能仍计费。key、请求图片和点评不写入本应用数据库或请求日志；托管/模型服务仍可能处理运营日志或依其政策保留数据。

Implementation references: [OpenAI vision](https://developers.openai.com/api/docs/guides/images-vision), [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js).

## Controls / 操作

Drag the viewfinder to orbit; Shift-drag to pan; scroll to move closer/farther; click the subject to focus. Sliders expose the same controls for touch and keyboard users. Press Space while the viewfinder is focused, or click **拍摄照片**. Open the **练习** tab for guided starting points.

Photos and their AI critiques are kept in memory for the current page session (latest 20 photos only) and disappear on refresh. Download PNGs to keep images; copy critique text if needed. Current shooting settings use localStorage; export a JSON setup to carry settings across browsers. AI credentials are never included. PNGs do not embed EXIF metadata.

## Simulation limits

The models are adapted Quaternius CC0 stylized adults, not photorealistic scans. Camera perspective and lighting are rendered with Three.js. Depth of field uses a thin-lens circle of confusion and a capped screen-space blur; silhouettes and strong defocus can show artifacts. This is not a calibrated lens simulator or path tracer.

Aperture affects depth of field only (compensated automatic-exposure preview); exposure compensation independently controls brightness. Shutter blur, ISO noise, lens aberrations, manufacturer color science and subsurface skin scattering are not simulated. Output ratios crop inside the selected body's physical sensor rectangle. DoF readouts use active gate diagonal / 1500, a conventional equal-output criterion. Shadow softness is a filter, not a physical softbox size. All cameras export 1600 px, not native sensor resolution. See [SOURCES.md](SOURCES.md) for official specifications, formulas and precise boundaries.

## Privacy

Rendering and imported setups stay in your browser. Photos stay local **unless you explicitly request AI critique and consent to sending that photo**. The application has no analytics, account system, cookies or database. AI keys are not persisted. The hosting and AI providers may process requests under their own policies; this app does not add telemetry.

## License & contributing

Application code is MIT licensed; see [LICENSE](LICENSE). Character assets are separately CC0; see [ASSETS.md](ASSETS.md) for author, primary license sources, pinned mirror and modifications. Three.js 0.185.1 is MIT licensed; its notice is preserved in the bundle and [THREE-LICENSE.txt](THREE-LICENSE.txt). esbuild is an MIT-licensed build dependency. This project does not reuse VLS code or assets.

See [CONTRIBUTING.md](CONTRIBUTING.md). GitHub Actions runs the optics tests and static build on pushes and pull requests.
