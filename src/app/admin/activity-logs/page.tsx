"use client";

import { useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { Badge, FilterSelect, PageHeader, SearchInput } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatDateTime } from "@/lib/format";
import type { ActivityLog } from "@/lib/types";

const roleTone = { admin: "purple", teacher: "blue", student: "green", system: "gray" } as const;

export default function ActivityLogsPage() {
  const { db } = useApp();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");

  const q = query.trim().toLowerCase();
  const rows = db.activityLogs.filter(
    (l) =>
      (!role || l.actorRole === role) &&
      (!q || [l.actorName, l.action, l.target].some((s) => s.toLowerCase().includes(q))),
  );

  return (
    <div>
      <PageHeader title="Activity log" description="Audit trail of actions taken on the platform in this demo." />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by person, action or target" className="flex-1" />
        <FilterSelect
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: "", label: "All roles" },
            { value: "admin", label: "Admin" },
            { value: "teacher", label: "Teacher" },
            { value: "student", label: "Student" },
            { value: "system", label: "System" },
          ]}
        />
      </div>
      <DataTable<ActivityLog>
        rows={rows}
        rowKey={(l) => l.id}
        pageSize={15}
        emptyTitle="No activity matches"
        columns={[
          { header: "When", cell: (l) => <span className="whitespace-nowrap text-xs">{formatDateTime(l.at)}</span> },
          { header: "Who", cell: (l) => <span className="font-semibold">{l.actorName}</span> },
          { header: "Role", cell: (l) => <Badge tone={roleTone[l.actorRole]}>{l.actorRole}</Badge> },
          { header: "Action", cell: (l) => l.action },
          { header: "Target", cell: (l) => <span className="text-muted-foreground">{l.target}</span> },
        ]}
      />
    </div>
  );
}
