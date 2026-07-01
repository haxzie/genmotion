"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppShell } from "@/components/app-shell";
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
    if (!session) {
      router.replace("/login");
    } else if (!onboarded) {
      router.replace("/onboarding");
    }
  }, [session, isPending, onboarded, router]);

  if (isPending || !session || !onboarded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
