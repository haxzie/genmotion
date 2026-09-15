import { Button } from "@/components/ui";
import { api as desktop } from "../../api";
import type { AuthOrganization, AuthUser } from "../../../electron/shared";
import { Section } from "./section";

export function AccountSection({
  user,
  organization,
}: {
  user: AuthUser;
  organization: AuthOrganization | null;
}) {
  return (
    <Section
      title="Account"
      description="Profile and team settings live on the web, where the browser's session is. Your plan and this month's usage are under Usage & billing."
    >
      <div className="mb-4">
        <div className="text-[0.929rem] text-text-primary">{user.name || user.email}</div>
        <div className="text-[0.786rem] text-text-tertiary">{user.email}</div>
        {organization && (
          <div className="mt-1 text-[0.786rem] text-text-tertiary">{organization.name}</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void desktop.openWeb("/settings")}>
          Account settings
        </Button>
        <Button size="sm" variant="danger" onClick={() => void desktop.auth.signOut()}>
          Sign out
        </Button>
      </div>
    </Section>
  );
}

