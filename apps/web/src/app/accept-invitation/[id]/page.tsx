"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, organization } from "@/lib/auth-client";
import { Button, Spinner } from "@/components/ui";

interface InvitationInfo {
  organizationId?: string;
  organizationName?: string;
  email?: string;
  status?: string;
  role?: string | null;
}

export default function AcceptInvitationPage() {
  const params = useParams<{ id: string }>();
  const invitationId = params.id;
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [invite, setInvite] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending || !session) return;
    (async () => {
      const res = await organization.getInvitation({
        query: { id: invitationId },
      });
      if (res.error) {
        setError(res.error.message ?? "This invitation is invalid or expired.");
      } else {
        setInvite(res.data as unknown as InvitationInfo);
      }
      setLoading(false);
    })();
  }, [invitationId, session, isPending]);

  async function accept() {
    setWorking(true);
    setError(null);
    const res = await organization.acceptInvitation({ invitationId });
    if (res.error) {
      setError(res.error.message ?? "Couldn't accept the invitation.");
      setWorking(false);
      return;
    }
    if (invite?.organizationId) {
      await organization.setActive({ organizationId: invite.organizationId });
    }
    router.replace("/settings/members");
  }

  async function decline() {
    setWorking(true);
    await organization.rejectInvitation({ invitationId });
    router.replace("/dashboard");
  }

  const card = (children: React.ReactNode) => (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="GenMotion"
          className="mx-auto mb-6 size-9 rounded-[6px]"
        />
        {children}
      </div>
    </main>
  );

  if (isPending || (session && loading)) {
    return card(<Spinner className="mx-auto" />);
  }

  if (!session) {
    return card(
      <>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          You&apos;ve been invited
        </h1>
        <p className="mt-2 text-text-secondary">
          Sign in to accept this invitation and join the organization.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-cta px-4 font-medium text-background transition-colors hover:bg-cta-hover"
        >
          Sign in to continue
        </Link>
      </>,
    );
  }

  if (error) {
    return card(
      <>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Invitation unavailable
        </h1>
        <p className="mt-2 text-text-secondary">{error}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface-raised px-4 font-medium text-text-primary transition-colors hover:bg-surface-hover"
        >
          Go to dashboard
        </Link>
      </>,
    );
  }

  return card(
    <>
      <h1 className="font-display text-xl font-semibold tracking-tight">
        Join {invite?.organizationName ?? "the organization"}
      </h1>
      <p className="mt-2 text-text-secondary">
        You were invited to collaborate
        {invite?.role ? ` as ${invite.role}` : ""} on GenMotion.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <Button
          variant="secondary"
          onClick={decline}
          disabled={working}
          className="h-10"
        >
          Decline
        </Button>
        <Button
          variant="primary"
          onClick={accept}
          disabled={working}
          className="h-10"
        >
          {working ? <Spinner className="text-background" /> : "Accept invitation"}
        </Button>
      </div>
    </>,
  );
}
