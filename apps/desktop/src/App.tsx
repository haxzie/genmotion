import { useCallback, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { projectQueryKey } from "@/hooks/use-project";
import { UpgradeProvider } from "@/components/upgrade-modal";
import { Spinner } from "@/components/ui";
import { registerNavigate } from "./shims/next-link";
import { api, type DesktopProject } from "./api";
import { Home } from "./screens/Home";
import { EditorScreen } from "./screens/EditorScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { useAuth } from "./lib/use-auth";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 0 } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UpgradeProvider>
        <Shell />
      </UpgradeProvider>
    </QueryClientProvider>
  );
}

function Shell() {
  const auth = useAuth();
  const [project, setProject] = useState<DesktopProject | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();

  // The watcher pushes a whole payload whenever anything in the folder changes.
  // Writing it straight into the query cache means every component reading the
  // project — timeline, preview, code view — updates from one source.
  useEffect(
    () =>
      api.onProjectChanged((next) => {
        // The folder was moved, deleted, or unmounted — there is nothing left
        // to edit, so let go of it rather than showing an editor full of
        // stale state.
        if (next.folderMissing) {
          void api.closeProject();
          setProject(null);
          client.clear();
          return;
        }
        setProject(next);
        client.setQueryData(projectQueryKey(next.dir), next);
      }),
    [client],
  );

  const adopt = useCallback(
    (next: DesktopProject) => {
      setProject(next);
      client.setQueryData(projectQueryKey(next.dir), next);
    },
    [client],
  );

  const open = useCallback(
    async (dir: string) => {
      setBusy(true);
      try {
        adopt(await api.openProject(dir));
      } finally {
        setBusy(false);
      }
    },
    [adopt],
  );

  const create = useCallback(
    async ({ prompt, width, height }: { prompt: string; width: number; height: number }) => {
      setBusy(true);
      try {
        // Name the project from the opening words of the prompt; the agent can
        // rename it once it knows what the video actually is.
        const name = prompt.split(/\s+/).slice(0, 6).join(" ").slice(0, 48);
        const project = await api.createProject({ name, width, height });
        // The chat panel picks this up and sends it as the first message —
        // the same handoff the web app uses.
        sessionStorage.setItem(`gm-initial-prompt-${project.dir}`, prompt);
        adopt(project);
      } finally {
        setBusy(false);
      }
    },
    [adopt],
  );

  const close = useCallback(async () => {
    await api.closeProject();
    setProject(null);
    client.clear();
  }, [client]);

  // The editor's logo is a link home. With no router, the host decides what
  // that means: close the project and go back to the start screen.
  useEffect(() => {
    registerNavigate((href) => {
      if (href === "/" || href === "/dashboard") void close();
    });
    return () => registerNavigate(null);
  }, [close]);

  // The gate. `loading` is its own state rather than a default of signed-out:
  // a stored token is checked over the network at launch, and flashing the
  // login screen while that happens would be a lie every time.
  if (auth.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  if (auth.status !== "signed-in") return <LoginScreen state={auth} />;

  return project ? (
    <EditorScreen project={project} onClose={close} />
  ) : (
    <Home
      busy={busy}
      onOpen={open}
      onCreate={create}
      user={auth.user}
      organization={auth.organization}
    />
  );
}
