import { useState } from "react";
import { catalogEntryToInput, type McpCatalogEntry } from "@genmotion/shared";
import { useMcpServers } from "../../lib/use-mcp-servers";
import type { ServerModalMode, ServerModalSubmit } from "./server-modal";

/**
 * Connecting a marketplace entry, wherever the card is drawn.
 *
 * Two screens offer the same button — the Marketplace tab and the onboarding
 * walkthrough — and the sequence behind it is fiddly enough that having it
 * twice would mean fixing it twice: a pasted-key server opens the token form
 * first, an OAuth one opens a browser *after* the row exists, and both leave
 * the card busy until the round trip lands.
 *
 * It owns the modal's state as well as the connect, because the token form is
 * the first half of the same action. The caller renders `<McpServerModal>`
 * with what comes back; it may also open the modal itself, for Add and Edit,
 * which is why `setModal` is handed out.
 */
export function useCatalogConnect() {
  const servers = useMcpServers();
  const [modal, setModalMode] = useState<ServerModalMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  /** The server a connect just created, for the caller to flash into view. */
  const [connectedId, setConnectedId] = useState<string | null>(null);

  const mark = (id: string, on: boolean) =>
    setBusyIds((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /** Open (or close) the modal, always on a clean error line. */
  const setModal = (next: ServerModalMode | null) => {
    setError(null);
    setModalMode(next);
  };

  /**
   * Connect a marketplace entry, or carry on with the one already here.
   *
   * One row per entry: a second ElevenLabs is the same account and the same
   * tools under a second prefix, which helps nobody and the agent has to read
   * twice. `addServer` enforces that in the store, where two Connects landing
   * together can't both win; this is the half that makes the button do the
   * useful thing instead of silently no-op — resume the sign-in, or reopen
   * the key form over the server that exists.
   */
  async function connect(entry: McpCatalogEntry) {
    const existing = (servers.servers ?? []).find((s) => s.catalogId === entry.id) ?? null;

    if (entry.auth.kind === "header") {
      // Editing is how a stored key is replaced; the blank Connect form would
      // write a second row's worth of input against the first row.
      setModal(existing ? { kind: "edit", server: existing, entry } : { kind: "token", entry });
      return;
    }
    mark(entry.id, true);
    try {
      // `add` returns the existing row untouched when there is one, so this
      // is the same call either way — and the sign-in that follows is the
      // point of pressing the button a second time.
      const server = existing ?? (await servers.add.mutateAsync(catalogEntryToInput(entry)));
      setConnectedId(server.id);
      // Only after the row exists: the browser comes to the front, and a
      // user who finishes in it returns to a server already on the list.
      if (entry.auth.kind === "oauth") await servers.authenticate.mutateAsync(server.id);
    } catch {
      // The row carries the error; a toast would say the same thing twice.
    } finally {
      mark(entry.id, false);
    }
  }

  async function submitModal(input: ServerModalSubmit) {
    setError(null);
    try {
      if ("id" in input) {
        const { id, ...patch } = input;
        await servers.update.mutateAsync({ id, ...patch });
        setConnectedId(id);
      } else {
        const created = await servers.add.mutateAsync(input);
        setConnectedId(created.id);
      }
      setModalMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return {
    servers,
    connect,
    busyIds,
    connectedId,
    setConnectedId,
    modal,
    setModal,
    submitModal,
    error,
    pending: servers.add.isPending || servers.update.isPending,
  };
}
