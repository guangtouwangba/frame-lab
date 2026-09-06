import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  CoachError,
  validateReview,
  readBody,
  apiKeyFrom,
  critiqueWithApi,
  sendJson,
} from "./coach.js";
import { critiqueWithCodex } from "./codex.js";

export function localRequestAllowed(req, port) {
  const host = req.headers.host;
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) return false;
  if (req.headers.origin && req.headers.origin !== `http://${host}`)
    return false;
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  return true;
}
export function makeLocalAI({
  codex = critiqueWithCodex,
  api = critiqueWithApi,
} = {}) {
  const token = randomBytes(32).toString("hex");
  let active = false;
  return async function handle(req, res, path, port) {
    if (!path.startsWith("/api/")) return false;
    if (!localRequestAllowed(req, port)) {
      sendJson(res, 403, { error: "只允许本机同源网页访问" });
      return true;
    }
    if (path === "/api/capabilities" && req.method === "GET") {
      sendJson(res, 200, { api: true, codex: true, local: true, token });
      return true;
    }
    if (path !== "/api/critique" || req.method !== "POST") {
      sendJson(res, 404, { error: "接口不存在" });
      return true;
    }
    const supplied = Buffer.from(String(req.headers["x-frame-token"] || ""));
    if (
      supplied.length !== token.length ||
      !timingSafeEqual(supplied, Buffer.from(token))
    ) {
      sendJson(res, 403, { error: "本地连接已失效，请刷新页面" });
      return true;
    }
    if (active) {
      sendJson(res, 429, { error: "本地已有一项点评正在进行，请稍候" });
      return true;
    }
    active = true;
    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });
    try {
      const review = validateReview(await readBody(req));
      const text =
        review.mode === "codex"
          ? await codex(review, { signal: controller.signal })
          : await api(review, apiKeyFrom(req.headers), {
              signal: controller.signal,
            });
      sendJson(res, 200, {
        text,
        provider: review.mode === "codex" ? "Codex CLI" : "OpenAI API",
        model: review.model || "CLI 默认模型",
      });
    } catch (e) {
      sendJson(res, e instanceof CoachError ? e.status : 500, {
        error: e instanceof CoachError ? e.message : "点评服务暂时不可用",
      });
    } finally {
      active = false;
    }
    return true;
  };
}
