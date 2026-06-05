"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

/**
 * Hides global marketing header/footer on restaurant listing routes (`/:slug`, `/:slug/...`)
 * so the restaurant sticky nav can own the top of the viewport.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const showMarketingChrome =
    path === "/" ||
    path === "" ||
    path.startsWith("/search") ||
    path.startsWith("/invalid-subdomain");

  return (
    <div className="flex min-h-screen flex-col">
      {showMarketingChrome && <Header />}
      <main className="flex-1">{children}</main>
      {showMarketingChrome && <Footer />}
    </div>
  );
}
