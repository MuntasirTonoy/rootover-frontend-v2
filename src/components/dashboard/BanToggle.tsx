"use client";

import { toast } from "sonner";
import { Ban, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppStore";
import { confirmAction } from "@/lib/confirm";
import type { User } from "@/lib/types";
import { btn } from "@/lib/ui";

// Ban / unban button with confirmation, shared by the teacher and student admin pages
export default function BanToggle({ user }: { user: User }) {
  const { setUserStatus } = useApp();
  const banned = user.status === "banned";

  const toggle = async () => {
    const ok = await confirmAction({
      title: banned ? `Unban ${user.name}?` : `Ban ${user.name}?`,
      text: banned
        ? "They will be able to log in again."
        : user.role === "teacher"
          ? "They will be signed out and their courses hidden from the catalog."
          : "They will be signed out and unable to log in.",
      danger: !banned,
      confirmText: banned ? "Unban" : "Ban",
    });
    if (!ok) return;
    setUserStatus(user.id, banned ? "active" : "banned");
    toast.success(banned ? `${user.name} unbanned` : `${user.name} banned`);
  };

  return (
    <button onClick={toggle} className={`${btn.small} ${banned ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
      {banned ? <CheckCircle2 size={14} /> : <Ban size={14} />}
      {banned ? "Unban" : "Ban"}
    </button>
  );
}
