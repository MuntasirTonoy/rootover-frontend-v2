"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import type { ApiUser } from "@/lib/api-types";
import { confirmAction } from "@/lib/confirm";
import type { Role, UserStatus } from "@/lib/types";
import { btn } from "@/lib/ui";

// Ban / unban button with confirmation, shared by the teacher and student admin pages.
// `onChange` receives the new status once the API has saved it.
export default function BanToggle({
  user,
  onChange,
}: {
  user: { id: string; name: string; role: Role; status: UserStatus };
  onChange: (status: UserStatus) => void;
}) {
  const [busy, setBusy] = useState(false);
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
    setBusy(true);
    try {
      const saved = await api<ApiUser>(`/admin/users/${user.id}/status`, {
        method: "PATCH",
        body: { status: banned ? "active" : "banned" },
      });
      onChange(saved.status);
      toast.success(banned ? `${user.name} unbanned` : `${user.name} banned`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`${btn.small} ${banned ? "text-green-700 dark:text-green-400" : "text-red-600"}`}
    >
      {banned ? <CheckCircle2 size={14} /> : <Ban size={14} />}
      {banned ? "Unban" : "Ban"}
    </button>
  );
}
