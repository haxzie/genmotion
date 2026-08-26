import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/marketing/primitives";
import { DownloadButton } from "@/components/marketing/download-button";
import { pageMetadata } from "@/lib/marketing/seo";
import { getLatestRelease, formatSize } from "@/lib/marketing/latest-release";

export const metadata: Metadata = pageMetadata({
  title: "Download — GenMotion",
  description:
    "Download GenMotion for macOS. Projects live in a folder on your Mac; rendering and export run locally.",
  path: "/download",
});

/**
 * A stable place to send people.
 *
 * The button could link straight at the API's redirect, but "genmotion.dev/
 * download" is what fits in a README, a tweet, or a footer — and unlike an API
 * URL it survives the endpoint being reorganised.
 */
export default async function DownloadPage() {
  const release = await getLatestRelease();

  return (
    <Section>
      <Container className="max-w-3xl text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Download GenMotion
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-text-secondary">
          Your projects are folders on your Mac. Rendering and export run
          locally — nothing is uploaded, and there is no queue to wait in.
        </p>

        <div className="mt-10 flex flex-col items-center">
          <DownloadButton size="lg" />
          <p className="mt-4 text-[0.9rem] text-text-secondary">
            {release ? (
              <>
                v{release.version} · {formatSize(release.size)} · macOS on Apple
                silicon
              </>
            ) : (
              <>macOS on Apple silicon</>
            )}
          </p>
        </div>

        <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
          <Card className="p-5">
            <h2 className="font-medium">Requirements</h2>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-text-secondary">
              macOS on Apple silicon. Intel Macs are not supported yet.
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="font-medium">Bring your own agent</h2>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-text-secondary">
              GenMotion drives the Claude Code or Codex CLI you are already
              signed in to. No separate subscription to write scenes.
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="font-medium">Signed and notarized</h2>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-text-secondary">
              Every build is signed with a Developer ID and notarized by Apple,
              so it opens without a Gatekeeper warning.
            </p>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
