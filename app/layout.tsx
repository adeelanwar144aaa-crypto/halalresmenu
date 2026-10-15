import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const runtime = "edge";
import { headers } from "next/headers";
import Script from "next/script";
import { DeferredMonetization } from "@/components/analytics/DeferredMonetization";
import { SiteChrome } from "@/components/layout/SiteChrome";
import {
  themeFromRestaurant,
  themeToCssProperties,
} from "@/lib/restaurant-theme";
import { shouldLoadAdSense } from "@/lib/adsense";
import { fetchRestaurantChromeBySlug } from "@/lib/supabase";
import "./globals.css";

const GA_ID = "G-LMCL7BMSJR";

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
  const host =
    hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const loadAdSense = shouldLoadAdSense(host);
  const restaurantSlug = hdrs.get("x-hrm-restaurant-slug");

  let themeStyle: CSSProperties | undefined;
  let isRestaurantTheme = false;

  if (restaurantSlug) {
    const restaurant = await fetchRestaurantChromeBySlug(restaurantSlug);
    if (restaurant) {
      isRestaurantTheme = true;
      themeStyle = themeToCssProperties(
        themeFromRestaurant(restaurant)
      ) as CSSProperties;
    }
  }

  return (
    <html
      lang="en-GB"
      className={isRestaurantTheme ? "restaurant-theme" : undefined}
      style={themeStyle}
    >
      <body className="min-h-screen font-sans antialiased">
        <SiteChrome>{children}</SiteChrome>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        <DeferredMonetization loadAdSense={loadAdSense} />
      </body>
    </html>
  );
}
