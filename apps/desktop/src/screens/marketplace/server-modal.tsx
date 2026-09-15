import { useEffect, useState } from "react";
import {
  apiKeyHeader,
  catalogEntryToInput,
  type McpCatalogEntry,
  type McpServerInput,
  type McpServerPatch,
  type McpServerView,
  type McpTransport,
} from "@genmotion/shared";
import { Modal } from "@/components/modal";
import { api } from "@/lib/api";
import { Button, Input, Spinner, cx } from "@/components/ui";
import { Choices } from "../settings/section";

/**
 * One form, three jobs.
 *
 * `add` is the blank form behind "New MCP Server". `edit` is the same form
 * over an existing server — with the twist that the renderer never has its
 * secrets, so a header the user does not touch is left as it is. `token` is
 * the short version a marketplace card opens when its server wants a pasted
 * key: name and URL are already known, only the token is asked for.
 */
/** What the form hands back: a new server, or a patch with the id it is for. */
export type ServerModalSubmit = McpServerInput | ({ id: string } & McpServerPatch);

export type ServerModalMode =
  | { kind: "add" }
  | {
      kind: "edit";
      server: McpServerView;
      /** For a server from the marketplace: its entry, so the form stays a key field. */
      entry?: McpCatalogEntry;
    }
  | { kind: "token"; entry: McpCatalogEntry };

interface KeyValue {
  key: string;
  value: string;
  /** Set on an existing server's header: the value is kept unless replaced. */
  kept?: boolean;
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function KeyValueRows({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  addLabel,
}: {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  addLabel: string;
}) {
  const set = (index: number, patch: Partial<KeyValue>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch, kept: false } : row)));
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <Input
            value={row.key}
            placeholder={keyPlaceholder}
            onChange={(e) => set(index, { key: e.target.value })}
            className="h-9 flex-1 font-mono text-[0.857rem]"
          />
          <Input
            type="password"
            value={row.value}
            placeholder={row.kept ? "•••••••• (kept)" : valuePlaceholder}
            onChange={(e) => set(index, { value: e.target.value })}
            className="h-9 flex-[1.4] font-mono text-[0.857rem]"
          />
          <button
            type="button"
            aria-label="Remove"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
          >
            <CloseIcon className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { key: "", value: "" }])}
        className="self-start text-[0.857rem] text-text-secondary hover:text-text-primary"
      >
        + {addLabel}
      </button>
    </div>
  );
}

/** Split a typed argument line the way a shell would, quotes included. */
function splitArgs(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) out.push(match[1] ?? match[2] ?? match[3] ?? "");
  return out;
}

function joinArgs(args: string[]): string {
  return args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ");
}

export function McpServerModal({
  mode,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  mode: ServerModalMode | null;
  onClose: () => void;
  /** An add (or a marketplace token) is an `McpServerInput`; an edit is a patch with its id. */
  onSubmit: (input: ServerModalSubmit) => void;
  pending: boolean;
  error: string | null;
}) {
  const open = mode !== null;
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<McpTransport>("http");
  const [url, setUrl] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  /** Token mode only: the one thing asked for. The header is built from it. */
  const [apiKey, setApiKey] = useState("");
  const [env, setEnv] = useState<KeyValue[]>([]);

  // Seed from the mode each time it opens; the form is not kept between uses.
  useEffect(() => {
    if (!mode) return;
    if (mode.kind === "add") {
      setName("");
      setTransport("http");
      setUrl("");
      setCommand("");
      setArgs("");
      setHeaders([]);
      setEnv([]);
    } else if (mode.kind === "edit") {
      const s = mode.server;
      setName(s.name);
      setTransport(s.transport);
      setUrl(s.url ?? "");
      setCommand(s.command ?? "");
      setArgs(joinArgs(s.args ?? []));
      setHeaders((s.secretHeaderNames ?? []).map((key) => ({ key, value: "", kept: true })));
      setEnv((s.secretEnvNames ?? []).map((key) => ({ key, value: "", kept: true })));
    } else {
      const e = mode.entry;
      setName(e.name);
      setTransport(e.transport);
      setUrl(e.url ?? "");
      setCommand(e.command ?? "");
      setArgs(joinArgs(e.args ?? []));
      setHeaders([]);
      setApiKey("");
      setEnv([]);
    }
  }, [mode]);

  if (!mode) return null;

  const tokenMode = mode.kind === "token";
  // A marketplace server is ours to configure: the user never sees headers,
  // transport or URL for it — only the key, when it takes one.
  const managed = mode.kind === "edit" ? mode.entry : mode.kind === "token" ? mode.entry : undefined;
  const keyAuth = managed?.auth.kind === "header" ? managed.auth : null;
  const title =
    mode.kind === "add" ? "New MCP server" : mode.kind === "edit" ? `Edit ${mode.server.name}` : `Connect ${mode.entry.name}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    const base = {
      name,
      transport,
      ...(transport === "http" ? { url } : { command, args: splitArgs(args) }),
    };
    if (mode!.kind === "edit" && managed) {
      // Only the key can change. Empty means "keep what's stored" — the
      // renderer never had the old value to show.
      const headers = keyAuth
        ? apiKey.trim()
          ? apiKeyHeader(keyAuth, apiKey)
          : Object.fromEntries((mode!.server.secretHeaderNames ?? []).map((k) => [k, null]))
        : undefined;
      onSubmit({ id: mode!.server.id, ...(headers ? { headers } : {}) });
      return;
    }
    if (mode!.kind === "edit") {
      // The whole set travels; a kept row goes as `null`, which the main
      // process reads as "leave that one alone" (see `McpServerPatch`).
      const keep = (rows: KeyValue[]) =>
        Object.fromEntries(
          rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.kept && !r.value ? null : r.value]),
        );
      onSubmit({ id: mode!.server.id, ...base, headers: keep(headers), env: keep(env) });
      return;
    }
    const fresh = (rows: KeyValue[]) =>
      Object.fromEntries(rows.filter((r) => r.key.trim() && r.value).map((r) => [r.key.trim(), r.value]));
    if (mode!.kind === "token") {
      const entry = mode!.entry;
      const headers = entry.auth.kind === "header" ? apiKeyHeader(entry.auth, apiKey) : {};
      onSubmit({ ...catalogEntryToInput(entry), ...base, headers });
      return;
    }
    onSubmit({ ...base, headers: fresh(headers), env: fresh(env) });
  }

  const label = "mb-1.5 mt-4 block text-[0.857rem] text-text-secondary";
  const canSubmit =
    name.trim().length > 0 &&
    (transport === "http" ? url.trim().length > 0 : command.trim().length > 0) &&
    (!tokenMode || apiKey.trim().length > 0) &&
    // Editing a managed server without a key field has nothing to save.
    !(mode.kind === "edit" && managed && !keyAuth);

  return (
    <Modal open={open} onClose={onClose} labelledBy="mcp-server-title" dismissible={!pending}>
      <form onSubmit={submit} className="p-6">
        <h2 id="mcp-server-title" className="font-display text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {managed ? (
          <p className="mt-1 text-[0.9rem] text-text-secondary">
            {keyAuth
              ? `${managed.name} needs an API key. It's kept encrypted on this machine and sent only to ${managed.name}.`
              : `${managed.name} is set up from the marketplace; there's nothing to change here. Use Authenticate on its row to sign in again.`}
          </p>
        ) : (
          <p className="mt-1 text-[0.9rem] text-text-secondary">
            The agent gets every tool the server offers. Its name becomes the tool
            prefix, so keep it short.
          </p>
        )}

        {!managed && (
          <>
            <label className={label}>Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Linear"
              autoFocus
              className="h-9"
            />

            <label className={label}>Connect over</label>
            <Choices
              options={["http", "stdio"] as McpTransport[]}
              isActive={(t) => t === transport}
              onPick={setTransport}
              label={(t) => (t === "http" ? "URL" : "Command")}
            />
          </>
        )}

        {managed ? (
          keyAuth && (
            <>
              <label className={label}>API key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={mode.kind === "edit" && mode.server.hasSecrets ? "•••••••• set — paste a new key to replace it" : "Paste the key"}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="h-9 font-mono text-[0.857rem]"
              />
              <p className="mt-2 text-[0.786rem] leading-snug text-text-tertiary">
                {keyAuth.hint}
                {keyAuth.tokenUrl && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() =>
                        void api(`/api/mcp-catalog/${encodeURIComponent(managed.id)}/token-link`, { method: "POST" })
                      }
                      className="text-accent hover:underline"
                    >
                      Create one ↗
                    </button>
                  </>
                )}
              </p>
            </>
          )
        ) : transport === "http" ? (
          <>
            {!tokenMode && (
              <>
                <label className={label}>URL</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://mcp.example.com/mcp"
                  className="h-9 font-mono text-[0.857rem]"
                />
              </>
            )}
            <label className={label}>Headers</label>
            <KeyValueRows
              rows={headers}
              onChange={setHeaders}
              keyPlaceholder="Authorization"
              valuePlaceholder="Bearer …"
              addLabel="Add header"
            />
            {!tokenMode && (
              <p className="mt-2 text-[0.786rem] leading-snug text-text-tertiary">
                Leave empty for a server that signs you in through the browser — you can
                authenticate once it&rsquo;s added.
              </p>
            )}
          </>
        ) : (
          <>
            <label className={label}>Command</label>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="npx"
              className="h-9 font-mono text-[0.857rem]"
            />
            <label className={label}>Arguments</label>
            <Input
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="-y @modelcontextprotocol/server-filesystem ~/Documents"
              className="h-9 font-mono text-[0.857rem]"
            />
            <label className={label}>Environment</label>
            <KeyValueRows
              rows={env}
              onChange={setEnv}
              keyPlaceholder="API_KEY"
              valuePlaceholder="value"
              addLabel="Add variable"
            />
          </>
        )}

        {error && <p className="mt-3 text-[0.857rem] text-danger">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending} className="h-9">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending || !canSubmit} className={cx("h-9")}>
            {pending && <Spinner className="size-3.5 text-background" />}
            {mode.kind === "edit" ? "Save" : "Connect"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
