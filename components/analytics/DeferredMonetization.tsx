"use client";

import { useEffect } from "react";
import { ADSENSE_SCRIPT_SRC } from "@/lib/adsense";

const GA_ID = "G-LMCL7BMSJR";

/** Load GA4 + AdSense after window load so LCP is not competing with third parties. */
export function DeferredMonetization({
  loadAdSense,
}: {
  loadAdSense: boolean;
}) {
  useEffect(() => {
    const run = () => {
      if (!document.querySelector("script[data-hrm-deferred-ga]")) {
        const ga = document.createElement("script");
        ga.async = true;
        ga.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        ga.dataset.hrmDeferredGa = "1";
        document.head.appendChild(ga);

        window.dataLayer = window.dataLayer ?? [];
        const gtag = (...args: unknown[]) => {
          window.dataLayer?.push(args);
        };
        gtag("js", new Date());
        gtag("config", GA_ID);
      }

      if (
        loadAdSense &&
        !document.querySelector("script[data-hrm-deferred-adsense]")
      ) {
        const ads = document.createElement("script");
        ads.async = true;
        ads.src = ADSENSE_SCRIPT_SRC;
        ads.crossOrigin = "anonymous";
        ads.dataset.hrmDeferredAdsense = "1";
        document.head.appendChild(ads);
      }
    };

    if (document.readyState === "complete") {
      run();
    } else {
      window.addEventListener("load", run, { once: true });
      return () => window.removeEventListener("load", run);
    }
  }, [loadAdSense]);

  return null;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}
