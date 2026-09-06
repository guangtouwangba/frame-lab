import { sendJson } from "../server/coach.js";
export default function handler(req, res) {
  if (req.method !== "GET")
    return sendJson(res, 405, { error: "只接受 GET 请求" });
  sendJson(res, 200, { api: true, codex: false, local: false });
}
