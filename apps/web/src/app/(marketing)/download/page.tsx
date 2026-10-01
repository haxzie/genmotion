import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, Card, Eyebrow, LinkButton } from "@/components/marketing/primitives";
import { DownloadButton } from "@/components/marketing/download-button";
import { InstallCommand } from "@/components/marketing/install-command";
import { CopyTextButton } from "@/components/marketing/copy";
import { pageMetadata } from "@/lib/marketing/seo";
import { getLatestRelease, formatSize } from "@/lib/marketing/latest-release";
import {
  CLI_INIT_COMMAND,
  DOCS_PATH,
  SETUP_PROMPT,
  STUDIO_INSTALL_COMMAND,
} from "@/lib/marketing/setup";

export const metadata: Metadata = pageMetadata({
  title: "Download GenMotion Studio and CLI",
  description:
    "Download GenMotion Studio for Mac, or install the genmotion CLI with npm. Projects live in a folder on your machine, and rendering runs locally.",
  path: "/download",
});

/**
 * A stable place to send people, and the one page that lays out both ways in.
 *
 * The button could link straight at the API's redirect, but "genmotion.dev/
 * download" is what fits in a README, a tweet, or a footer, and unlike an API
 * URL it survives the endpoint being reorganised.
 */
export default async function DownloadPage() {
  const release = await getLatestRelease();

  return (
    <>
      <Section className="pb-12 sm:pb-16">
        <Container className="max-w-3xl text-center">
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Download GenMotion
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-text-secondary">
            A desktop studio for your Mac, or a CLI for any terminal and any
            coding agent. Both make the same videos from the same project
            folders, and both render on your machine.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-[0.95rem]">
            <a href="#studio" className="rounded-full border border-border px-4 py-1.5 text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary">
              Studio for Mac
            </a>
            <a href="#cli" className="rounded-full border border-border px-4 py-1.5 text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary">
              CLI for any terminal
            </a>
            <a href="#which" className="rounded-full border border-border px-4 py-1.5 text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary">
              Which one?
            </a>
          </div>
        </Container>
      </Section>

      <Container className="max-w-5xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="flex min-w-0 flex-col p-6 sm:p-8">
            <div id="studio" className="scroll-mt-24" />
            <Eyebrow>Desktop app</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              GenMotion Studio
            </h2>
            <p className="mt-3 text-text-secondary">
              Chat with your agent, watch a frame-accurate preview, trim on the
              timeline and export in one click. Drives the Claude Code or Codex
              CLI you are already signed in to.
            </p>

            <div className="mt-8 flex flex-col items-start gap-3">
              <DownloadButton size="lg" href={release?.downloadUrl} label="Download for Mac" />
              <p className="text-[0.9rem] text-text-tertiary">
                {release ? (
                  <>
                    v{release.version} · {formatSize(release.size)} · .dmg ·
                    Apple silicon
                  </>
                ) : (
                  <>.dmg · Apple silicon</>
                )}
              </p>
            </div>

            <h3 className="mt-8 text-[0.95rem] font-medium">Or install from Terminal</h3>
            <p className="mt-1 text-[0.9rem] text-text-secondary">
              Installs the app and adds the <code className="font-mono text-[0.9em]">genmotion</code> command,
              so <code className="font-mono text-[0.9em]">genmotion .</code> opens any folder.
            </p>
            <InstallCommand command={STUDIO_INSTALL_COMMAND} className="mt-3" />

            <ul className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-[0.9rem] text-text-secondary">
              <li><span className="text-text-primary">Requires</span> macOS on Apple silicon (M1 or later). Intel Macs are not supported.</li>
              <li><span className="text-text-primary">Agent</span> Claude Code or Codex, installed and signed in. No separate model subscription.</li>
              <li><span className="text-text-primary">Signed</span> with a Developer ID and notarized by Apple, so it opens without a warning.</li>
              <li><span className="text-text-primary">Updates</span> are checked at launch and never download until you say so.</li>
            </ul>
            <Link href={`${DOCS_PATH}/install-studio`} className="mt-6 text-[0.95rem] text-text-secondary underline underline-offset-2 hover:text-green">
              Studio setup guide
            </Link>
          </Card>

          <Card className="flex min-w-0 flex-col p-6 sm:p-8">
            <div id="cli" className="scroll-mt-24" />
            <Eyebrow>Command line · npm</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              genmotion CLI
            </h2>
            <p className="mt-3 text-text-secondary">
              Scaffold, preview, check and render from a terminal, plus an MCP
              server that gives Claude Code, Codex and Cursor the same tools.
              Open source under Apache-2.0.
            </p>

            <h3 className="mt-8 text-[0.95rem] font-medium">Create a project</h3>
            <InstallCommand command={CLI_INIT_COMMAND} className="mt-3" />
            <p className="mt-2 text-[0.9rem] text-text-tertiary">
              Or <code className="font-mono text-[0.9em]">npm create genmotion@latest my-video</code>
            </p>

            <h3 className="mt-6 text-[0.95rem] font-medium">Preview and render</h3>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface-raised/50 p-4 font-mono text-[0.85rem] leading-relaxed text-text-secondary">
{`cd my-video && npm install
npm run dev      # live preview, reloads on save
npm run render   # exports/my-video.mp4`}
            </pre>

            <h3 className="mt-6 text-[0.95rem] font-medium">Or let your agent do it</h3>
            <p className="mt-1 text-[0.9rem] text-text-secondary">
              Paste the setup prompt into Claude Code, Codex or Cursor in an
              empty folder. The agent installs the project and asks what the
              video is for.
            </p>
            <CopyTextButton text={SETUP_PROMPT} label="Copy setup prompt" className="mt-3 self-start" />

            <ul className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-[0.9rem] text-text-secondary">
              <li><span className="text-text-primary">Requires</span> Node 22 or newer, on macOS or Linux.</li>
              <li><span className="text-text-primary">Downloads</span> headless Chromium and ffmpeg on the first render. <code className="font-mono text-[0.9em]">npx genmotion doctor</code> checks the machine.</li>
              <li><span className="text-text-primary">Engines</span> Three.js (the default) and React. HyperFrames projects open in the Studio.</li>
              <li><span className="text-text-primary">No account</span> and no license key.</li>
            </ul>
            <Link href={`${DOCS_PATH}/install-cli`} className="mt-6 text-[0.95rem] text-text-secondary underline underline-offset-2 hover:text-green">
              CLI setup guide
            </Link>
          </Card>
        </div>
      </Container>

      <Section>
        <Container className="max-w-5xl">
          <div id="which" className="scroll-mt-24 max-w-2xl">
            <Eyebrow className="mb-4">Which one</Eyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              Same projects, two ways to work
            </h2>
            <p className="mt-4 text-text-secondary">
              A project made in one opens in the other, so the choice is about
              where you like to work, not a commitment.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-medium">Pick the Studio if</h3>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[0.95rem] text-text-secondary">
                <li>you want to see the video while the agent builds it</li>
                <li>you trim and reorder on a timeline, not in a file</li>
                <li>you want voiceover, sound effects and image generation (Pro)</li>
                <li>you use HyperFrames projects</li>
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="font-medium">Pick the CLI if</h3>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[0.95rem] text-text-secondary">
                <li>you already work in a terminal or a coding agent</li>
                <li>you are on Linux, or a Mac the Studio does not support</li>
                <li>you render in CI or from a script</li>
                <li>you want the MCP server in Cursor or another client</li>
              </ul>
            </Card>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <LinkButton href={DOCS_PATH} size="lg">
              Read the docs
            </LinkButton>
            <LinkButton href="https://github.com/haxzie/genmotion" variant="secondary" size="lg">
              Source on GitHub
            </LinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
