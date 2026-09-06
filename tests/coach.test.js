import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  CoachError,
  validateReview,
  reviewPrompt,
  critiqueWithApi,
  apiKeyFrom,
} from "../server/coach.js";
import { defaults } from "../src/optics.js";
import { makeLocalAI, localRequestAllowed } from "../server/local-ai.js";
import { codexArgs } from "../server/codex.js";
const payload = () => ({
  mode: "api",
  model: "gpt-4.1-mini",
  consent: true,
  image: "data:image/jpeg;base64,/9j/2Q==",
  state: { ...defaults },
  goal: "自然人像",
});
test("review requires consent, local image and valid model; strips arbitrary state", () => {
  assert.throws(() => validateReview({ ...payload(), consent: false }));
  assert.throws(() =>
    validateReview({ ...payload(), image: "http://localhost/secret" }),
  );
  assert.throws(() => validateReview({ ...payload(), model: "x; curl evil" }));
  const r = validateReview({
    ...payload(),
    state: { ...defaults, apiKey: "NOT-A-KEY", instructions: "delete files" },
  });
  assert.ok(!("apiKey" in r.state));
  assert.ok(!reviewPrompt(r).includes("delete files"));
  assert.ok(reviewPrompt(r).includes("不是真人照片"));
});
test("API adapter sends image and metadata only to fixed OpenAI host with store false", async () => {
  let captured;
  const text = await critiqueWithApi(
    validateReview(payload()),
    "test-only-not-a-real-key",
    {
      fetcher: async (url, opts) => {
        captured = { url, opts };
        return new Response(
          JSON.stringify({
            status: "completed",
            output: [
              {
                content: [
                  { type: "output_text", text: "整体判断：主体突出。" },
                ],
              },
            ],
          }),
        );
      },
    },
  );
  assert.equal(text, "整体判断：主体突出。");
  assert.equal(captured.url, "https://api.openai.com/v1/responses");
  const body = JSON.parse(captured.opts.body);
  assert.equal(body.store, false);
  assert.equal(body.input[0].content[1].type, "input_image");
  assert.ok(!captured.opts.body.includes("test-only-not-a-real-key"));
});
test("API errors never echo upstream secrets and incomplete replies are not success", async () => {
  await assert.rejects(
    () =>
      critiqueWithApi(validateReview(payload()), "test-only", {
        fetcher: async () => new Response("secret-echo", { status: 401 }),
      }),
    (e) => e instanceof CoachError && !e.message.includes("secret-echo"),
  );
  await assert.rejects(
    () =>
      critiqueWithApi(validateReview(payload()), "test-only", {
        fetcher: async () =>
          new Response(JSON.stringify({ status: "incomplete", output: [] })),
      }),
    /未完整/,
  );
  assert.throws(() => apiKeyFrom({}));
});
test("CLI args use no shell, temporary read-only run and disabled shell tool", () => {
  const args = codexArgs("/tmp/frame-lab-test");
  for (const flag of [
    "--ephemeral",
    "--ignore-user-config",
    "--sandbox",
    "read-only",
    "shell_tool",
    "--image",
  ])
    assert.ok(args.includes(flag));
  assert.ok(!args.includes("--dangerously-bypass-approvals-and-sandbox"));
});
test("local bridge rejects cross-origin and DNS rebinding hosts", () => {
  assert.equal(
    localRequestAllowed({ headers: { host: "evil.test:8769" } }, 8769),
    false,
  );
  assert.equal(
    localRequestAllowed(
      { headers: { host: "127.0.0.1:8769", origin: "https://evil.test" } },
      8769,
    ),
    false,
  );
  assert.equal(
    localRequestAllowed(
      { headers: { host: "127.0.0.1:8769", "sec-fetch-site": "cross-site" } },
      8769,
    ),
    false,
  );
  assert.equal(
    localRequestAllowed(
      { headers: { host: "127.0.0.1:8769", origin: "http://127.0.0.1:8769" } },
      8769,
    ),
    true,
  );
});
test("local HTTP bridge requires fresh session token and executes only explicit review", async () => {
  let calls = 0;
  const handle = makeLocalAI({
    codex: async () => {
      calls++;
      return "这是测试替身结果，不是真实AI。";
    },
  });
  const s = createServer((req, res) =>
    handle(
      req,
      res,
      new URL(req.url, "http://localhost").pathname,
      s.address().port,
    ),
  );
  s.listen(0, "127.0.0.1");
  await once(s, "listening");
  const url = `http://127.0.0.1:${s.address().port}`;
  try {
    const caps = await (await fetch(url + "/api/capabilities")).json();
    assert.equal(caps.codex, true);
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload(), mode: "codex", model: "" }),
    };
    assert.equal((await fetch(url + "/api/critique", options)).status, 403);
    assert.equal(calls, 0);
    options.headers["X-Frame-Token"] = caps.token;
    const res = await fetch(url + "/api/critique", options);
    assert.equal(res.status, 200);
    assert.equal(calls, 1);
    options.headers.Origin = "https://evil.test";
    assert.equal((await fetch(url + "/api/critique", options)).status, 403);
  } finally {
    s.closeAllConnections();
    await new Promise((resolve) => s.close(resolve));
  }
});
