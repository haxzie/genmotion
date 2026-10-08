import { useMemo } from "react";
import type { McpCatalogEntry } from "@genmotion/shared";
import { Button, Spinner } from "@/components/ui";
import { useMcpCatalog } from "../../lib/use-mcp-catalog";
import { ServerIcon } from "../marketplace/server-icon";
import { McpServerModal } from "../marketplace/server-modal";
import { useCatalogConnect } from "../marketplace/use-catalog-connect";
import { DoneBadge, OnboardingRow, OnboardingStep, PendingNote } from "./layout";

/**
 * Step two: the model providers whose keys the agent will use.
 *
 * A short list, not the whole marketplace — the point of the step is "you can
 * bring your own models", and twenty cards would make it a shopping trip. The
 * five below are the ones that generate the media a video is made of; the rest
 * of the catalog is a click away in the Marketplace tab, which is what the
 * hint says.
 *
 * Preferred ids rather than a category filter so the order is ours, but with a
 * category fallback: the catalog is served by the API and may add, rename or
 * retire an entry without a release of ours, and this list going empty because
 * one id moved would be worse than showing whatever generative media it has.
 */
const FEATURED = ["fal", "elevenlabs", "replicate", "runway", "freepik"];
const FEATURED_CATEGORIES = ["Generative media", "Voice & audio"];

function featured(entries: McpCatalogEntry[]): McpCatalogEntry[] {
  const picked = FEATURED.map((id) => entries.find((e) => e.id === id)).filter(
    (e): e is McpCatalogEntry => e !== undefined,
  );
  if (picked.length >= 3) return picked;
  return entries.filter((e) => FEATURED_CATEGORIES.includes(e.category)).slice(0, 5);
}

export function IntegrationsStep({ onDone }: { onDone: () => void }) {
  const catalog = useMcpCatalog();
  const {
    servers: { servers },
    connect,
    busyIds,
    modal,
    setModal,
    submitModal,
    error,
    pending,
  } = useCatalogConnect();

  const entries = useMemo(() => featured(catalog.data?.entries ?? []), [catalog.data]);
  const serverFor = (id: string) => (servers ?? []).find((s) => s.catalogId === id) ?? null;
  const anyConnected = entries.some((e) => serverFor(e.id)?.status === "connected");

  return (
    <>
      <OnboardingStep
        title="Generate videos, audio and images"
        hint="You can always add more later"
        // Nothing here is required, so the button says what pressing it does
        // rather than claiming a step was finished that may have been passed.
        action={anyConnected ? "Continue" : "Skip"}
        onAction={onDone}
        rows={
          catalog.isLoading && !catalog.data
            ? Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="h-[4.25rem] animate-pulse rounded-xl bg-surface-raised" />
              ))
            : entries.length === 0
              ? [
                  <li key="none" className="px-3 py-6 text-[0.929rem] text-text-tertiary">
                    Couldn't load the marketplace. You can connect these from the Marketplace tab
                    once you're online.
                  </li>,
                ]
              : entries.map((entry) => {
                  const server = serverFor(entry.id);
                  const busy = busyIds.has(entry.id);
                  return (
                    <OnboardingRow
                      key={entry.id}
                      icon={<ServerIcon name={entry.name} iconUrl={entry.iconUrl} size="md" />}
                      name={entry.name}
                      subtitle={entry.description}
                      subtitleLines={2}
                      // An error is the one thing the row can't say in the
                      // space the button leaves, and it is the one the user
                      // most needs: "Retry" alone doesn't say what to fix.
                      note={server?.status === "error" ? (server.error ?? null) : null}
                      action={
                        // Only a server that actually answered is connected.
                        // The row used to go by whether a row existed at all,
                        // which flipped to "Connected" the instant it was
                        // added — before the OAuth window had even opened,
                        // let alone been finished.
                        server?.status === "connected" ? (
                          <DoneBadge>Connected</DoneBadge>
                        ) : busy || server?.status === "connecting" ? (
                          <PendingNote>
                            <Spinner className="size-3.5" />
                            Connecting…
                          </PendingNote>
                        ) : (
                          <Button
                            variant="primary"
                            className="h-8 shrink-0 rounded-full px-4"
                            onClick={() => void connect(entry)}
                          >
                            {/* `authenticate` returns as soon as the browser
                                is open and leaves the row at `needs-auth`, so
                                this is both "you are mid-sign-in" and "you
                                walked away from one" — and pressing it does
                                the right thing either way. */}
                            {server?.status === "needs-auth"
                              ? "Finish in browser"
                              : server
                                ? "Retry"
                                : "Connect"}
                          </Button>
                        )
                      }
                    />
                  );
                })
        }
      >
        <p>
          GenMotion lets you bring your own AI models and services to generate images, videos, audio
          and SFX — at no cost on top of what you already pay them.
        </p>
        <p>Connect your accounts and GenMotion agents can use them whenever they're needed.</p>
      </OnboardingStep>

      <McpServerModal
        mode={modal}
        onClose={() => setModal(null)}
        onSubmit={submitModal}
        pending={pending}
        error={error}
      />
    </>
  );
}
