import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Warframe Build Agent",
  description:
    "Mobile-friendly Warframe advisor chat for builds, comparisons, world-state, and market context — with an Ordis-inspired cephalon stage.",
  applicationName: "Warframe Build Agent",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "WF Build Agent",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080c12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${rajdhani.variable}`}
    >
      <body
        style={{
          fontFamily: "var(--font-rajdhani), var(--font-body)",
          ["--font-display" as string]: "var(--font-orbitron), var(--font-display)",
          ["--font-oxanium" as string]: "var(--font-orbitron)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
