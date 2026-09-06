import {
  CoachError,
  readBody,
  validateReview,
  apiKeyFrom,
  critiqueWithApi,
  sendJson,
} from "../server/coach.js";
export default async function handler(req, res) {
  if (req.method !== "POST")
    return sendJson(res, 405, { error: "只接受 POST 请求" });
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  try {
    const key = apiKeyFrom(req.headers);
    const review = validateReview(await readBody(req));
    if (review.mode !== "api")
      throw new CoachError("云端无法运行 Codex CLI，请在本机启动摄影室");
    const text = await critiqueWithApi(review, key, {
      signal: controller.signal,
    });
    sendJson(res, 200, { text, provider: "OpenAI API", model: review.model });
  } catch (e) {
    sendJson(res, e instanceof CoachError ? e.status : 500, {
      error: e instanceof CoachError ? e.message : "点评服务暂时不可用",
    });
  }
}
