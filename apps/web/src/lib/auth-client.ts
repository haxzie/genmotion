import { createAuthClient } from "better-auth/react";
import {
  magicLinkClient,
  organizationClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001",
  plugins: [
    magicLinkClient(),
    organizationClient(),
    // Type the extra user fields (set during onboarding) on the session.
    inferAdditionalFields({
      user: {
        onboardingCompleted: { type: "boolean" },
        jobRole: { type: "string" },
      },
    }),
  ],
});

export const { signIn, signOut, useSession, organization, updateUser } =
  authClient;
