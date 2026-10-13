import { useState } from "react";
import {
  apiKeyHeader,
  catalogEntryToInput,
  mainDomain,
  type McpCatalogEntry,
  type McpServerView,
} from "@genmotion/shared";
import { api } from "@/lib/api";
import { Button, Spinner, cx } from "@/components/ui";
import type { ServerModalSubmit } from "./server-modal";

/**
 * What a plugin is, before you let it in.
 *
 * The row used to connect on a click of its `+`, which asked someone to agree
 * to a thing they had read eleven truncated words about. This is the page in
 * between: what it does, what signing in actually involves, what the agent
 * ends up holding, and then the one button. A plugin that wants a pasted key
 * asks for it here too — the field belongs beside the sentence explaining
 * where the key goes, not in a second dialog after this one.
 *
 * Three sections, hairline-divided inside one inset panel. The panel is what
 * keeps it from reading as a form: the prose is a block you scan down, and the
 * only thing outside it is the button.
 */

function LaunchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-5 py-4 last:border-b-0">
      <h3 className="text-[0.95rem] font-medium text-text-primary">{title}</h3>
      <div className="mt-1 text-[0.893rem] leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

/** How the connection is made, in the words of the thing about to happen. */
function howItConnects(entry: McpCatalogEntry): string {
  switch (entry.auth.kind) {
    case "oauth":
      return `You sign in to ${entry.name} in your browser, and it hands GenMotion a token for your account. GenMotion never sees your password, and the token is stored encrypted on this machine.`;
    case "header":
      return `${entry.name} takes an API key. It is stored encrypted on this machine and sent to ${entry.name} and nowhere else.`;
    default:
      return `No account needed. ${entry.name} is a public server, so nothing of yours is sent to sign in.`;
  }
}

export function PluginDetail({
  entry,
  server,
  onConnect,
  onSubmit,
  onAuthenticate,
  onManage,
  onClose,
  pending,
  error,
}: {
  entry: McpCatalogEntry;
  /** The row this entry already has, if it is installed. */
  server: McpServerView | null;
  /** For an entry that signs in or needs nothing: do it, and close. */
  onConnect: (entry: McpCatalogEntry) => void;
  /** For an entry that takes a pasted key: the key, as a new server. */
  onSubmit: (input: ServerModalSubmit) => void;
  onAuthenticate: (server: McpServerView) => void;
  /** Installed already: the way through to the row that manages it. */
  onManage?: () => void;
  onClose: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [apiKey, setApiKey] = useState("");
  const keyAuth = entry.auth.kind === "header" ? entry.auth : null;
  // A key is asked for only when there is not already one stored. Replacing a
  // stored key is Edit's job, on the Installed tab, where the row it belongs
  // to is the thing being changed.
  const asksForKey = Boolean(keyAuth) && !server;
  // From the server URL, not the homepage: this line is saying who you are
  // about to be talking to, and a vendor's docs can live anywhere (Freepik
  // documents its server on pulsemcp.com, DeepWiki's on docs.devin.ai).
  const vendor = (() => {
    try {
      return entry.url ? mainDomain(new URL(entry.url).hostname) : null;
    } catch {
      return null;
    }
  })();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (server) {
      if (server.status === "needs-auth") onAuthenticate(server);
      else onManage?.();
      onClose();
      return;
    }
    if (keyAuth) {
      onSubmit({ ...catalogEntryToInput(entry), headers: apiKeyHeader(keyAuth, apiKey) });
      return;
    }
    onConnect(entry);
    onClose();
  }

  const action = server
    ? server.status === "needs-auth"
      ? `Sign in to ${entry.name}`
      : "Manage in Installed"
    : `Connect ${entry.name}`;
  // Already added and healthy: the button is a way through to its row, not a
  // second Connect, so nothing here is ever a dead end.
  const canSubmit = server ? true : !asksForKey || apiKey.trim().length > 0;

  return (
    <form onSubmit={submit} className="p-6">
      <ConnectionMarks name={entry.name} iconUrl={entry.iconUrl} />
      <h2 id="mcp-server-title" className="text-center font-display text-xl font-semibold tracking-tight">
        {server ? entry.name : `Connect ${entry.name}`}
      </h2>
      <p className="mt-1 text-center text-[0.893rem] text-text-tertiary">
        {entry.category}
        {vendor && ` · ${vendor}`}
      </p>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface-raised">
        <Section title="What it does">{entry.description}</Section>
        <Section title="How it connects">
          {howItConnects(entry)}
          {asksForKey && keyAuth && (
            <div className="mt-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste the key"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className={cx(
                  "h-10 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[0.857rem]",
                  "text-text-primary placeholder:text-text-tertiary transition-colors duration-150 outline-none",
                  "focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
                )}
              />
              <p className="mt-2 text-[0.786rem] leading-snug text-text-tertiary">
                {keyAuth.hint}
                {keyAuth.tokenUrl && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() =>
                        void api(`/api/mcp-catalog/${encodeURIComponent(entry.id)}/token-link`, { method: "POST" })
                      }
                      className="text-accent hover:underline"
                    >
                      Create one ↗
                    </button>
                  </>
                )}
              </p>
            </div>
          )}
        </Section>
        <Section title="What the agent gets">
          Every tool {entry.name} offers, named{" "}
          <code className="font-mono text-[0.821rem] text-text-primary">mcp__{entry.id}__*</code>. It can use them in
          any project on this machine. Turn it off or remove it from Installed at any time.
        </Section>
      </div>

      {error && <p className="mt-3 text-[0.857rem] text-danger">{error}</p>}

      <div className="mt-5 flex flex-col gap-2">
        <Button
          type="submit"
          variant={server && server.status !== "needs-auth" ? "secondary" : "primary"}
          disabled={pending || !canSubmit}
          className="h-10 w-full"
        >
          {pending && <Spinner className="size-3.5 text-background" />}
          {action}
        </Button>
        <button
          type="button"
          onClick={() => void api(`/api/mcp-catalog/${encodeURIComponent(entry.id)}/homepage-link`, { method: "POST" })}
          className="inline-flex items-center justify-center gap-1.5 text-[0.857rem] text-text-tertiary transition-colors hover:text-text-primary"
        >
          {entry.name} documentation
          <LaunchIcon className="size-3.5" />
        </button>
      </div>
    </form>
  );
}

/**
 * The two parties to the connection, as a pair of marks.
 *
 * GenMotion's tile and the vendor's, leaning into each other and overlapping —
 * the shape of the thing the dialog is about to do, said before the sentence
 * under it says it. The vendor's sits on top because it is the one the user
 * picked; GenMotion's is the constant and gives way.
 *
 * `rounded-[28%]` is the squircle the login screen's mark already uses, so an
 * app icon lands in the same silhouette everywhere it is framed.
 */
export function ConnectionMarks({ name, iconUrl }: { name: string; iconUrl: string }) {
  const tile =
    "flex size-14 items-center justify-center overflow-hidden rounded-[28%] shadow-[0_8px_24px_rgba(0,0,0,0.45)]";
  return (
    <div className="mb-5 flex items-center justify-center" aria-hidden>
      <span className={cx(tile, "-rotate-[7deg] border border-border bg-surface-raised")}>
        <img src="/logo.svg" alt="" className="size-7" />
      </span>
      {/* Over GenMotion's corner and lifted above it, with a cut of the
          dialog's own background ringing it — without that the two tiles
          merge into one shape at a glance, and the overlap stops reading as
          two things meeting. */}
      <span
        className={cx(
          tile,
          "relative z-10 -ml-3 rotate-[7deg] bg-surface",
          "shadow-[0_0_0_4px_var(--color-surface),0_8px_24px_rgba(0,0,0,0.45)]",
        )}
        title={name}
      >
        <img src={iconUrl} alt="" className="size-full object-cover" />
      </span>
    </div>
  );
}
