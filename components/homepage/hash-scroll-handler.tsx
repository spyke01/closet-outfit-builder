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

function redirectAuthQueryParams() {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");

  if (code) {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("code", code);

    const next = params.get("next");
    if (next) {
      callbackUrl.searchParams.set("next", next);
    }

    window.location.replace(callbackUrl.toString());
    return;
  }

  if (error) {
    const errorUrl = new URL("/auth/auth-code-error", window.location.origin);
    errorUrl.searchParams.set("error", params.get("error_description") || "Authentication failed");
    window.location.replace(errorUrl.toString());
  }
}

export function HashScrollHandler() {
  useEffect(() => {
    redirectAuthQueryParams();

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
