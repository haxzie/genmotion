import { useEffect, useRef, useState, type ReactNode } from "react";
import { PlaybackStoreProvider, createPlaybackStore } from "@genmotion/player";
import { Spinner, cx } from "@/components/ui";
import { EditorStoreProvider } from "@/stores/editor-store";
import { EditorScreen } from "../screens/EditorScreen";
import type { DesktopProject } from "../api";
import { TabActiveProvider } from "./active-tab";
import { HOME_TAB, useTabsStore, type ProjectTab } from "./tabs-store";

/**
 * A tab's contents: shown or hidden, never unmounted.
 *
 * `display: none` rather than `visibility` or opacity, because it is the one
 * that stops layout and paint — the actual cost of keeping N editors alive.
 * `inert` keeps a hidden tab's controls out of focus and the tab order. What
 * neither stops is a clock: a hidden tab's rAF loop and `<audio>` would carry
 * on, so the tab is paused as it goes to the back.
 */
function TabPane({
  active,
  framed = false,
  children,
  paneRef,
}: {
  active: boolean;
  /**
   * A hairline round the pane with a few pixels of window showing past it.
   *
   * The editor gets it: it is a surface placed on the app, and the frame is
   * what says where that surface ends. Home does not — it is the app itself,
   * its own screens already draw their panels, and a second border around the
   * whole thing just boxes in the window.
   */
  framed?: boolean;
  children: ReactNode;
  paneRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={paneRef}
      className={cx(
        "absolute inset-0 flex flex-col",
        // `inset-0` then a margin: the box is pinned to all four edges and the
        // margin insets it, so the frame sits inside the pane's own bounds.
        framed && "m-1 overflow-hidden rounded-lg border border-border",
      )}
      style={{ display: active ? "flex" : "none" }}
      inert={!active}
    >
      {children}
    </div>
  );
}

function ProjectPane({
  tab,
  active,
  onClose,
  onAdopt,
}: {
  tab: ProjectTab;
  active: boolean;
  onClose: () => void;
  onAdopt: (project: DesktopProject) => void;
}) {
  // Each tab gets its own playback clock and its own selection: two projects
  // on one store would have one tab's timeline scrubbing the other's preview.
  const [playback] = useState(createPlaybackStore);
  const paneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) playback.getState().pause();
  }, [active, playback]);

  // Coming to the front, put the caret in the composer — the tab that just
  // went inert has silently lost focus to the document body, and shortcuts
  // land nowhere until something takes it back.
  useEffect(() => {
    if (!active) return;
    const composer = paneRef.current?.querySelector<HTMLElement>("textarea");
    composer?.focus({ preventScroll: true });
  }, [active]);

  return (
    <TabPane active={active} framed paneRef={paneRef}>
      <TabActiveProvider active={active}>
        <EditorStoreProvider>
          <PlaybackStoreProvider store={playback}>
            {tab.project ? (
              <EditorScreen project={tab.project} onClose={onClose} onAdopt={onAdopt} />
            ) : (
              <div className="flex h-full items-center justify-center" role="status" aria-label="Opening">
                <Spinner />
              </div>
            )}
          </PlaybackStoreProvider>
        </EditorStoreProvider>
      </TabActiveProvider>
    </TabPane>
  );
}

/**
 * Every open tab, mounted at once, with the active one showing.
 *
 * Mounted rather than switched because the chat's HTTP request *is* the agent
 * turn: unmounting a project's editor would abort the agent working in it.
 * That is the whole reason tabs exist.
 */
export function TabHost({
  home,
  onCloseTab,
  onAdopt,
}: {
  home: ReactNode;
  onCloseTab: (dir: string) => void;
  /** A project born inside a tab — a duplicate — wants a tab of its own. */
  onAdopt: (project: DesktopProject) => void;
}) {
  const tabs = useTabsStore((s) => s.tabs);
  const activeId = useTabsStore((s) => s.activeId);

  return (
    <div className="relative min-h-0 flex-1">
      <TabPane active={activeId === HOME_TAB}>
        <TabActiveProvider active={activeId === HOME_TAB}>{home}</TabActiveProvider>
      </TabPane>
      {tabs.map((tab) => (
        <ProjectPane
          key={tab.dir}
          tab={tab}
          active={activeId === tab.dir}
          onClose={() => onCloseTab(tab.dir)}
          onAdopt={onAdopt}
        />
      ))}
    </div>
  );
}
