import { cx } from "@/components/ui";
import { useTabsStore } from "../../tabs/tabs-store";
import type { AuthOrganization, AuthUser } from "../../../electron/shared";
import { SETTINGS_SECTIONS, type SettingsSection } from "./sections";
import { AgentSection } from "./agent";
import {
  CommandLineSection,
  DefaultsSection,
  ProjectsFolderSection,
  UpdatesSection,
} from "./general";
import { AccountSection } from "./account";

type IconProps = { className?: string };

// Bold-duotone marks in the main sidebar's Solar idiom: a half-tone body
// with a solid foreground, so the rail reads as one family.

// Solar "Settings Minimalistic" (bold duotone) — https://creativecommons.org/licenses/by/4.0/
function GeneralIcon({ className }: IconProps) {
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

function AgentIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M12 2C6.477 2 2 6.03 2 11c0 1.86.63 3.6 1.72 5.04L2.5 21l4.4-1.3A10.9 10.9 0 0 0 12 20c5.523 0 10-4.03 10-9S17.523 2 12 2"
        opacity=".5"
      />
      <circle cx="8" cy="11" r="1.25" />
      <circle cx="12" cy="11" r="1.25" />
      <circle cx="16" cy="11" r="1.25" />
    </svg>
  );
}

function AccountIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" opacity=".5" />
      <circle cx="12" cy="9.5" r="3.5" />
      <path d="M5.5 18.5c1.3-2.4 3.7-3.7 6.5-3.7s5.2 1.3 6.5 3.7A9.96 9.96 0 0 1 12 22a9.96 9.96 0 0 1-6.5-3.5" />
    </svg>
  );
}

const ICONS: Record<SettingsSection, (props: IconProps) => React.ReactElement> = {
  general: GeneralIcon,
  agent: AgentIcon,
  account: AccountIcon,
};

/**
 * The app's own settings.
 *
 * These used to be one long page, and before that scattered: the harness in
 * a composer accessory, the shell command in an avatar dropdown, the frame
 * rate nowhere at all. A rail of sections keeps each page short enough to
 * take in at once. Folder grants are deliberately *not* here — a read root is
 * granted per project and cleared when that project is deleted, so a
 * machine-wide page is the wrong home for them and they stay in the composer.
 * MCP servers are not here either: they live in the Marketplace, beside the
 * list they are picked from.
 */
export function Settings({
  user,
  organization,
}: {
  user: AuthUser;
  organization: AuthOrganization | null;
}) {
  const section = useTabsStore((s) => s.settingsSection);
  const setSection = useTabsStore((s) => s.setSettingsSection);

  return (
    <div className="flex h-full">
      <nav
        aria-label="Settings sections"
        className="flex w-48 shrink-0 flex-col gap-0.5 border-r border-border px-3 py-6"
      >
        <h1 className="mb-4 px-3 font-display text-2xl tracking-tight">Settings</h1>
        {SETTINGS_SECTIONS.map(({ id, label }) => {
          const active = section === id;
          const Icon = ICONS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex h-9 items-center gap-2.5 rounded-md px-3 text-left text-[0.929rem]",
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

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <div className="flex flex-col gap-4">
            {section === "general" ? (
              <>
                <DefaultsSection />
                <ProjectsFolderSection />
                <CommandLineSection />
                <UpdatesSection />
              </>
            ) : section === "agent" ? (
              <AgentSection />
            ) : (
              <AccountSection user={user} organization={organization} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
