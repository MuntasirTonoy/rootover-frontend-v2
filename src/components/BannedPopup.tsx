"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/AppStore";

// Signs out a user whose account an admin bans while they're logged in
export default function BannedPopup() {
  const { user, logout } = useApp();
  const banned = user?.status === "banned";

  useEffect(() => {
    if (!banned) return;
    logout();
    toast.error("Your account has been suspended by an administrator.");
  }, [banned, logout]);

  return null;
}
