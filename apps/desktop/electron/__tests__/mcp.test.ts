import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

/**
 * The MCP manager against a real server.
 *
 * Electron is stubbed to a temp userData folder with no keychain, so the
 * secrets file is written in the clear — which is also what the test wants
 * to read to prove a header never lands in `settings.json`. The server is
 * the SDK's own over streamable HTTP; a bearer-gated variant of it stands in
 * for a catalog entry that wants a token.
 */

const userData = await fs.mkdtemp(path.join(os.tmpdir(), "gm-mcp-test-"));

vi.mock("electron", () => ({
  app: { getPath: () => userData, getVersion: () => "0.0.0-test" },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
  shell: { openExternal: vi.fn() },
}));

const { mcpManager, codexServerId, codexServerName } = await import("../mcp/manager");
const { setCallbackUrl } = await import("../mcp/oauth");
const { readSettings } = await import("../settings-store");

/**
 * One MCP server with two tools, optionally behind a bearer token.
 *
 * `clients` collects the name every connecting client introduced itself
 * with, which is how the catalog's `clientName` override is checked.
 */
function serve(token: string | null): Promise<{ url: string; clients: string[]; close: () => Promise<void> }> {
  const clients: string[] = [];
  const fixture = () => {
    const mcp = new McpServer({ name: "fixture", version: "1.0.0" });
    mcp.registerTool("echo", { description: "Echo the input\nSecond line", inputSchema: { text: z.string() } }, async ({ text }) => ({
      content: [{ type: "text", text }],
    }));
    mcp.registerTool("now", { description: "The time" }, async () => ({
      content: [{ type: "text", text: new Date().toISOString() }],
    }));
    return mcp;
  };

  const server = http.createServer(async (req, res) => {
    if (token && req.headers.authorization !== `Bearer ${token}`) {
      res.writeHead(401, { "www-authenticate": 'Bearer realm="fixture"' }).end();
      return;
    }
    // Read the body here rather than letting the transport consume the
    // stream: `initialize` carries the client's name, which is what the
    // `clientName` test reads.
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = chunks.length ? (JSON.parse(Buffer.concat(chunks).toString()) as unknown) : undefined;
    for (const message of Array.isArray(body) ? body : [body]) {
      const name = (message as { method?: string; params?: { clientInfo?: { name?: string } } } | undefined);
      if (name?.method === "initialize" && name.params?.clientInfo?.name) clients.push(name.params.clientInfo.name);
    }

    // Stateless: every request gets its own server and transport, the way a
    // hosted server behind a load balancer answers a probe.
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => void transport.close());
    await fixture().connect(transport);
    await transport.handleRequest(req, res, body);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${port}/mcp`,
        clients,
        close: () => new Promise((done) => { server.closeAllConnections(); server.close(() => done()); }),
      });
    });
  });
}

let open: Awaited<ReturnType<typeof serve>>;
let gated: Awaited<ReturnType<typeof serve>>;
/** A port that was listening a moment ago and is not now. */
let closedUrl: string;

beforeAll(async () => {
  setCallbackUrl("http://127.0.0.1:1/mcp-oauth/callback");
  open = await serve(null);
  gated = await serve("s3cret");
  const gone = await serve(null);
  closedUrl = gone.url;
  await gone.close();
});

afterAll(async () => {
  await open.close();
  await gated.close();
  await fs.rm(userData, { recursive: true, force: true });
});

afterEach(async () => {
  for (const server of await mcpManager.list()) await mcpManager.remove(server.id);
});

describe("McpManager", () => {
  it("adds a server, probes it, and counts its tools", async () => {
    const added = await mcpManager.add({ name: "Fixture Echo", transport: "http", url: open.url });
    expect(added.id).toBe("fixture-echo");
    expect(added.status).toBe("connecting");

    const view = await mcpManager.refresh(added.id);
    expect(view.status).toBe("connected");
    expect(view.tools.map((t) => t.name).sort()).toEqual(["echo", "now"]);
    // First line only — the card has one line for it.
    expect(view.tools.find((t) => t.name === "echo")?.description).toBe("Echo the input");
  });

  it("introduces itself as the client a catalog entry names", async () => {
    open.clients.length = 0;
    const plain = await mcpManager.add({ name: "Plain", transport: "http", url: open.url });
    await mcpManager.refresh(plain.id);
    expect(open.clients.at(-1)).toBe("genmotion");

    // What Figma's allowlist needs: the harness the server is handed to,
    // carried from the catalog entry through the stored config.
    const named = await mcpManager.add({
      name: "Named",
      transport: "http",
      url: open.url,
      catalogId: "fixture",
      auth: "oauth",
      clientName: "Claude Code",
    });
    expect((await readSettings()).mcpServers?.find((s) => s.id === "named")?.clientName).toBe("Claude Code");
    await mcpManager.refresh(named.id);
    expect(open.clients.at(-1)).toBe("Claude Code");
  });

  it("keeps a header out of settings.json and sends it on the wire", async () => {
    const added = await mcpManager.add({
      name: "Gated",
      transport: "http",
      url: gated.url,
      headers: { Authorization: "Bearer s3cret" },
    });
    const settings = await readSettings();
    expect(JSON.stringify(settings)).not.toContain("s3cret");
    expect(settings.mcpServers?.[0]).toMatchObject({ id: "gated", source: "custom" });

    const view = await mcpManager.refresh(added.id);
    expect(view.status).toBe("connected");
    expect(view.hasSecrets).toBe(true);
    expect(view.secretHeaderNames).toEqual(["Authorization"]);
    expect(view.tools).toHaveLength(2);
  });

  it("reports needs-auth for a server that wants a token it does not have", async () => {
    const added = await mcpManager.add({ name: "Gated", transport: "http", url: gated.url });
    const view = await mcpManager.refresh(added.id);
    expect(view.status).toBe("needs-auth");
    expect(view.tools).toEqual([]);
  });

  it("keeps one row per catalog entry, and leaves custom servers alone", async () => {
    const entry = { name: "Fixture Echo", transport: "http" as const, url: open.url, catalogId: "fixture-echo" };
    const first = await mcpManager.add(entry);
    const second = await mcpManager.add(entry);
    // The second Connect is the same row: a duplicate would be the same
    // account and the same tools under a second `mcp__…__` prefix.
    expect(second.id).toBe(first.id);
    expect((await readSettings()).mcpServers).toHaveLength(1);

    // Two of someone's own servers on one host is a reasonable thing to want.
    await mcpManager.add({ name: "Mine", transport: "http", url: open.url });
    await mcpManager.add({ name: "Mine", transport: "http", url: open.url });
    expect((await readSettings()).mcpServers?.map((s) => s.id)).toEqual([
      "fixture-echo",
      "mine",
      "mine-2",
    ]);
  });

  it("reports an error for a server that is not there", async () => {
    const added = await mcpManager.add({ name: "Gone", transport: "http", url: closedUrl });
    const view = await mcpManager.refresh(added.id);
    expect(view.status).toBe("error");
    expect(view.error).toBe("The server refused the connection.");
  });

  it("hands the harness only what connected, with secrets in the right place", async () => {
    const a = await mcpManager.add({ name: "Fixture", transport: "http", url: open.url });
    const b = await mcpManager.add({
      name: "Gated",
      transport: "http",
      url: gated.url,
      headers: { Authorization: "Bearer s3cret" },
    });
    const c = await mcpManager.add({ name: "Gone", transport: "http", url: closedUrl });
    await Promise.all([a, b, c].map((s) => mcpManager.refresh(s.id)));

    const { claude, codex } = await mcpManager.harnessConfigs();
    expect(Object.keys(claude).sort()).toEqual(["fixture", "gated"]);
    expect(claude.fixture).toEqual({ type: "http", url: open.url });
    expect(claude.gated).toEqual({ type: "http", url: gated.url, headers: { Authorization: "Bearer s3cret" } });

    // Codex: the header value rides in env, and only its variable name is on the command line.
    expect(codex.configLines.join("\n")).not.toContain("s3cret");
    expect(codex.configLines).toContain(`mcp_servers.gated.url="${gated.url}"`);
    expect(codex.configLines.some((l) => l.startsWith("mcp_servers.gated.env_http_headers="))).toBe(true);
    expect(Object.values(codex.env)).toContain("Bearer s3cret");
  });

  it("disables without forgetting", async () => {
    const added = await mcpManager.add({ name: "Fixture", transport: "http", url: open.url });
    await mcpManager.refresh(added.id);
    const off = await mcpManager.update(added.id, { enabled: false });
    expect(off.status).toBe("disabled");
    expect(Object.keys((await mcpManager.harnessConfigs()).claude)).toEqual([]);

    const on = await mcpManager.update(added.id, { enabled: true });
    expect(on.status).toBe("connecting");
    expect((await mcpManager.refresh(added.id)).status).toBe("connected");
  });

  it("keeps a header the edit form left alone, and drops one it removed", async () => {
    const added = await mcpManager.add({
      name: "Gated",
      transport: "http",
      url: gated.url,
      headers: { Authorization: "Bearer s3cret", "X-Extra": "1" },
    });
    const kept = await mcpManager.update(added.id, { headers: { Authorization: null } });
    expect(kept.secretHeaderNames).toEqual(["Authorization"]);
    expect((await mcpManager.refresh(added.id)).status).toBe("connected");

    const cleared = await mcpManager.update(added.id, { headers: {} });
    expect(cleared.hasSecrets).toBe(false);
    expect((await mcpManager.refresh(added.id)).status).toBe("needs-auth");
  });

  it("never lets a server take the app's own name", async () => {
    const added = await mcpManager.add({ name: "genmotion", transport: "http", url: open.url });
    expect(added.id).toBe("genmotion-2");
  });
});

describe("codex server names", () => {
  it("round-trips a dashed id through the underscore Codex needs", () => {
    expect(codexServerName("cloudflare-docs")).toBe("cloudflare_docs");
    expect(codexServerId("cloudflare_docs")).toBe("cloudflare-docs");
  });
});
