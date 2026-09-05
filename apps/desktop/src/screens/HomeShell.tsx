import { useState } from "react";
import { AppSidebar, type HomeTab } from "../components/app-sidebar";
import { UpdateModal } from "../components/update-modal";
import { useUpdate } from "../lib/use-update";
import { Home } from "./Home";
import { Templates } from "./Templates";
import { Settings } from "./Settings";
import type { AuthOrganization, AuthUser, DesktopProject } from "../../electron/shared";

/**
 * Everything that is not the editor.
 *
 * The three destinations share one frame — a nav rail and an inset panel — so
 * moving between them changes only what is inside the panel. It owns the
 * frameless window's drag strip for all of them, which `Home` used to hand-roll
 * for itself.
 */
export function HomeShell({
  busy,
  onOpen,
  onCreate,
  onAdopt,
  user,
  organization,
}: {
  busy: boolean;
  onOpen: (dir: string) => void;
  onCreate: (input: { prompt: string; width: number; height: number }) => void;
  /** A remixed template arrives as a whole project, ready to open. */
  onAdopt: (project: DesktopProject) => void;
  user: AuthUser;
  organization: AuthOrganization | null;
}) {
  const [tab, setTab] = useState<HomeTab>("create");
  const update = useUpdate();
  const [updateOpen, setUpdateOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-text-primary">
      {updateOpen && <UpdateModal state={update} onClose={() => setUpdateOpen(false)} />}
      {/* Spans the whole window, behind everything: a draggable region is
          geometric rather than hit-tested, so anything on top of it needs
          `.no-drag` — which the controls inside the panel already carry. */}
      <div className="titlebar-drag pointer-events-none fixed inset-x-0 top-0 z-40 h-9" />

      <AppSidebar
        tab={tab}
        onSelect={setTab}
        user={user}
        organization={organization}
        update={update}
        onOpenUpdate={() => setUpdateOpen(true)}
      />

      <main className="min-w-0 flex-1 p-3 pl-3">
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
          ) : (
            <Settings user={user} organization={organization} />
          )}
        </div>
      </main>
    </div>
  );
}
