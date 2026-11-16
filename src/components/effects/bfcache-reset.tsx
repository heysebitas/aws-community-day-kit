"use client";

import { useEffect } from "react";

/** Forces a full page reload only on real browser back/forward navigation. */
export function BfcacheReset() {
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.isTrusted) {
        window.location.reload();
      }
    };
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
