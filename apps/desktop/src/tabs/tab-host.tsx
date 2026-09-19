import { useEffect, useRef, useState, type ReactNode } from "react";
import { PlaybackStoreProvider, createPlaybackStore } from "@genmotion/player";
import { Spinner } from "@/components/ui";
import { EditorStoreProvider } from "@/stores/editor-store";
import { EditorScreen } from "../screens/EditorScreen";
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
  children,
  paneRef,
}: {
  active: boolean;
  children: ReactNode;
  paneRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={paneRef}
      className="absolute inset-0 flex flex-col"
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
}: {
  tab: ProjectTab;
  active: boolean;
  onClose: () => void;
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
    <TabPane active={active} paneRef={paneRef}>
      <TabActiveProvider active={active}>
        <EditorStoreProvider>
          <PlaybackStoreProvider store={playback}>
            {tab.project ? (
              <EditorScreen project={tab.project} onClose={onClose} />
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
}: {
  home: ReactNode;
  onCloseTab: (dir: string) => void;
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
        />
      ))}
    </div>
  );
}
