export function createCoach() {
  const $ = (id) => document.getElementById(id);
  let shot = null,
    request = null,
    capabilities = null;
  const result = $("coach-result"),
    status = $("coach-status"),
    run = $("coach-run");
  const capabilityPromise = fetch("/api/capabilities", {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((c) => {
      capabilities = c;
      $("coach-codex-option").disabled = !c?.codex;
      $("coach-local-note").textContent = c?.codex
        ? "本机服务已连接。Codex CLI 使用你在本机的登录；通常仍会向其模型服务发送图片。"
        : "在线版仅支持 API key。本地 CLI：下载仓库后运行 npm ci、npm run build、npm start，在打印的 localhost 地址使用。Python 静态启动器不支持 AI。";
      if (!c?.api)
        status.textContent =
          "AI 服务尚未连接。请用 Node 本地服务或已部署的 Vercel 网站打开。";
    });
  function modeChanged() {
    const cli = $("coach-mode").value === "codex";
    $("coach-key-field").hidden = cli;
    $("coach-model").value = cli ? "" : "gpt-4.1-mini";
    $("coach-model").placeholder = cli
      ? "留空使用 Codex 默认模型"
      : "支持图片输入的模型 ID";
    $("coach-consent").checked = false;
  }
  $("coach-mode").onchange = modeChanged;
  $("coach-clear-key").onclick = () => {
    $("coach-key").value = "";
    status.textContent = "API key 已从页面清除";
  };
  function cancel() {
    if (request) {
      request.abort();
      request = null;
    }
    run.disabled = false;
    $("coach-cancel").hidden = true;
  }
  $("coach-cancel").onclick = () => {
    cancel();
    status.textContent = "已取消等待；已发送的请求仍可能产生费用。";
  };
  $("photo-dialog").addEventListener("close", cancel);
  function showSaved() {
    result.textContent = shot?.critique?.text || "";
    result.hidden = !shot?.critique;
    status.textContent = shot?.critique
      ? `${shot.critique.provider} · ${shot.critique.model} · ${shot.critique.time} · AI 建议供参考`
      : "尚未发送照片。填写连接信息并确认后，才会请求点评。";
  }
  async function imageForReview(blob) {
    const bitmap = await createImageBitmap(blob),
      canvas = document.createElement("canvas");
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.86);
  }
  run.onclick = async () => {
    if (request || !shot) return;
    await capabilityPromise;
    if (request || !shot) return;
    if (!capabilities?.api) {
      status.textContent =
        "AI 服务未连接，请使用 npm start 启动，或打开正式网站。";
      return;
    }
    const mode = $("coach-mode").value;
    if (mode === "codex" && !capabilities.codex) {
      status.textContent = "当前站点不能调用本机 Codex CLI";
      return;
    }
    if (!$("coach-consent").checked) {
      status.textContent = "请先勾选确认发送这张照片和拍摄参数。";
      return;
    }
    const key = $("coach-key").value.trim(),
      model = $("coach-model").value.trim();
    if (mode === "api" && (!key || !model)) {
      status.textContent = "请填写你的 API key 和图像模型名称。";
      return;
    }
    const target = shot,
      controller = new AbortController();
    request = controller;
    run.disabled = true;
    $("coach-cancel").hidden = false;
    $("coach-consent").checked = false;
    status.textContent = "正在分析这张照片… 可以取消等待。";
    const timer = setTimeout(
      () => controller.abort(),
      mode === "codex" ? 130000 : 60000,
    );
    try {
      const image = await imageForReview(target.blob);
      if (controller.signal.aborted) throw new Error("点评已取消");
      const headers = { "Content-Type": "application/json" };
      if (mode === "api") headers.Authorization = "Bearer " + key;
      if (capabilities.token) headers["X-Frame-Token"] = capabilities.token;
      const response = await fetch("/api/critique", {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          model,
          image,
          state: target.state,
          goal: $("coach-goal").value,
          consent: true,
        }),
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("AI 服务返回异常，请检查部署是否包含 API 接口。");
      }
      if (!response.ok) throw new Error(data.error || "点评失败，请稍后重试");
      if (typeof data.text !== "string" || !data.text.trim())
        throw new Error("AI 没有返回有效点评");
      // Store only review text and public model metadata, never credentials or the request.
      target.critique = {
        text: data.text.slice(0, 12000),
        provider: data.provider,
        model: data.model,
        time: new Date().toLocaleTimeString("zh-CN"),
      };
      if (request === controller && shot === target) showSaved();
    } catch (e) {
      if (request === controller && shot === target)
        status.textContent = controller.signal.aborted
          ? "等待已取消或超时；已发送请求仍可能产生费用。"
          : e.message;
    } finally {
      clearTimeout(timer);
      if (request === controller) {
        request = null;
        run.disabled = false;
        $("coach-cancel").hidden = true;
      }
    }
  };
  return {
    setPhoto(value) {
      cancel();
      shot = value;
      $("coach-consent").checked = false;
      showSaved();
    },
  };
}
