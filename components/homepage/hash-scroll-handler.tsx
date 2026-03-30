'use client';

import { useEffect } from "react";

function scrollToHashTarget() {
  if (typeof window === "undefined" || !window.location.hash) {
    return;
  }

  const id = window.location.hash.slice(1);
  if (!id) {
    return;
  }

  const target = document.getElementById(id);
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "auto", block: "start" });
}

export function HashScrollHandler() {
  useEffect(() => {
    const runScroll = () => {
      window.requestAnimationFrame(() => {
        scrollToHashTarget();
        window.setTimeout(scrollToHashTarget, 120);
      });
    };

    runScroll();
    window.addEventListener("hashchange", runScroll);

    return () => {
      window.removeEventListener("hashchange", runScroll);
    };
  }, []);

  return null;
}
