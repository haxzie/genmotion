import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SEAT_PRICE_USD } from "@genmotion/shared";
import { Button, Input, Spinner, cx } from "@/components/ui";
import { Modal } from "@/components/modal";
import { limitsQueryKey, useUpgrade } from "@/components/upgrade-modal";
import { api } from "@/lib/api";
import { useAuth } from "../../lib/use-auth";
import { Choices, Section } from "./section";

/**
 * The team, as the web's members page shows it, reached through the
 * loopback's `org` proxy to the auth server's organization endpoints.
 *
 * Owners and admins invite, remove and cancel; everyone else sees the list.
 * An invite on a paid plan buys the seat itself (the API's invite hook
 * resizes the subscription), so the form says what the next one costs.
 */

interface OrgMember {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface OrgInvitation {
  id: string;
  email: string;
  role: string | null;
  status: string;
}

interface FullOrg {
  id: string;
  name: string;
  members: OrgMember[];
  invitations: OrgInvitation[];
}

const orgQueryKey = (orgId: string) => ["org", orgId] as const;

function useFullOrg(orgId: string | null) {
  return useQuery({
    queryKey: orgQueryKey(orgId ?? ""),
    queryFn: () => api<FullOrg>(`/api/org/get-full-organization?organizationId=${encodeURIComponent(orgId!)}`),
    enabled: Boolean(orgId),
    staleTime: 30_000,
  });
}

function Avatar({ name, email }: { name: string; email: string }) {
  const label = (name || email).trim();
  const initials =
    label
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-[0.786rem] font-medium text-text-primary ring-1 ring-border">
      {initials}
    </span>
  );
}

function RolePill({ role }: { role: string }) {
  return (
    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[0.714rem] capitalize text-text-tertiary">
      {role}
    </span>
  );
}

export function MembersSection() {
  const auth = useAuth();
  const me = auth.status === "signed-in" ? auth.user : null;
  const orgId = auth.status === "signed-in" ? (auth.organization?.id ?? null) : null;
  const { seats, canInvite, openUpgrade, handleLimitError } = useUpgrade();
  const org = useFullOrg(orgId);
  const queryClient = useQueryClient();

  const myRole = org.data?.members.find((m) => m.user.id === me?.id)?.role ?? "member";
  const admin = myRole === "owner" || myRole === "admin";
  const pending = (org.data?.invitations ?? []).filter((i) => i.status === "pending");
  const seatsFull = seats ? seats.used >= seats.max : false;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Members and seats move together: reload both. */
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: orgQueryKey(orgId ?? "") });
    void queryClient.invalidateQueries({ queryKey: limitsQueryKey });
  }

  const invite = useMutation({
    mutationFn: () =>
      api("/api/org/invite-member", { method: "POST", json: { email: email.trim(), role, organizationId: orgId } }),
    onSuccess: () => {
      setNotice(seatsFull ? `Invitation sent to ${email.trim()}. A seat was added to your subscription.` : `Invitation sent to ${email.trim()}.`);
      setEmail("");
      setInviteOpen(false);
      refresh();
    },
    onError: (err) => {
      // A free org's refusal is the upgrade modal's; on a paid plan a
      // refusal is a real message that belongs in the form.
      if (handleLimitError(err)) {
        setInviteOpen(false);
        return;
      }
      setError(err instanceof Error ? err.message : "Couldn't send the invitation.");
    },
  });

  const remove = useMutation({
    mutationFn: (memberId: string) =>
      api("/api/org/remove-member", { method: "POST", json: { memberIdOrEmail: memberId, organizationId: orgId } }),
    onSuccess: refresh,
    onError: (err) => setError(err instanceof Error ? err.message : "Couldn't remove the member."),
  });

  const cancelInvite = useMutation({
    mutationFn: (invitationId: string) => api("/api/org/cancel-invitation", { method: "POST", json: { invitationId } }),
    onSuccess: refresh,
    onError: (err) => setError(err instanceof Error ? err.message : "Couldn't cancel the invitation."),
  });

  const busy = invite.isPending || remove.isPending || cancelInvite.isPending;

  const inviteButton = admin && org.data && (
    <Button
      size="sm"
      variant="primary"
      onClick={() => {
        setError(null);
        setNotice(null);
        if (!canInvite) {
          openUpgrade("seats");
          return;
        }
        setInviteOpen(true);
      }}
    >
      Invite a teammate
    </Button>
  );

  return (
    <Section
      title="Members"
      description={
        admin
          ? `Invite teammates to ${org.data?.name ?? "your organization"}. Each seat is $${SEAT_PRICE_USD} a month; the allowances add up.`
          : "Who's in your organization. An owner or admin can invite more."
      }
      action={inviteButton || undefined}
    >
      {org.isLoading ? (
        <Spinner className="size-4 text-text-tertiary" />
      ) : org.isError || !org.data ? (
        <p className="text-[0.857rem] text-warning">Couldn&rsquo;t load the team. Check your connection and try again.</p>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-md border border-border">
            {org.data.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar name={m.user.name} email={m.user.email} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.929rem] text-text-primary">
                    {m.user.name || m.user.email}
                    {m.user.id === me?.id && <span className="text-text-tertiary"> (you)</span>}
                  </span>
                  {m.user.name && <span className="block truncate text-[0.786rem] text-text-tertiary">{m.user.email}</span>}
                </span>
                <RolePill role={m.role} />
                {admin && m.role !== "owner" && m.user.id !== me?.id && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Remove ${m.user.name || m.user.email} from the organization?`)) remove.mutate(m.id);
                    }}
                    className="text-[0.786rem] text-text-tertiary transition-colors hover:text-danger disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
            {pending.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar name="" email={inv.email} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.929rem] text-text-secondary">{inv.email}</span>
                  <span className="block text-[0.786rem] text-text-tertiary">Invited · waiting to accept</span>
                </span>
                <RolePill role={inv.role ?? "member"} />
                {admin && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => cancelInvite.mutate(inv.id)}
                    className="text-[0.786rem] text-text-tertiary transition-colors hover:text-danger disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>

          {admin && seats && (
            <p className="mt-3 text-[0.786rem] text-text-tertiary">
              {seats.used} of {seats.max} {seats.max === 1 ? "seat" : "seats"} in use
              {seatsFull && canInvite ? ` · the next invite adds a seat at $${SEAT_PRICE_USD}/month` : ""}
            </p>
          )}
          {notice && <p className="mt-3 text-[0.857rem] text-green">{notice}</p>}
          {error && <p className="mt-3 text-[0.857rem] text-danger">{error}</p>}
        </>
      )}

      <Modal open={inviteOpen} onClose={() => !invite.isPending && setInviteOpen(false)} labelledBy="invite-title">
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) invite.mutate();
          }}
        >
          <h2 id="invite-title" className="font-display text-lg font-semibold tracking-tight">
            Invite a teammate
          </h2>
          <p className="mt-1 text-[0.9rem] text-text-secondary">
            They&rsquo;ll get an email with a link to join {org.data?.name ?? "your organization"}.
            {seatsFull ? ` This adds a seat at $${SEAT_PRICE_USD} a month.` : ""}
          </p>
          <label className="mb-1.5 mt-4 block text-[0.857rem] text-text-secondary">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoFocus
            required
            className="h-9"
          />
          <label className="mb-1.5 mt-4 block text-[0.857rem] text-text-secondary">Role</label>
          <Choices
            options={["member", "admin"] as const}
            isActive={(r) => r === role}
            onPick={setRole}
            label={(r) => (r === "member" ? "Member" : "Admin")}
          />
          <p className="mt-2 text-[0.786rem] text-text-tertiary">Admins can invite and remove people and manage billing.</p>
          {error && <p className="mt-3 text-[0.857rem] text-danger">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)} disabled={invite.isPending} className="h-9">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={invite.isPending || !email.trim()} className={cx("h-9")}>
              {invite.isPending && <Spinner className="size-3.5 text-background" />}
              Send invite
            </Button>
          </div>
        </form>
      </Modal>
    </Section>
  );
}
