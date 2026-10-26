"use client";

import { useState } from "react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import { Badge, FilterSelect, PageHeader, SearchInput } from "@/components/ui/primitives";
import { withQuery } from "@/lib/api";
import type { Paginated } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";
import type { ActivityLog } from "@/lib/types";
import { useApi, useDebounced } from "@/lib/use-api";

const roleTone = { admin: "purple", teacher: "blue", student: "green", system: "gray" } as const;

export default function ActivityLogsPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim());
  // Newest first; q matches the person, the action or the target
  const list = useApi<Paginated<ActivityLog>>(withQuery("/admin/activity-logs", { role, q, page, limit: 15 }));
  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Activity log" description="Audit trail of actions taken on the platform." />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={filter(setQuery)} placeholder="Search by person, action or target" className="flex-1" />
        <FilterSelect
          label="Role"
          value={role}
          onChange={filter(setRole)}
          options={[
            { value: "", label: "All roles" },
            { value: "admin", label: "Admin" },
            { value: "teacher", label: "Teacher" },
            { value: "student", label: "Student" },
            { value: "system", label: "System" },
          ]}
        />
      </div>
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <DataTable<ActivityLog>
          rows={list.data.data}
          rowKey={(l) => l.id}
          emptyTitle="No activity matches"
          serverPage={{ ...list.data.pagination, onPageChange: setPage, loading: list.loading }}
          columns={[
            { header: "When", cell: (l) => <span className="whitespace-nowrap text-xs">{formatDateTime(l.at)}</span> },
            { header: "Who", cell: (l) => <span className="font-semibold">{l.actorName}</span> },
            { header: "Role", cell: (l) => <Badge tone={roleTone[l.actorRole]}>{l.actorRole}</Badge> },
            { header: "Action", cell: (l) => l.action },
            { header: "Target", cell: (l) => <span className="text-muted-foreground">{l.target}</span> },
          ]}
        />
      )}
    </div>
  );
}
