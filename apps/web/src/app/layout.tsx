import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Jaro } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Providers } from "@/components/providers";
import { ReactGrab } from "@/components/react-grab";
import { OG_IMAGE, TWITTER_HANDLE } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import "./globals.css";

// Read straight from the env here rather than via @/lib/analytics — that module
// pulls in posthog-js, which has no business in the server bundle.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

// Display face for the GenMotion logo wordmark.
const jaro = Jaro({
  subsets: ["latin"],
  variable: "--font-jaro",
});

const DEFAULT_TITLE = "GenMotion — AI Motion Video Studio";
const DEFAULT_DESCRIPTION =
  "Describe a video in plain language and GenMotion's agent animates it as real scenes, previews it frame-accurately, and exports a pixel-perfect MP4.";

// Fallback card for every route. Pages that set their own metadata go through
// `pageMetadata` in @/lib/marketing/seo; anything else (the app shell, auth,
// the client-rendered tool pages) inherits these tags.
export const metadata: Metadata = {
  // Makes the relative /og.png resolve to an absolute URL in the meta tags —
  // required, since crawlers won't follow a relative og:image.
  metadataBase: new URL(SITE_URL),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${jetbrainsMono.variable} ${jaro.variable}`}
    >
      <body>
        <ReactGrab />
        <Providers>{children}</Providers>
      </body>
      {/* Loads gtag.js with Next's `afterInteractive` strategy. Omitted
          entirely when NEXT_PUBLIC_GA_ID is unset (e.g. local dev). */}
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
