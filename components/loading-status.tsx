"use client";

import { useEffect, useState } from "react";

export function LoadingStatus({ label }: { label: string }) {
  const [slow, setSlow] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {offline
        ? `You’re offline. Reconnect to load ${label}.`
        : slow
          ? `Still loading ${label}. You can open another page while you wait.`
          : `Loading ${label}…`}
    </p>
  );
}
