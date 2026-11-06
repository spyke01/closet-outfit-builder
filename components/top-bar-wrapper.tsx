"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "./top-bar";
import { useAppShell } from "@/lib/contexts/app-shell";

interface TopBarWrapperProps {
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  } | null;
}

export const TopBarWrapper: React.FC<TopBarWrapperProps> = ({ user }) => {
  const router = useRouter();
  const inAppShell = useAppShell();

  const handleTitleClick = () => {
    if (user) {
      router.push("/today");
    } else {
      router.push("/");
    }
  };

  const handleSettingsClick = () => {
    router.push("/settings");
  };

  if (inAppShell) return null;

  return (
    <TopBar
      user={user}
      onTitleClick={handleTitleClick}
      onSettingsClick={handleSettingsClick}
    />
  );
};
