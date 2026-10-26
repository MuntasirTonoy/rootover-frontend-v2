"use client";

import { toast } from "sonner";
import { ShieldOff } from "lucide-react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import { Avatar, Badge, Notice, PageHeader } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { api, errorMessage } from "@/lib/api";
import type { ApiUser } from "@/lib/api-types";
import { confirmAction } from "@/lib/confirm";
import { formatDate } from "@/lib/format";
import { btn } from "@/lib/ui";
import { useApi } from "@/lib/use-api";

export default function AdminsPage() {
  const { user } = useApp();
  // Oldest first: the account that set the site up is at the top
  const list = useApi<ApiUser[]>("/admin/admins");

  const removeAdmin = async (a: ApiUser) => {
    const ok = await confirmAction({
      title: `Remove ${a.name}'s admin role?`,
      text: "They become a student again and are signed out of the admin area.",
      danger: true,
      confirmText: "Remove admin",
    });
    if (!ok) return;
    try {
      await api(`/admin/users/${a.id}/role`, { method: "PATCH", body: { role: "student" } });
      list.setData((prev) => (prev ?? []).filter((x) => x.id !== a.id));
      toast.success(`${a.name} is no longer an admin`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader title="Admins" description="Everyone with access to the admin area." />
      <div className="mb-4">
        <Notice>Make a student an admin from the Students page. You can&apos;t remove your own admin role.</Notice>
      </div>
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <DataTable<ApiUser>
          rows={list.data}
          rowKey={(a) => a.id}
          emptyTitle="No admins"
          columns={[
            {
              header: "Admin",
              cell: (a) => (
                <div className="flex items-center gap-3 min-w-[200px]">
                  <Avatar name={a.name} src={a.avatar} size="w-9 h-9" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {a.name} {a.id === user?.id && <Badge tone="green">You</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                  </div>
                </div>
              ),
            },
            { header: "Member since", cell: (a) => <span className="whitespace-nowrap">{formatDate(a.createdAt)}</span> },
            {
              header: "Actions",
              className: "text-right",
              cell: (a) =>
                a.id === user?.id ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <div className="flex justify-end">
                    <button onClick={() => removeAdmin(a)} className={`${btn.small} text-red-600`}>
                      <ShieldOff size={14} /> Remove admin
                    </button>
                  </div>
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
