import type { Metadata, Viewport } from "next";
import { Oxanium, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const oxanium = Oxanium({
  subsets: ["latin"],
  variable: "--font-oxanium",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Warframe Build Agent",
  description:
    "Mobile-friendly Warframe advisor chat for builds, comparisons, world-state, and market context.",
  applicationName: "Warframe Build Agent",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "WF Build Agent",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d7e3ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${oxanium.variable} ${sourceSans.variable}`}>
      <body style={{ fontFamily: "var(--font-source), var(--font-body)" }}>
        {children}
      </body>
    </html>
  );
}
