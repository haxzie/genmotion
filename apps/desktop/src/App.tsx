import { useCallback, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { projectQueryKey } from "@/hooks/use-project";
import { projectFilesKey } from "@/hooks/use-project-files";
import { UpgradeProvider } from "@/components/upgrade-modal";
import { FeedbackProvider } from "./components/feedback-modal";
import { registerNavigate } from "./shims/next-link";
import { api, type DesktopProject } from "./api";
import { uploadProjectAsset } from "@/hooks/use-assets";
import { HomeShell } from "./screens/HomeShell";
import { LoginScreen } from "./screens/LoginScreen";
import { TabStrip } from "./tabs/tab-strip";
import { TabHost } from "./tabs/tab-host";
import { HOME_TAB, useTabsStore } from "./tabs/tabs-store";
import { useRecentProjectsStore } from "./screens/recent-projects-store";
import { useAuth } from "./lib/use-auth";
import { DevPanel } from "./dev/dev-panel";
import { ReactGrab } from "./dev/react-grab";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 0 } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UpgradeProvider>
        <FeedbackProvider>
        <Shell />
        {/* The dev-only admin panel. `import.meta.env.DEV` is a literal by the
            time Vite builds, so the branch and the import behind it are dropped
            from the packaged renderer — the panel cannot reach a user even by
            accident. Mounted here rather than inside Shell so it is there on
            the login screen too. */}
        {import.meta.env.DEV && <DevPanel />}
        {/* Hover anything, ⌘C, paste into a coding agent. Dropped from the
            packaged renderer by the same literal gate. */}
        {import.meta.env.DEV && <ReactGrab />}
        </FeedbackProvider>
      </UpgradeProvider>
    </QueryClientProvider>
  );
}

function Shell() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();

  /**
   * Bring a tab to the front.
   *
   * Tells the main process too: the one warm agent subprocess follows the
   * active tab. A tab restored at launch has no project yet — it is opened
   * the first time it is looked at, so a launch with many tabs does not start
   * every watcher before painting.
   */
  const activate = useCallback((id: string) => {
    const store = useTabsStore.getState();
    store.activate(id);
    void api.activateProject(id === HOME_TAB ? null : id);
    const tab = store.tabs.find((t) => t.dir === id);
    if (tab && tab.project === null) {
      void api
        .openProject(tab.dir)
        .then((project) => {
          // Closed while it was still opening: the tab is gone, so the
          // session that just came up has nobody — let it go rather than
          // resurrect the tab under the user.
          if (!useTabsStore.getState().tabs.some((t) => t.dir === project.dir)) {
            void api.closeProject(project.dir, { force: true });
            return;
          }
          useTabsStore.getState().upsert(project);
          client.setQueryData(projectQueryKey(project.dir), project);
        })
        .catch(() => useTabsStore.getState().remove(tab.dir));
    }
  }, [client]);

  /** A project payload arrived: give it a tab (or refresh its tab) and show it. */
  const adopt = useCallback(
    (project: DesktopProject) => {
      useTabsStore.getState().upsert(project);
      client.setQueryData(projectQueryKey(project.dir), project);
      // Home's own list is fetched once and never refetched on its own — put
      // this in front of it now, or a project created (or remixed) from
      // inside a tab would not show up there until the app restarted.
      useRecentProjectsStore.getState().add(project);
      activate(project.dir);
    },
    [client, activate],
  );

  /** Open a folder — or, if a tab already has it, just go there. */
  const open = useCallback(
    async (dir: string) => {
      const existing = useTabsStore.getState().tabs.find((t) => t.dir === dir);
      if (existing?.project) {
        activate(dir);
        return;
      }
      setBusy(true);
      try {
        adopt(await api.openProject(dir));
      } finally {
        setBusy(false);
      }
    },
    [adopt, activate],
  );

  const create = useCallback(
    async ({
      prompt,
      width,
      height,
      files,
    }: {
      prompt: string;
      width: number;
      height: number;
      files: File[];
    }) => {
      setBusy(true);
      try {
        // Name the project from the opening words of the prompt; the agent can
        // rename it once it knows what the video actually is.
        const name = prompt.split(/\s+/).slice(0, 6).join(" ").slice(0, 48);
        const project = await api.createProject({ name, width, height });
        // Files attached on the start screen go into the new project's
        // assets now, before the tab opens, so the first message can carry
        // them as context the way a drop into the chat would. One that fails
        // to upload is left out rather than holding the project back.
        const uploaded = await Promise.all(
          files.map((file) => uploadProjectAsset(project.dir, file).catch(() => null)),
        );
        const assetIds = uploaded.filter((a) => a !== null).map((a) => a.id);
        if (assetIds.length > 0) {
          sessionStorage.setItem(`gm-initial-assets-${project.dir}`, JSON.stringify(assetIds));
        }
        // The chat panel picks this up and sends it as the first message —
        // the same handoff the web app uses. `adopt` brings the new tab to
        // the front, so the first turn streams into the tab being looked at.
        sessionStorage.setItem(`gm-initial-prompt-${project.dir}`, prompt);
        adopt(project);
      } finally {
        setBusy(false);
      }
    },
    [adopt],
  );

  /** Drop a tab from the renderer, and let go of what was cached for it. */
  const forget = useCallback(
    (dir: string) => {
      useTabsStore.getState().remove(dir);
      // Only this project's queries: a blanket `clear()` would empty every
      // other tab's cache — and refetching a chat's history remounts a
      // streaming panel with fresh messages, losing the live turn.
      for (const key of [
        projectQueryKey(dir),
        ["chat", dir],
        ["assets", dir],
        ["export-latest", dir],
        projectFilesKey(dir),
        ["project-file", dir],
      ]) {
        client.removeQueries({ queryKey: key });
      }
    },
    [client],
  );

  /**
   * Close a tab. The main process refuses while the agent is mid-turn and asks
   * the user itself; `closed: false` means they chose to keep it.
   */
  const close = useCallback(
    async (dir: string) => {
      const result = await api.closeProject(dir);
      if (result.closed) forget(dir);
    },
    [forget],
  );

  // The watcher pushes a whole payload whenever anything in the folder changes.
  // Writing it straight into the query cache means every component reading the
  // project — timeline, preview, code view — updates from one source. The
  // payload names its folder, which is which tab it belongs to.
  useEffect(
    () =>
      api.onProjectChanged((next) => {
        // The folder was moved, deleted, or unmounted — there is nothing left
        // to edit, so let go of it rather than showing an editor full of
        // stale state.
        if (next.folderMissing) {
          void api.closeProject(next.dir, { force: true });
          forget(next.dir);
          return;
        }
        useTabsStore.getState().rename(next.dir, next.name);
        client.setQueryData(projectQueryKey(next.dir), next);
        // The payload says the folder changed but not how, so the file
        // explorer and any open file refetch: that is what makes a source
        // file the agent is writing update under its tab as it works.
        void client.invalidateQueries({ queryKey: projectFilesKey(next.dir) });
        void client.invalidateQueries({ queryKey: ["project-file", next.dir] });
      }),
    [client, forget],
  );

  // The install behind a new HyperFrames project, step by step. Patched into
  // the cached payload so the banner follows it without a reload of the
  // whole project; the settled state also arrives with the next full payload.
  useEffect(
    () =>
      api.onScaffoldChanged((dir, scaffold) => {
        client.setQueryData<DesktopProject>(projectQueryKey(dir), (current) =>
          current?.hyperframes ? { ...current, hyperframes: { ...current.hyperframes, scaffold } } : current,
        );
      }),
    [client],
  );

  // Opened from outside the renderer — a `genmotion://` remix link.
  useEffect(() => api.onProjectOpened(adopt), [adopt]);
  // Deleted from the editor, or otherwise released by the main process.
  useEffect(() => api.onProjectClosed(forget), [forget]);

  // Tab shortcuts arrive from the OS menu rather than a key listener here:
  // the code view's editor swallows keys before a window listener sees them.
  useEffect(
    () =>
      api.onTabCommand((command) => {
        const { tabs, activeId } = useTabsStore.getState();
        const order = [HOME_TAB, ...tabs.map((t) => t.dir)];
        const index = order.indexOf(activeId);
        if (command === "close") {
          if (activeId !== HOME_TAB) void close(activeId);
        } else if (command === "next") {
          activate(order[(index + 1) % order.length]!);
        } else if (command === "prev") {
          activate(order[(index - 1 + order.length) % order.length]!);
        } else {
          // ⌘1 is Home, ⌘2 the first project, and ⌘9 the last tab — as browsers do.
          const target =
            command.select === 9 ? order[order.length - 1] : order[command.select - 1];
          if (target) activate(target);
        }
      }),
    [activate, close],
  );

  // Last launch's tabs come back as stubs; only the front one is opened now.
  useEffect(() => {
    if (auth.status !== "signed-in") return;
    let live = true;
    void api.restoreTabs().then(({ tabs: remembered, activeDir }) => {
      if (!live) return;
      const store = useTabsStore.getState();
      for (const tab of remembered) store.addStub(tab.dir, tab.name);
      if (activeDir) activate(activeDir);
    });
    return () => {
      live = false;
    };
    // Once per sign-in, deliberately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  // And they are remembered as they change — the list and the front tab,
  // not the busy flags, which flip many times a turn.
  useEffect(() => {
    let last = "";
    return useTabsStore.subscribe((state) => {
      const tabs = {
        dirs: state.tabs.map((t) => t.dir),
        activeDir: state.activeId === HOME_TAB ? null : state.activeId,
      };
      const key = JSON.stringify(tabs);
      if (key === last) return;
      last = key;
      api.persistTabs(tabs);
    });
  }, []);

  // `genmotion <path>` pointing at a project opens it, rather than landing on
  // the start screen the user has already told us to skip. A folder that is
  // *not* a project needs nothing here: the main process shares it with
  // whichever project they open next, which is the whole of what it means.
  useEffect(() => {
    if (auth.status !== "signed-in") return;
    let live = true;
    void api.launchContext().then((context) => {
      if (live && context.dir && context.isProject) void open(context.dir);
    });
    return () => {
      live = false;
    };
  }, [auth.status, open]);

  // The same command run again while the app is up.
  useEffect(
    () =>
      api.onLaunchContext((context) => {
        if (context.dir && context.isProject) void open(context.dir);
      }),
    [open],
  );

  // The editor's logo is a link home. With no router, the host decides what
  // that means: bring the Home tab forward, leaving the project open.
  useEffect(() => {
    registerNavigate((href) => {
      if (href === "/" || href === "/dashboard") activate(HOME_TAB);
    });
    return () => registerNavigate(null);
  }, [activate]);

  // The gate. `loading` is its own state rather than a default of signed-out:
  // a stored token is checked over the network at launch, and flashing the
  // login screen while that happens would be a lie every time.
  if (auth.status === "loading") {
    return (
      <div
        className="flex h-screen items-center justify-center bg-background"
        role="status"
        aria-label="Loading"
      >
        <img src="/logo.svg" alt="" className="boot-mark size-12" />
      </div>
    );
  }

  if (auth.status !== "signed-in") return <LoginScreen state={auth} />;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TabStrip
        onActivate={activate}
        onClose={(dir) => void close(dir)}
        onOpenProject={(dir) => void open(dir)}
        onShowAllExports={() => {
          useTabsStore.getState().setHomeView("exports");
          activate(HOME_TAB);
        }}
      />
      <TabHost
        onCloseTab={forget}
        home={
          <HomeShell
            busy={busy}
            onOpen={open}
            onCreate={create}
            onAdopt={adopt}
            onOpenProject={(dir) => void open(dir)}
            user={auth.user}
            organization={auth.organization}
          />
        }
      />
    </div>
  );
}
