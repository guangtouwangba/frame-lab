# Contributing

Use Node.js 22 and run `npm ci`, `npm test`, and `npm run build` before submitting a pull request. Start the built app with `npm start`.

Keep the app client-only. Do not add analytics, uploads, external runtime CDNs, API keys, or accounts without first discussing the change in an issue. All new art assets need a redistributable license and source attribution.

Photography behavior should match the documented simulation: focal length, camera position, sensor gate, and depth of field must have meaningful effects. Label approximations. Test viewfinder interactions, PNG capture, and a narrow/mobile layout in a WebGL 2 browser.

Generated `site/`, `dist/`, and `node_modules/` are not committed. Please include concise reproduction steps and browser/GPU details for rendering bugs, without private browser logs or personal photos.
