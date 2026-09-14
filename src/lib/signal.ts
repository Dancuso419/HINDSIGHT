/**
 * Server-side client for the bitget-signal research Skills, which are served as a public
 * MCP endpoint over streamable HTTP. Plain fetch + JSON-RPC — no SDK.
 *
 * Read-only by construction: this module only ever sends `initialize`,
 * `notifications/initialized` and `tools/call` for data tools.
 */

const ENDPOINT = process.env.BITGET_SIGNAL_URL ?? "https://datahub.noxiaohao.com/mcp";
const PROTOCOL = "2025-06-18";

let session: { id: string; at: number } | null = null;
let rpcId = 0;

/**
 * While a Skill is failing, stop waiting on it: after a failure, calls to that tool fail fast
 * for COOLDOWN_MS, then the next request tries it again. Recovery needs no action.
 * Per tool, because outages are partial: on 2026-09-14 technical_analysis answered while
 * every historical lookup timed out upstream — one shared breaker would have blocked it.
 */
const COOLDOWN_MS = 3 * 60_000;
const failedAt = new Map<string, number>();

export const skillCoolingDown = (key: string) => Date.now() - (failedAt.get(key) ?? 0) < COOLDOWN_MS;

/** Responses arrive either as JSON or as a single SSE `data:` frame. */
async function readRpc(res: Response): Promise<unknown> {
  const text = await res.text();
  const body = res.headers.get("content-type")?.includes("text/event-stream")
    ? text
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .pop() ?? ""
    : text;
  if (!body) return null;
  const msg = JSON.parse(body) as { result?: unknown; error?: { message: string } };
  if (msg.error) throw new Error(`bitget-signal: ${msg.error.message}`);
  return msg.result;
}

const headers = (sid?: string) => ({
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  "mcp-protocol-version": PROTOCOL,
  ...(sid ? { "mcp-session-id": sid } : {}),
});

async function openSession(): Promise<string> {
  // ponytail: one session reused for 10 minutes per server instance; re-open on expiry.
  if (session && Date.now() - session.at < 10 * 60_000) return session.id;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "initialize",
      params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: "hindsight", version: "1.0" } },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`bitget-signal initialize failed: ${res.status}`);
  await readRpc(res);
  const id = res.headers.get("mcp-session-id");
  if (!id) throw new Error("bitget-signal returned no session id");

  await fetch(ENDPOINT, {
    method: "POST",
    headers: headers(id),
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    signal: AbortSignal.timeout(10_000),
  });

  session = { id, at: Date.now() };
  return id;
}

type ToolResult = { content?: { type: string; text?: string }[]; isError?: boolean };

/** Call one Skill tool and return its text payload parsed as JSON when possible. */
export async function callSkill<T = unknown>(
  tool: string,
  args: Record<string, unknown>,
  /** Narrow the breaker when a failure means "no data for this input", not "tool is down". */
  breakerKey = tool,
): Promise<T> {
  if (skillCoolingDown(breakerKey)) throw new Error(`bitget-signal ${breakerKey} is cooling down after a recent failure`);
  try {
    return await callSkillOnce<T>(tool, args);
  } catch (e) {
    failedAt.set(breakerKey, Date.now());
    throw e;
  }
}

/** A Skill whose upstream failed answers with an empty error object rather than an error. */
const isEmptyError = (v: unknown) =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 1 && /error/i.test(Object.keys(v)[0]);

/** One call with no cooldown — for health probes, never for the request path. */
export async function callSkillOnce<T>(tool: string, args: Record<string, unknown>): Promise<T> {
  const attempt = async () => {
    const sid = await openSession();
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: headers(sid),
      body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name: tool, arguments: args } }),
      signal: AbortSignal.timeout(45_000),
    });
    if (res.status === 404 || res.status === 400) {
      session = null; // session expired on the server
      throw new Error(`session:${res.status}`);
    }
    if (!res.ok) throw new Error(`bitget-signal ${tool} failed: ${res.status}`);
    return (await readRpc(res)) as ToolResult;
  };

  let result: ToolResult;
  try {
    result = await attempt();
  } catch (e) {
    if (!(e instanceof Error) || !e.message.startsWith("session:")) throw e;
    result = await attempt();
  }

  const text = result?.content?.find((c) => c.type === "text")?.text ?? "";
  if (result?.isError) throw new Error(`bitget-signal ${tool}: ${text.slice(0, 200)}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  if (isEmptyError(parsed)) throw new Error(`bitget-signal ${tool}: upstream returned an empty error`);
  return parsed as T;
}
