import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const runtime = "edge";
import { headers } from "next/headers";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SiteChrome } from "@/components/layout/SiteChrome";
import {
  themeFromRestaurant,
  themeToCssProperties,
} from "@/lib/restaurant-theme";
import { fetchRestaurantBySlug } from "@/lib/supabase";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HalalResMenu | Halal Restaurants, Menus & Prayer-Aware Dining",
    template: "%s | HalalResMenu",
  },
  description:
    "Discover halal-certified restaurants, menus, nearby mosques, and prayer times across the UK.",
  openGraph: {
    title: "HalalResMenu | Halal Restaurants & Menus",
    description:
      "Discover halal-certified restaurants, menus, nearby mosques, and prayer times across the UK.",
    siteName: "HalalResMenu",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HalalResMenu | Halal Restaurants & Menus",
    description:
      "Discover halal-certified restaurants, menus, nearby mosques, and prayer times across the UK.",
  },
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hdrs = await headers();
  const restaurantSlug = hdrs.get("x-hrm-restaurant-slug");

  let themeStyle: CSSProperties | undefined;
  let isRestaurantTheme = false;

  if (restaurantSlug) {
    const restaurant = await fetchRestaurantBySlug(restaurantSlug);
    if (restaurant) {
      isRestaurantTheme = true;
      themeStyle = themeToCssProperties(
        themeFromRestaurant(restaurant)
      ) as CSSProperties;
    }
  }

  return (
    <html
      lang="en"
      className={isRestaurantTheme ? "restaurant-theme" : undefined}
      style={themeStyle}
    >
      <body className="min-h-screen font-sans antialiased">
        <SiteChrome>{children}</SiteChrome>
        <GoogleAnalytics gaId="G-LMCL7BMSJR" />
      </body>
    </html>
  );
}
