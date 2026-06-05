import type { Metadata } from "next";

export const runtime = "edge";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SiteChrome } from "@/components/layout/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HalalResMenu — Halal restaurants, menus, and prayer-aware dining",
    template: "%s | HalalResMenu",
  },
  description:
    "Discover halal-certified restaurants, menus, nearby mosques, and prayer times.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_SITE_URL
      : `https://${process.env.NEXT_PUBLIC_SITE_URL ?? "halalresmenu.com"}`
  ),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
  verification: {
    other: {
      "msvalidate.01": "19B3BC36745E5D625E2994D3FDA67FE7",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SiteChrome>{children}</SiteChrome>
        <GoogleAnalytics gaId="G-LMCL7BMSJR" />
      </body>
    </html>
  );
}
