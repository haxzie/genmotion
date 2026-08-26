import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { ProjectSession } from "../project-session";
import { GENMOTION_TOOLS, toMcpContent } from "./tools";

/**
 * The GenMotion tools, served as a streamable-HTTP MCP server.
 *
 * Claude Code takes them in-process through the Agent SDK. Codex has no such
 * hook — it only connects to MCP servers over stdio or HTTP — and the tools
 * can't be moved out of process anyway: `validate_scene` compiles against the
 * live incremental bundler that the editor's preview shares. So the app's own
 * loopback server hosts them, and Codex is pointed at that URL.
 *
 * Only the request/response half of the transport is implemented. These tools
 * never push notifications or stream progress, so there is nothing for a GET
 * event stream to carry, and every call answers with a plain JSON body — which
 * the spec allows in place of SSE.
 */

/** Newest spec revision we implement; older clients keep their own version. */
const PROTOCOL_VERSION = "2025-06-18";

const SUPPORTED = new Set(["2025-06-18", "2025-03-26", "2024-11-05"]);

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

/**
 * A bearer token for the MCP endpoint, minted per launch.
 *
 * The rest of the local server hides behind a secret path prefix, but this URL
 * is handed to a child process, which puts it in that process's argument list
 * where any local user can read it. The token travels separately, through the
 * environment, so seeing the URL is not enough to call the tools.
 */
export const MCP_TOKEN = randomBytes(24).toString("base64url");

/** The env var Codex is told to read the bearer token from. */
export const MCP_TOKEN_ENV = "GENMOTION_MCP_TOKEN";

function ok(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

function fail(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

/** Zod shape → the JSON Schema an MCP client validates arguments against. */
function inputSchema(shape: z.ZodRawShape): Record<string, unknown> {
  const schema = z.toJSONSchema(z.object(shape), { io: "input" }) as Record<string, unknown>;
  // `$schema` is noise here: the field is declared as a schema already, and
  // some clients reject the extra key.
  delete schema.$schema;
  return schema;
}

/**
 * Handle one JSON-RPC message.
 *
 * Returns `null` for a notification, which has no reply — the caller answers
 * with a bare 202.
 */
export async function handleMcpMessage(
  session: ProjectSession,
  message: unknown,
): Promise<object | null> {
  const request = (message ?? {}) as JsonRpcRequest;
  const { id, method } = request;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize": {
      const asked = request.params?.protocolVersion;
      const version = typeof asked === "string" && SUPPORTED.has(asked) ? asked : PROTOCOL_VERSION;
      return ok(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "genmotion", version: "0.1.0" },
      });
    }

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, {
        tools: GENMOTION_TOOLS.map((spec) => ({
          name: spec.name,
          description: spec.description,
          inputSchema: inputSchema(spec.shape),
          ...(spec.readOnly ? { annotations: { readOnlyHint: true } } : {}),
        })),
      });

    case "tools/call": {
      const name = request.params?.name;
      const spec = GENMOTION_TOOLS.find((t) => t.name === name);
      if (!spec) return fail(id, -32602, `Unknown tool: ${String(name)}`);

      const args = (request.params?.arguments ?? {}) as Record<string, never>;
      try {
        const parsed = z.object(spec.shape).parse(args) as Record<string, never>;
        return ok(id, toMcpContent(await spec.run(session, parsed)));
      } catch (err) {
        // A thrown tool is still a *result* in MCP — reporting it as a protocol
        // error would abort the turn instead of letting the model correct itself.
        return ok(
          id,
          toMcpContent({
            text: err instanceof Error ? err.message : String(err),
            isError: true,
          }),
        );
      }
    }

    default:
      if (isNotification) return null;
      return fail(id, -32601, `Method not found: ${String(method)}`);
  }
}
