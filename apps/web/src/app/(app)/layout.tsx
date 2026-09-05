"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { currentPathForNext } from "@/lib/safe-next";
import { AppShell } from "@/components/app-shell";
import { UpgradeProvider } from "@/components/upgrade-modal";
import { Spinner } from "@/components/ui";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const onboarded = session?.user.onboardingCompleted ?? false;

  useEffect(() => {
    if (isPending) return;
    // Carry the page along: the desktop app sends people straight to
    // /settings/billing to upgrade, and without `next` a sign-in dropped them
    // on the dashboard with no idea what happened to the upgrade.
    const next = `?next=${encodeURIComponent(currentPathForNext())}`;
    if (!session) {
      router.replace(`/login${next}`);
    } else if (!onboarded) {
      router.replace(`/onboarding${next}`);
    }
  }, [session, isPending, onboarded, router]);

  if (isPending || !session || !onboarded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  return (
    <UpgradeProvider>
      <AppShell>{children}</AppShell>
    </UpgradeProvider>
  );
}
