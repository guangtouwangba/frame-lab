import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoachError, reviewPrompt } from "./coach.js";

export function codexArgs(dir, model = "") {
  return [
    "-a",
    "never",
    "exec",
    "--ignore-user-config",
    "--ephemeral",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--disable",
    "shell_tool",
    "-c",
    'web_search="disabled"',
    "-C",
    dir,
    "--image",
    join(dir, "photo.jpg"),
    "--output-last-message",
    join(dir, "review.txt"),
    ...(model ? ["--model", model] : []),
    "-",
  ];
}
export async function critiqueWithCodex(
  review,
  { signal, spawnProcess = spawn, timeout = 120_000 } = {},
) {
  const dir = await mkdtemp(join(tmpdir(), "frame-lab-review-"));
  try {
    await writeFile(
      join(dir, "photo.jpg"),
      Buffer.from(review.image.split(",")[1], "base64"),
      { mode: 0o600 },
    );
    await new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new CoachError("点评已取消", 499));
      const child = spawnProcess("codex", codexArgs(dir, review.model), {
        cwd: dir,
        stdio: ["pipe", "ignore", "pipe"],
        shell: false,
        detached: process.platform !== "win32",
      });
      let failed = false,
        timer,
        killTimer;
      const stop = () => {
        failed = true;
        const kill = (sig) => {
          try {
            process.platform === "win32"
              ? child.kill(sig)
              : process.kill(-child.pid, sig);
          } catch {}
        };
        kill("SIGTERM");
        killTimer = setTimeout(() => kill("SIGKILL"), 1500);
        killTimer.unref();
      };
      const onAbort = () => stop();
      signal?.addEventListener("abort", onAbort, { once: true });
      timer = setTimeout(stop, timeout);
      // Drain without retaining/logging CLI output, which can contain account details.
      child.stderr.on("data", () => {});
      child.stdin.on("error", () => {});
      const cleanup = () => {
        clearTimeout(timer);
        clearTimeout(killTimer);
        signal?.removeEventListener("abort", onAbort);
      };
      child.on("error", () => {
        cleanup();
        reject(
          new CoachError("无法启动 Codex CLI。请安装新版 CLI 并完成登录", 503),
        );
      });
      child.on("close", (code) => {
        cleanup();
        if (failed)
          return reject(
            new CoachError(
              signal?.aborted ? "点评已取消" : "Codex 点评超时，请重试",
              504,
            ),
          );
        if (code !== 0)
          return reject(
            new CoachError(
              "Codex 未完成点评。请检查 CLI 登录、额度和版本；不会自动改用其他账户",
              502,
            ),
          );
        resolve();
      });
      child.stdin.end(reviewPrompt(review));
    });
    const text = (await readFile(join(dir, "review.txt"), "utf8")).trim();
    if (!text) throw new CoachError("Codex 未返回有效点评", 502);
    return text.slice(0, 12000);
  } finally {
    // Only a freshly created, task-owned temp directory is removed.
    await rm(dir, { recursive: true, force: true });
  }
}
