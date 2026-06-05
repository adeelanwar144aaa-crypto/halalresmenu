import type { Metadata } from "next";
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
      </body>
    </html>
  );
}
