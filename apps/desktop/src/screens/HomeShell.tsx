import { useState } from "react";
import { AppSidebar } from "../components/app-sidebar";
import { UpdateModal } from "../components/update-modal";
import { useUpdate } from "../lib/use-update";
import { useTabsStore } from "../tabs/tabs-store";
import { Home } from "./Home";
import { Templates } from "./Templates";
import { Exports } from "./Exports";
import { Settings } from "./Settings";
import type { AuthOrganization, AuthUser, DesktopProject } from "../../electron/shared";

/**
 * Everything that is not the editor — the Home tab.
 *
 * The three destinations share one frame — a nav rail and an inset panel — so
 * moving between them changes only what is inside the panel. The frameless
 * window's drag strip is the tab strip above, which every screen sits under.
 */
export function HomeShell({
  busy,
  onOpen,
  onCreate,
  onAdopt,
  onOpenProject,
  user,
  organization,
}: {
  busy: boolean;
  onOpen: (dir: string) => void;
  onCreate: (input: { prompt: string; width: number; height: number; files: File[] }) => void;
  /** A remixed template arrives as a whole project, ready to open. */
  onAdopt: (project: DesktopProject) => void;
  /** From the Exports page: bring that project's tab up, opening it if need be. */
  onOpenProject: (dir: string) => void;
  user: AuthUser;
  organization: AuthOrganization | null;
}) {
  const tab = useTabsStore((s) => s.homeView);
  const setTab = useTabsStore((s) => s.setHomeView);
  const update = useUpdate();
  const [updateOpen, setUpdateOpen] = useState(false);

  return (
    <div className="flex h-full overflow-hidden bg-background text-text-primary">
      {updateOpen && <UpdateModal state={update} onClose={() => setUpdateOpen(false)} />}

      <AppSidebar
        tab={tab}
        onSelect={setTab}
        user={user}
        organization={organization}
        update={update}
        onOpenUpdate={() => setUpdateOpen(true)}
      />

      <main className="min-w-0 flex-1 p-3 pl-3 pt-0">
        <div className="h-full overflow-hidden rounded-xl border border-border bg-surface">
          {tab === "create" ? (
            <Home
              busy={busy}
              onOpen={onOpen}
              onCreate={onCreate}
              onOpenUpdate={() => setUpdateOpen(true)}
            />
          ) : tab === "templates" ? (
            <Templates onRemixed={onAdopt} />
          ) : tab === "exports" ? (
            <Exports onOpenProject={onOpenProject} />
          ) : (
            <Settings user={user} organization={organization} />
          )}
        </div>
      </main>
    </div>
  );
}
