import { Button, cx } from "@/components/ui";
import { useUpgrade } from "@/components/upgrade-modal";
import { AccountMenu } from "./account-menu";
import { hasUpdate } from "../lib/use-update";
import type { AuthOrganization, AuthUser, UpdateState } from "../../electron/shared";

export type HomeTab = "create" | "templates" | "settings";

type IconProps = { className?: string };

// Solar "Clapperboard Play" (bold duotone) — https://creativecommons.org/licenses/by/4.0/
function ClapperboardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M2 12c0-1.237 0-2.311.026-3.25h19.948C22 9.689 22 10.763 22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12"
        clipRule="evenodd"
        opacity=".5"
      />
      <path d="M15 14.5c0-.633-.662-1.06-1.986-1.915c-1.342-.866-2.013-1.299-2.514-.98c-.5.317-.5 1.176-.5 2.895s0 2.578.5 2.896s1.172-.115 2.514-.981C14.338 15.56 15 15.133 15 14.5M12 2c1.845 0 3.33 0 4.54.088L13.098 7.25H8.401l3.5-5.25zM3.464 3.464c1.253-1.252 3.158-1.433 6.631-1.46L6.599 7.25H2.104c.147-1.764.503-2.928 1.36-3.786M21.896 7.25c-.148-1.764-.503-2.928-1.36-3.786c-.598-.597-1.344-.95-2.338-1.16L14.901 7.25z" />
    </svg>
  );
}

// Solar "Notes Minimalistic" (bold duotone) — https://creativecommons.org/licenses/by/4.0/
function NotesIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="m20.312 12.647l.517-1.932c.604-2.255.907-3.382.68-4.358a4 4 0 0 0-1.162-2.011c-.731-.685-1.859-.987-4.114-1.591c-2.255-.605-3.383-.907-4.358-.68a4 4 0 0 0-2.011 1.162c-.587.626-.893 1.543-1.348 3.209l-.244.905l-.517 1.932c-.605 2.255-.907 3.382-.68 4.358a4 4 0 0 0 1.162 2.011c.731.685 1.859.987 4.114 1.592c2.032.544 3.149.843 4.064.73q.15-.019.294-.052a4 4 0 0 0 2.011-1.16c.685-.732.987-1.86 1.592-4.115" />
      <path
        d="M16.415 17.975a4 4 0 0 1-1.068 1.677c-.731.685-1.859.987-4.114 1.591s-3.383.907-4.358.679a4 4 0 0 1-2.011-1.161c-.685-.731-.988-1.859-1.592-4.114l-.517-1.932c-.605-2.255-.907-3.383-.68-4.358a4 4 0 0 1 1.162-2.011c.731-.685 1.859-.987 4.114-1.592q.638-.172 1.165-.309l-.244.906l-.517 1.932c-.605 2.255-.907 3.382-.68 4.358a4 4 0 0 0 1.162 2.011c.731.685 1.859.987 4.114 1.592c2.032.544 3.149.843 4.064.73"
        opacity=".5"
      />
    </svg>
  );
}

// Solar "Settings Minimalistic" (bold duotone) — https://creativecommons.org/licenses/by/4.0/
function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M12.428 2c-1.114 0-2.129.6-4.157 1.802l-.686.406C5.555 5.41 4.542 6.011 3.985 7c-.557.99-.557 2.19-.557 4.594v.812c0 2.403 0 3.605.557 4.594s1.57 1.59 3.6 2.791l.686.407C10.299 21.399 11.314 22 12.428 22s2.128-.6 4.157-1.802l.686-.407c2.028-1.2 3.043-1.802 3.6-2.791c.557-.99.557-2.19.557-4.594v-.812c0-2.403 0-3.605-.557-4.594s-1.572-1.59-3.6-2.792l-.686-.406C14.555 2.601 13.542 2 12.428 2"
        clipRule="evenodd"
        opacity=".5"
      />
      <path d="M12.428 8.25a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5" />
    </svg>
  );
}

const NAV: readonly { id: HomeTab; label: string; Icon: (props: IconProps) => React.ReactElement }[] = [
  { id: "create", label: "Create", Icon: ClapperboardIcon },
  { id: "templates", label: "Templates", Icon: NotesIcon },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

/**
 * Free-plan nudge, tucked above the account footer.
 *
 * Renders nothing on a paid plan, nothing while the plan is still loading (so
 * it never flashes in and out), and nothing on the Settings tab, which already
 * offers the same upgrade from its Account section — mirrors the web
 * dashboard's `UpgradeCard`, hidden the same way on its own billing page.
 */
function UpgradeCard({ hidden }: { hidden: boolean }) {
  const { plan, trial, openUpgrade } = useUpgrade();
  if (hidden || plan?.id !== "free") return null;

  return (
    <div className="mb-2 rounded-md border border-border bg-surface-raised p-3">
      <p className="text-[0.857rem] font-medium text-text-primary">Free trial</p>
      <p className="mt-0.5 text-[0.786rem] leading-snug text-text-tertiary">
        {trial?.active
          ? `${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left. Upgrade to keep chat plugins and support after it ends.`
          : "Your trial has ended. Upgrade to keep using GenMotion."}
      </p>
      <Button
        size="sm"
        variant="primary"
        onClick={() => openUpgrade("trial")}
        className="mt-2.5 w-full"
      >
        Upgrade
      </Button>
    </div>
  );
}

/**
 * The app's navigation.
 *
 * Only the non-editor screens live behind it: opening a project takes the whole
 * window, because the editor already spends its width on a chat column, a
 * preview and a timeline, and a rail beside all three would come out of the
 * preview.
 *
 * It starts below `h-9` on every platform. On macOS the traffic lights sit over
 * the top-left corner, which is exactly where a nav item would otherwise be.
 */
export function AppSidebar({
  tab,
  onSelect,
  user,
  organization,
  update,
  onOpenUpdate,
}: {
  tab: HomeTab;
  onSelect: (tab: HomeTab) => void;
  user: AuthUser;
  organization: AuthOrganization | null;
  update: UpdateState;
  onOpenUpdate: () => void;
}) {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-background pb-3 pl-3">
      {/* Clears the traffic lights. The strip itself is the shell's. */}
      <div className="h-9 shrink-0" />

      <div className="px-2 pb-4 pt-1">
        <img src="/logo.svg" alt="GenMotion" className="size-5 rounded-[5px]" />
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex h-9 items-center gap-2.5 rounded-md px-3 text-[0.95rem]",
                "transition-colors duration-150 outline-none",
                "focus-visible:ring-2 focus-visible:ring-accent/40",
                active
                  ? "bg-surface-raised text-text-primary"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {hasUpdate(update) && (
        <button
          type="button"
          onClick={onOpenUpdate}
          className={cx(
            "mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-left text-[0.857rem]",
            "transition-colors duration-150 hover:bg-surface-raised",
            update.status === "ready" ? "text-green" : "text-accent",
          )}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-current" />
          {update.status === "downloading"
            ? `Downloading · ${update.percent}%`
            : update.status === "ready"
              ? "Restart to update"
              : "Update available"}
        </button>
      )}

      <UpgradeCard hidden={tab === "settings"} />

      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
        <AccountMenu user={user} organization={organization} placement="up" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.857rem] text-text-secondary">
            {user.name || user.email}
          </div>
          {organization && (
            <div className="truncate text-[0.786rem] text-text-tertiary">
              {organization.name}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
