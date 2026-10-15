"use client";

import { useEffect } from "react";
import { ADSENSE_SCRIPT_SRC } from "@/lib/adsense";

/** Load AdSense after window load so LCP is not competing with ad scripts. */
export function DeferredMonetization({
  loadAdSense,
}: {
  loadAdSense: boolean;
}) {
  useEffect(() => {
    if (!loadAdSense) return;

    const run = () => {
      if (document.querySelector("script[data-hrm-deferred-adsense]")) return;
      const ads = document.createElement("script");
      ads.async = true;
      ads.src = ADSENSE_SCRIPT_SRC;
      ads.crossOrigin = "anonymous";
      ads.dataset.hrmDeferredAdsense = "1";
      document.head.appendChild(ads);
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
