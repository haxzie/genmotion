import type { McpCatalogEntry, McpServerView } from "@genmotion/shared";
import { Button, Spinner } from "@/components/ui";
import { useMcpCatalog } from "../../lib/use-mcp-catalog";
import { McpServerModal } from "../../screens/plugins/server-modal";
import { ServerIcon } from "../../screens/plugins/server-icon";
import { useCatalogConnect } from "../../screens/plugins/use-catalog-connect";

/**
 * The agent offering to connect a plugin, as a callout in the chat.
 *
 * `recommend_integration` is the only way an integration gets asked for in
 * words the user is already reading — the Plugins tab answers "what could I
 * connect?", which is a question nobody has in the middle of describing a
 * video. So the card carries the agent's own sentence about what the plugin
 * would do *here*, and the button beside it.
 *
 * It is a callout in the message, not a tool card: `chat-panel` keeps the
 * call out of the accordion and renders this in its place. A Connect button
 * folded inside a collapsed tool row is a button nobody presses, and this is
 * an offer the user is meant to act on, not a record of one.
 *
 * Connect is `useCatalogConnect` — the same hook the Plugins tab and the
 * onboarding walkthrough press, so an OAuth entry opens the browser and a
 * key entry opens the token form, and a sign-in started from the chat lands
 * in exactly the same place. Nothing about the flow is re-implemented here;
 * the sequence is fiddly enough that a second copy would mean fixing it
 * twice.
 *
 * Unlike the takeover card, nothing is parked behind this one: the tool
 * returns at once (an OAuth round trip can take minutes, and a build must
 * never stall on an offer), so the card stays pressable after the turn has
 * moved on. Someone who ignores it and comes back ten minutes later still
 * has a working button.
 */
export default function ConnectCard({
  serverId,
  reason,
}: {
  serverId: string;
  /** The agent's one line on what it would let it do here. */
  reason?: string;
}) {
  const catalog = useMcpCatalog();
  const { servers, connect, busyIds, modal, setModal, submitModal, error, pending } = useCatalogConnect();

  const entry = catalog.data?.entries.find((e) => e.id === serverId);
  if (!entry) {
    return (
      <div className="px-3 py-2.5 text-[0.857rem] text-text-tertiary">
        {catalog.isLoading
          ? "Loading the plugin catalog…"
          : `Couldn’t load ${serverId} from the plugin catalog. It’s in the Plugins tab.`}
      </div>
    );
  }

  const server = (servers.servers ?? []).find((s) => s.catalogId === entry.id) ?? null;
  const busy = busyIds.has(entry.id) || servers.authenticate.isPending;

  return (
    <div className="flex flex-col gap-3 px-3 py-2.5">
      <div className="flex items-start gap-3">
        <ServerIcon name={entry.name} iconUrl={entry.iconUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.857rem] font-medium text-text-primary">{entry.name}</p>
          <p className="mt-0.5 text-[0.786rem] text-text-tertiary">{entry.description}</p>
        </div>
      </div>
      {reason && <p className="text-[0.857rem] text-text-secondary">{reason}</p>}
      <Action entry={entry} server={server} busy={busy} onConnect={() => void connect(entry)} />

      <McpServerModal
        mode={modal}
        onClose={() => setModal(null)}
        onSubmit={submitModal}
        onConnect={(e) => void connect(e)}
        onAuthenticate={(s) => void servers.authenticate.mutateAsync(s.id).catch(() => {})}
        pending={pending}
        error={error}
      />
    </div>
  );
}

/**
 * The one line that changes: what there is to press, and what happened.
 *
 * A server that exists but needs a sign-in is its own case — it is the state
 * an abandoned OAuth round trip leaves behind, and the honest button for it
 * is "Sign in" rather than a Connect that quietly does nothing new.
 */
function Action({
  entry,
  server,
  busy,
  onConnect,
}: {
  entry: McpCatalogEntry;
  server: McpServerView | null;
  busy: boolean;
  onConnect: () => void;
}) {
  if (busy) {
    return (
      <span className="flex items-center gap-2 text-[0.786rem] text-text-tertiary">
        <Spinner className="size-3.5" />
        {entry.auth.kind === "oauth" ? "Finish signing in in your browser…" : "Connecting…"}
      </span>
    );
  }

  if (server && server.enabled && server.status !== "needs-auth" && server.status !== "error") {
    return (
      <span className="text-[0.786rem] text-success">
        Connected. Its tools are ready from your next message.
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="primary" onClick={onConnect}>
        {server?.status === "needs-auth" ? "Sign in" : "Connect"}
      </Button>
      <span className="text-[0.786rem] text-text-tertiary">
        {entry.auth.kind === "oauth"
          ? "Opens your browser to sign in."
          : entry.auth.kind === "header"
            ? "Asks for an API key."
            : "No sign-in needed."}
      </span>
      {server?.error && <span className="text-[0.786rem] text-warning">{server.error}</span>}
    </div>
  );
}

/**
 * The callout as the transcript renders it: the chrome, and the part's own
 * input read off the tool call.
 *
 * `chat-panel` imports this lazily — behind it sit the Plugins tab's connect
 * hook and its key form, which most chats never open.
 */
export function ConnectCallout({ part }: { part: ConnectPart }) {
  const serverId = typeof part.input?.serverId === "string" ? part.input.serverId : "";
  if (!serverId) return null;
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-surface-raised">
      <ConnectCard serverId={serverId} reason={part.input?.reason} />
    </div>
  );
}

/** The shape of a `recommend_integration` call, as the chat holds it. */
export interface ConnectPart {
  input?: { serverId?: unknown; reason?: string };
}
