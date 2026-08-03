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
  icons: {
    icon: [
      { url: "/ordis-icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
          ["--font-display" as string]:
            "var(--font-orbitron), Orbitron, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
