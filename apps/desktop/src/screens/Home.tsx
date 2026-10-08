import { useRef } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { HeroComposer } from "@/components/composer";
import { api as loopback } from "@/lib/api";
import { cx } from "@/components/ui";
import { HeroShaderBackground } from "@/components/marketing/hero-shader-background";
import { HarnessPicker } from "../harness-picker";
import { EnginePicker } from "../engine-picker";
import { FolderAccess, useShareFolder } from "../folder-access";
import { hasUpdate, useUpdate } from "../lib/use-update";
import { AdoptLaunchFolder } from "./adopt-launch-folder";
import { CloneFromGitHub } from "./clone-from-github";
import { HomeTemplates, templateAssetUrl } from "./home-templates";
import { usePendingTemplateStore } from "./pending-template-store";
import type { DesktopProject, UpdateState } from "../../electron/shared";

// Gentle on-load entrance: fade + a small slide up, composer trailing the heading.
const enter = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};
const enterEase = [0.25, 1, 0.5, 1] as const;

/**
 * The update, said again under the composer.
 *
 * There is already a pill for this in the top-right corner, and on a screen
 * whose entire point is the box in the middle it goes unread — the corner is
 * where the window controls and the avatar live, which is exactly the region
 * people have learned to skip. This puts the same sentence where they are
 * already looking, in the quietest form that still reads as a thing you can
 * press.
 *
 * It opens the same dialog and does nothing else. Downloading is ~140MB and
 * installing quits the app; neither belongs behind a hint someone glanced at
 * on their way to typing a prompt.
 */
function UpdateHint({ state, onOpen }: { state: UpdateState; onOpen: () => void }) {
  if (!hasUpdate(state)) return null;
  const version = "version" in state ? state.version : "";
  const ready = state.status === "ready";

  return (
    <motion.div
      className="mt-3 flex justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // Trailing the composer, which is itself trailing the heading: an update
      // is the least urgent thing on this screen and should arrive last.
      transition={{ duration: 0.4, ease: enterEase, delay: 0.35 }}
    >
      <button
        type="button"
        onClick={onOpen}
        className={cx(
          // A pill rather than bare text: this sits on the hero's gradient,
          // where tertiary grey on a lit backdrop was not readable at all.
          "group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 backdrop-blur-md",
          "text-[0.857rem] text-text-secondary transition-colors duration-150",
          "hover:border-border-strong hover:text-text-primary",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        )}
      >
        <span
          className={cx("size-1.5 rounded-full", ready ? "bg-green" : "bg-accent")}
          aria-hidden
        />
        {state.status === "downloading" ? (
          <>
            Downloading GenMotion {version} · {state.percent}%
          </>
        ) : (
          <>
            GenMotion {version} {ready ? "is ready to install" : "is available"} ·{" "}
            <span className={cx("group-hover:underline", ready ? "text-green" : "text-accent")}>
              {ready ? "Restart" : "Update"}
            </span>
          </>
        )}
      </button>
    </motion.div>
  );
}

/**
 * The Create tab: the shader hero, the composer, and the template gallery.
 *
 * Creating a project never asks where to put it — a prompt is enough. The app
 * allocates a folder, opens the editor, and the chat panel sends that first
 * message itself (it already looks for `gm-initial-prompt-<id>`).
 *
 * Templates sit under the composer rather than on a page of their own, because
 * picking one is a way of *starting* a video: Remix on a card puts the template
 * in the composer as a chip and nothing is copied until that message is sent,
 * so the prompt and the template arrive together. Projects already made are
 * their own destination now (`Projects`).
 *
 * The window chrome — drag strip, account menu, update pill — belongs to
 * `HomeShell`, since every destination needs the same and only one of them can
 * own it.
 */
export function Home({
  busy,
  onCreate,
  onAdopt,
  onOpenUpdate,
}: {
  busy: boolean;
  onCreate: (input: {
    prompt: string;
    width: number;
    height: number;
    files: File[];
    /** Set when the composer carried a template chip: remix it instead of scaffolding. */
    templateId?: string;
  }) => void;
  /** An adopted launch folder arrives as a whole project, ready to open. */
  onAdopt: (project: DesktopProject) => void;
  onOpenUpdate: () => void;
}) {
  const update = useUpdate();
  // "Share a folder" in the composer's `+`: folders picked here are held for
  // whichever project the prompt creates.
  const shareFolder = useShareFolder(null);
  const template = usePendingTemplateStore((s) => s.template);
  const clearTemplate = usePendingTemplateStore((s) => s.clear);
  // The gallery's lazy loading watches this, not the window: the sentinel at
  // its foot is clipped by this container.
  const scrollRef = useRef<HTMLDivElement>(null);

  // Seeds the composer's aspect picker. Its own query rather than a prop, so
  // changing the default in Settings is reflected the next time this mounts
  // without the shell having to carry the value through.
  const { data: defaults } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => loopback<{ width: number; height: number; fps: number }>("/api/preferences"),
  });

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {/* The section deliberately does NOT clip: the composer's menus open
          downward from here, and an `overflow-hidden` on the section cut them
          off with no way to scroll. Only the blob layer needs clipping, so
          that is where it lives now. */}
      <section className="relative flex min-h-[68vh] flex-col items-center justify-center px-6 pt-6">
        {/* Same aurora grain-gradient shader as the marketing homepage's hero,
            reused straight from the web app's source (see vite.config.ts's
            `@/` alias) — swapped in for the old blurred-circle blobs.
            Opacity-only entrance: the old blob layer also scaled in on
            `scaleY`, which was fine for heavily blurred CSS circles but
            visibly warped this shader's crisp canvas texture as it
            un-squished — the "sharp edge" being pushed up. */}
        <motion.div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        >
          {/* colorBack matches HomeShell's panel (`bg-surface`, #0f0f12) rather
              than the marketing default (`--color-background`, #08080a) —
              this section sits inside that panel, not on the page background. */}
          <HeroShaderBackground scale={2.4} speed={1.6} colorBack="#0f0f12" />
        </motion.div>
        {/* Fades the hue down into the background toward the gallery below. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface" />

        <motion.div
          className="relative mb-8 text-center"
          initial={enter.initial}
          animate={enter.animate}
          transition={{ duration: 0.45, ease: enterEase }}
        >
          <h1 className="font-display text-3xl tracking-tight">
            What do you want to create?
          </h1>
        </motion.div>

        <motion.div
          className="relative w-full max-w-2xl"
          initial={enter.initial}
          animate={enter.animate}
          transition={{ duration: 0.45, ease: enterEase, delay: 0.1 }}
        >
          <HeroComposer
            onSubmit={(prompt, dims, files) => {
              onCreate({ prompt, ...dims, files, ...(template ? { templateId: template.id } : {}) });
              // The chip belongs to the project this just started. Clearing
              // here rather than on the shell's word keeps the box ready for
              // the next video as soon as the tab opens.
              clearTemplate();
            }}
            pending={busy}
            defaultAspect={defaults}
            onShareFolder={() => shareFolder.mutate()}
            sharingFolder={shareFolder.isPending}
            // A template picked in the gallery below, or handed over by the web
            // site's "Open in the app". Nothing has been downloaded yet; the
            // copy is made when this message is sent.
            attachment={
              template
                ? {
                    label: template.title,
                    thumbnail: template.posterPath
                      ? templateAssetUrl(template.posterPath, template.revision)
                      : null,
                    onRemove: clearTemplate,
                  }
                : null
            }
            // The first prompt goes straight to the agent, so which agent that
            // is belongs here rather than only inside the editor — and so does
            // what it can see, which is where a `genmotion .` launch shows up.
            // The folder pill only appears once something is shared (the `+`
            // menu is where sharing starts); then it is the place to see it.
            accessory={
              <>
                <HarnessPicker placement="down" />
                <EnginePicker placement="down" />
                <FolderAccess placement="down" hideWhenEmpty />
              </>
            }
          />
          <UpdateHint state={update} onOpen={onOpenUpdate} />
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto -mt-24 w-full max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-border bg-background p-5 shadow-[0_-8px_40px_rgba(10,10,20,0.35)] sm:p-6">
          <AdoptLaunchFolder onAdopted={onAdopt} />
          <HomeTemplates scrollRoot={scrollRef} action={<CloneFromGitHub onCloned={onAdopt} />} />
        </div>
      </section>
    </div>
  );
}
