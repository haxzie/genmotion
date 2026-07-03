import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Jaro } from "next/font/google";
import { Providers } from "@/components/providers";
import { ReactGrab } from "@/components/react-grab";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "GenMotion",
  description: "AI-powered motion video studio",
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
    </html>
  );
}
