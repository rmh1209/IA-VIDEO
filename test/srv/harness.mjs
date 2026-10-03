// Lance le vrai serveur (wrangler dev, moteur workerd de Cloudflare) branché sur le faux Claude et le faux Stripe
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startMocks } from "../mocks.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SERVER = path.join(HERE, "..", "..", "server");
export const BASE = "http://127.0.0.1:8794";

export async function startStack({ quiet = true } = {}) {
  const mocks = await startMocks();
  const state = path.join(HERE, "state");
  rmSync(state, { recursive: true, force: true });
  const proc = spawn(path.join(SERVER, "node_modules", ".bin", "wrangler"), ["dev", "--port", "8794", "--ip", "127.0.0.1", "--persist-to", state, "--env-file", path.join(HERE, "test.env"), "--show-interactive-dev-session=false"],
    { cwd: SERVER, env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" }, stdio: ["ignore", "pipe", "pipe"] });
  const logs = [];
  await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error("wrangler dev ne démarre pas :\n" + logs.join(""))), 60000);
    const on = d => { const s = String(d); logs.push(s); if (!quiet) process.stdout.write(s); if (s.includes("Ready on")) { clearTimeout(t); ok(); } };
    proc.stdout.on("data", on); proc.stderr.on("data", on);
    proc.on("exit", c => { clearTimeout(t); ko(new Error("wrangler dev arrêté (" + c + ")\n" + logs.join(""))); });
  });
  return {
    mocks, logs,
    stop: () => new Promise(ok => { proc.removeAllListeners("exit"); proc.on("exit", () => ok()); proc.kill("SIGTERM"); setTimeout(() => { proc.kill("SIGKILL"); ok(); }, 3000); mocks.close(); })
  };
}

/* appel au coach : lit le flux NDJSON jusqu'au bout */
export async function ask(body, headers = {}) {
  const res = await fetch(BASE + "/api/coach", { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE, ...headers }, body: JSON.stringify(body) });
  if (!(res.headers.get("content-type") || "").includes("ndjson")) return { status: res.status, json: await res.json().catch(() => null) };
  const events = (await res.text()).split("\n").filter(Boolean).map(l => JSON.parse(l));
  return { status: res.status, events, text: events.filter(e => e.t === "text").map(e => e.d).join(""), done: events.find(e => e.t === "done"), error: events.find(e => e.t === "error") };
}
export async function post(p, body, headers = {}) {
  const res = await fetch(BASE + p, { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE, ...headers }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null) };
}
