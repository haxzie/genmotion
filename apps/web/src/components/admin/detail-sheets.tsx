"use client";

import { Spinner } from "@/components/ui";
import { useAdminDetail } from "@/lib/admin/client";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import type { OrgDetail, UserDetail } from "@/lib/admin/types";
import {
  Avatar,
  Badge,
  Field,
  Panel,
  PersonRow,
  PlanBadge,
  Section,
  Sheet,
  StatGrid,
  useRetained,
} from "./sheet";

/** Centered spinner / error, shared by every detail panel. */
function DetailState({ loading, error }: { loading: boolean; error: unknown }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-5 text-text-tertiary" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="py-16 text-center text-[0.9rem] text-danger">
        {error instanceof Error ? error.message : "Couldn't load this record."}
      </p>
    );
  }
  return null;
}

/** Compact project list used at the bottom of the user and org panels. */
function RecentProjects({
  projects,
}: {
  projects: Array<{ id: string; name: string; thumbnailUrl: string | null; updatedAt: string }>;
}) {
  if (!projects.length) {
    return <p className="text-[0.85rem] text-text-tertiary">No projects yet.</p>;
  }
  return (
    <Panel>
      {projects.map((p) => (
        <div key={p.id} className="flex items-center gap-2.5 py-2">
          <div className="h-8 w-14 shrink-0 overflow-hidden rounded border border-border bg-surface-raised">
            {p.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumbnailUrl} alt="" className="size-full object-cover" />
            )}
          </div>
          <span className="min-w-0 flex-1 truncate text-[0.88rem]">{p.name}</span>
          <span className="shrink-0 text-[0.78rem] text-text-tertiary">
            {formatDate(p.updatedAt)}
          </span>
        </div>
      ))}
    </Panel>
  );
}

export function UserSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const shown = useRetained(id);
  const { data, isLoading, error } = useAdminDetail<UserDetail>(
    ["user", shown],
    shown ? `/users/${shown}` : null,
  );

  return (
    <Sheet
      open={Boolean(id)}
      onClose={onClose}
      title={data?.name || data?.email || "User"}
      subtitle={data?.email}
    >
      {!data ? (
        <DetailState loading={isLoading} error={error} />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Avatar person={data} className="size-12" />
            <div className="min-w-0">
              <div className="truncate text-[0.95rem] font-medium">{data.name || "—"}</div>
              <div className="truncate text-[0.85rem] text-text-tertiary">{data.email}</div>
            </div>
          </div>

          <div className="mt-5">
            <StatGrid
              stats={[
                { label: "Projects", value: data.projectCount },
                { label: "Exports", value: data.exportCount },
                { label: "Messages", value: data.messageCount },
              ]}
            />
          </div>

          <Section title="Details">
            <Panel>
              <Field label="Joined">{formatDateTime(data.createdAt)}</Field>
              <Field label="Job role">{data.jobRole || "—"}</Field>
              <Field label="Email verified">{data.emailVerified ? "Yes" : "No"}</Field>
              <Field label="Onboarded">{data.onboardingCompleted ? "Yes" : "No"}</Field>
              <Field label="User ID">
                <span className="font-mono text-[0.78rem]">{data.id}</span>
              </Field>
            </Panel>
          </Section>

          <Section title="Organisations" count={data.organizations.length}>
            <Panel>
              {data.organizations.map((o) => (
                <div key={o.organizationId} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate text-[0.88rem]">{o.name}</span>
                  <Badge>{o.role}</Badge>
                  <PlanBadge plan={o.plan} planName={o.planName} />
                </div>
              ))}
            </Panel>
          </Section>

          <Section title="Recent projects">
            <RecentProjects projects={data.projects} />
          </Section>
        </>
      )}
    </Sheet>
  );
}

export function OrgSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const shown = useRetained(id);
  const { data, isLoading, error } = useAdminDetail<OrgDetail>(
    ["org", shown],
    shown ? `/organizations/${shown}` : null,
  );

  return (
    <Sheet
      open={Boolean(id)}
      onClose={onClose}
      title={data?.name || "Organisation"}
      subtitle={data?.slug}
    >
      {!data ? (
        <DetailState loading={isLoading} error={error} />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <PlanBadge plan={data.plan} planName={data.planName} />
            <Badge tone={data.subscription.paid ? "green" : "default"}>
              {data.subscription.status}
            </Badge>
            {data.subscription.cancelAtPeriodEnd && <Badge tone="danger">Cancelling</Badge>}
          </div>

          <div className="mt-5">
            <StatGrid
              stats={[
                { label: "Members", value: data.members.length },
                { label: "Projects", value: data.projectCount },
                { label: "Exports", value: data.exportCount },
              ]}
            />
          </div>

          <Section title="Subscription">
            <Panel>
              <Field label="Plan">{data.planName}</Field>
              <Field label="Status">{data.subscription.status}</Field>
              <Field label="Seats">{data.subscription.seats}</Field>
              <Field label="Renews">{formatDate(data.subscription.currentPeriodEnd)}</Field>
            </Panel>
          </Section>

          <Section title="Details">
            <Panel>
              <Field label="Created">{formatDateTime(data.createdAt)}</Field>
              <Field label="Messages">{data.messageCount}</Field>
              <Field label="Org ID">
                <span className="font-mono text-[0.78rem]">{data.id}</span>
              </Field>
            </Panel>
          </Section>

          {data.createdBy && (
            <Section title="Created by">
              <Panel>
                <PersonRow person={data.createdBy} />
              </Panel>
            </Section>
          )}

          <Section title="Members" count={data.members.length}>
            <Panel>
              {data.members.map((m) => (
                <PersonRow
                  key={m.id}
                  person={m}
                  meta={
                    <span className="flex items-center gap-2">
                      <Badge>{m.role}</Badge>
                      {formatDate(m.joinedAt)}
                    </span>
                  }
                />
              ))}
            </Panel>
          </Section>

          <Section title="Recent projects">
            <RecentProjects projects={data.projects} />
          </Section>
        </>
      )}
    </Sheet>
  );
}
