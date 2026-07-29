"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, organization } from "@/lib/auth-client";
import { Button, Input, Spinner, cx } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useUpgrade } from "@/components/upgrade-modal";

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

function Avatar({ name, email }: { name: string; email: string }) {
  const label = (name || email).trim();
  const initials =
    label
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[0.786rem] font-medium text-text-primary ring-1 ring-border">
      {initials}
    </span>
  );
}

export default function MembersPage() {
  const { data } = useSession();
  const meId = data?.user.id;
  const orgId = data?.session.activeOrganizationId ?? null;
  const { openUpgrade, handleAuthClientError, canInvite, seats } = useUpgrade();
  const seatsFull = seats ? seats.used >= seats.max : false;

  const [org, setOrg] = useState<FullOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    const res = await organization.getFullOrganization({
      query: { organizationId: orgId },
    });
    setOrg((res.data as unknown as FullOrg) ?? null);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const myRole = org?.members.find((m) => m.user.id === meId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";
  const pending = (org?.invitations ?? []).filter((i) => i.status === "pending");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !orgId) return;
    setInviting(true);
    setError(null);
    setNotice(null);
    const res = await organization.inviteMember({
      email: email.trim(),
      role: inviteRole,
      organizationId: orgId,
    });
    setInviting(false);
    if (res.error) {
      // A plan/seat refusal opens the upgrade modal instead of showing a dead
      // end in the form — the auth client returns {error}, so it never reaches
      // handleLimitError.
      if (handleAuthClientError(res.error)) {
        setInviteOpen(false);
        return;
      }
      setError(res.error.message ?? "Couldn't send the invitation.");
      return;
    }
    setNotice(`Invitation sent to ${email.trim()}.`);
    setEmail("");
    load();
  }

  async function changeRole(memberId: string, role: string) {
    if (!orgId) return;
    setBusyId(memberId);
    await organization.updateMemberRole({
      memberId,
      role: role as "member" | "admin" | "owner",
      organizationId: orgId,
    });
    setBusyId(null);
    load();
  }

  async function removeMember(memberId: string) {
    if (!orgId || !confirm("Remove this member from the organization?")) return;
    setBusyId(memberId);
    await organization.removeMember({ memberIdOrEmail: memberId, organizationId: orgId });
    setBusyId(null);
    load();
  }

  async function cancelInvite(invitationId: string) {
    setBusyId(invitationId);
    await organization.cancelInvitation({ invitationId });
    setBusyId(null);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-8 pb-20 pt-10">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium">Members</h1>
        {!loading && org && canManage && (
          <Button
            variant="primary"
            onClick={() => {
              // Kept visible rather than hidden when the plan can't invite:
              // discovering the capability is the point of the upsell.
              if (!canInvite) {
                openUpgrade("invite");
                return;
              }
              if (seatsFull) {
                openUpgrade("seats");
                return;
              }
              setError(null);
              setNotice(null);
              setInviteOpen(true);
            }}
            className="h-9 gap-2"
          >
            Invite members
            {!canInvite && (
              <span className="rounded-full bg-background/15 px-1.5 py-0.5 text-[0.714rem] font-medium">
                Team
              </span>
            )}
          </Button>
        )}
      </div>
      <p className="mb-8 text-[0.95rem] text-text-secondary">
        {org
          ? `Manage who can collaborate in ${org.name}.`
          : "Invite teammates to collaborate in your organization."}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !org ? (
        <div className="rounded-md border border-dashed border-border py-14 text-center text-text-tertiary">
          No active organization.
        </div>
      ) : (
        <>
          {/* Members */}
          <div className="overflow-hidden rounded-xl border border-border">
            {org.members.map((m, i) => (
              <div
                key={m.id}
                className={cx(
                  "flex items-center gap-3 px-4 py-3",
                  i > 0 && "border-t border-border",
                )}
              >
                <Avatar name={m.user.name} email={m.user.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.95rem] text-text-primary">
                    {m.user.name || m.user.email}
                    {m.user.id === meId && (
                      <span className="ml-1.5 text-text-tertiary">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-[0.857rem] text-text-tertiary">
                    {m.user.email}
                  </p>
                </div>
                {canManage && m.role !== "owner" && m.user.id !== meId ? (
                  <>
                    <select
                      value={m.role}
                      disabled={busyId === m.id}
                      onChange={(e) => changeRole(m.id, e.target.value)}
                      className="h-8 rounded-md border border-border bg-surface px-2 text-[0.857rem] text-text-secondary outline-none focus:border-accent/60"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      disabled={busyId === m.id}
                      aria-label="Remove member"
                      className="flex size-8 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="text-[0.857rem] capitalize text-text-tertiary">
                    {m.role}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Pending invitations */}
          {pending.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-[0.95rem] font-medium text-text-secondary">
                Pending invitations
              </h2>
              <div className="overflow-hidden rounded-xl border border-border">
                {pending.map((inv, i) => (
                  <div
                    key={inv.id}
                    className={cx(
                      "flex items-center gap-3 px-4 py-3",
                      i > 0 && "border-t border-border",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.95rem] text-text-primary">
                        {inv.email}
                      </p>
                      <p className="text-[0.857rem] capitalize text-text-tertiary">
                        {inv.role ?? "member"} · pending
                      </p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => cancelInvite(inv.id)}
                        disabled={busyId === inv.id}
                        className="text-[0.857rem] text-text-tertiary transition-colors hover:text-danger disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        labelledBy="invite-title"
      >
        <form onSubmit={invite} className="p-6">
          <h2
            id="invite-title"
            className="font-display text-lg font-semibold tracking-tight"
          >
            Invite members
          </h2>
          <p className="mt-1 text-[0.9rem] text-text-secondary">
            They&apos;ll get an email invitation to join{" "}
            {org?.name ?? "your organization"}.
          </p>

          <label className="mb-1.5 mt-5 block text-[0.857rem] text-text-secondary">
            Email address
          </label>
          <Input
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            className="h-10"
          />

          <label className="mb-1.5 mt-4 block text-[0.857rem] text-text-secondary">
            Role
          </label>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
            className="h-10 w-full rounded-md border border-border bg-surface px-2.5 text-text-primary outline-none focus:border-accent/60"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>

          {seatsFull && seats && (
            <p className="mt-3 text-[0.857rem] text-warning">
              All {seats.max} seats are in use. Remove a member or cancel a
              pending invitation to free one up.
            </p>
          )}
          {error && <p className="mt-3 text-[0.857rem] text-danger">{error}</p>}
          {notice && <p className="mt-3 text-[0.857rem] text-success">{notice}</p>}

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setInviteOpen(false)}
              className="h-10"
            >
              Done
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={inviting || !email.trim() || seatsFull}
              className="h-10"
            >
              {inviting ? <Spinner className="text-background" /> : "Send invite"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
