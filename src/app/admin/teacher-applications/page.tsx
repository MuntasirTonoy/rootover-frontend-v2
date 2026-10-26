"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, Eye, XCircle } from "lucide-react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import { DocPreview } from "@/components/ui/FileInput";
import Modal from "@/components/ui/Modal";
import { FilterSelect, Notice, PageHeader, SearchInput, StatusBadge } from "@/components/ui/primitives";
import { api, errorMessage, withQuery } from "@/lib/api";
import type { AdminApplicationDetail, AdminApplicationRow, Paginated } from "@/lib/api-types";
import { confirmAction, promptReason } from "@/lib/confirm";
import { formatBDT, formatDate, formatDateTime } from "@/lib/format";
import { useConfig } from "@/lib/use-config";
import type { TeacherApplication } from "@/lib/types";
import { btn } from "@/lib/ui";
import { useApi, useDebounced } from "@/lib/use-api";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "payment_required", label: "Payment Required" },
  { value: "under_verification", label: "Under Verification" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

type Action = "request-payment" | "approve" | "reject";

export default function TeacherApplicationsPage() {
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const config = useConfig();
  const q = useDebounced(query.trim());
  // Newest first; q matches the applicant's name or account email
  const list = useApi<Paginated<AdminApplicationRow>>(withQuery("/admin/teacher-applications", { status, q, page, limit: 10 }));
  const viewing = useApi<AdminApplicationDetail>(viewingId && `/admin/teacher-applications/${viewingId}`);
  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  const act = async (a: TeacherApplication, action: Action) => {
    let body: { reason: string } | undefined;
    let done: string;
    if (action === "reject") {
      const reason = await promptReason({ title: `Reject ${a.fullName}'s application?`, confirmText: "Reject" });
      if (!reason) return;
      body = { reason };
      done = "Application rejected";
    } else {
      const copy = {
        "request-payment": {
          title: "Pass review and request the fee?",
          text: `${a.fullName} will be asked to pay the ${formatBDT(config?.registrationFee)} registration fee through bKash.`,
          done: "Registration fee requested",
        },
        approve: {
          title: `Approve ${a.fullName} as a teacher?`,
          text: "A Teacher ID is generated and teacher tools unlock for this account.",
          done: "Teacher approved",
        },
      }[action];
      if (!(await confirmAction({ title: copy.title, text: copy.text, confirmText: "Confirm" }))) return;
      done = copy.done;
    }
    setBusy(true);
    try {
      await api(`/admin/teacher-applications/${a.id}/${action}`, { method: "POST", body });
      toast.success(done);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
    list.reload();
    if (viewingId === a.id) viewing.reload();
  };

  const actions = (a: TeacherApplication) => (
    <div className="flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
      {a.status === "pending_review" && (
        <button disabled={busy} onClick={() => act(a, "request-payment")} className={btn.small}>
          <CreditCard size={14} /> Request fee
        </button>
      )}
      {a.status === "under_verification" && (
        <button disabled={busy} onClick={() => act(a, "approve")} className={`${btn.small} text-green-700 dark:text-green-400`}>
          <CheckCircle2 size={14} /> Approve
        </button>
      )}
      {["pending_review", "payment_required", "under_verification"].includes(a.status) && (
        <button disabled={busy} onClick={() => act(a, "reject")} className={`${btn.small} text-red-600`}>
          <XCircle size={14} /> Reject
        </button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Teacher applications"
        description="Review → request the registration fee (the applicant is emailed) → paying it through bKash approves the teacher automatically."
      />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={filter(setQuery)} placeholder="Search applicants" className="flex-1" />
        <FilterSelect label="Status" value={status} onChange={filter(setStatus)} options={statusOptions} />
      </div>
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <DataTable<AdminApplicationRow>
          rows={list.data.data}
          rowKey={(a) => a.id}
          emptyTitle="No applications"
          serverPage={{ ...list.data.pagination, onPageChange: setPage, loading: list.loading }}
          columns={[
            {
              header: "Applicant",
              cell: (a) => (
                <div className="min-w-[160px]">
                  <p className="font-semibold">{a.fullName}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
              ),
            },
            { header: "Submitted", cell: (a) => <span className="whitespace-nowrap">{formatDate(a.submittedAt)}</span> },
            {
              header: "Fee",
              cell: (a) =>
                a.feePaid ? (
                  <StatusBadge status="completed" label="Paid" />
                ) : (
                  <span className="text-xs text-muted-foreground">Not paid</span>
                ),
            },
            { header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
            {
              header: "Actions",
              className: "text-right",
              cell: (a) => (
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <button onClick={() => setViewingId(a.id)} className={btn.small}>
                    <Eye size={14} /> Details
                  </button>
                  {actions(a)}
                </div>
              ),
            },
          ]}
        />
      )}

      {viewingId && (
        <Modal
          open
          onClose={() => setViewingId(null)}
          title={`Application: ${viewing.data?.application.fullName ?? ""}`}
          size="xl"
          footer={viewing.data && actions(viewing.data.application)}
        >
          {!ready(viewing) ? <ApiStatus state={viewing} className="min-h-[30vh]" /> : <ApplicationDetails detail={viewing.data} />}
        </Modal>
      )}
    </div>
  );
}

function ApplicationDetails({ detail }: { detail: AdminApplicationDetail }) {
  const { application: a, registrationFee: fee, teacher } = detail;
  const demo = useConfig()?.demo;
  const rows: [string, string][] = [
    ["Full name", a.fullName],
    ["Account email", detail.email],
    ["NID number", a.nid],
    ["bKash number", a.bkashNumber],
    ["TIN number", a.tin],
    ["Date of birth", a.dateOfBirth ? formatDate(a.dateOfBirth) : "—"],
    ["Gender", a.gender],
    ["Submitted", formatDateTime(a.submittedAt)],
    ["Last updated", formatDateTime(a.updatedAt)],
  ];
  const docs = [
    ["Profile photograph", a.photo],
    ["SSC certificate", a.sscCertificate],
    ["HSC certificate", a.hscCertificate],
    ["Father's voter ID", a.fatherVoterId],
  ] as const;

  return (
    <div className="space-y-5">
      {demo && <Notice>Demo data: identity numbers and documents are fictional.</Notice>}
      <div className="flex items-center gap-2">
        <StatusBadge status={a.status} />
        {teacher && <span className="text-sm">Teacher ID <b className="font-mono">{teacher.teacherCode}</b></span>}
      </div>
      {a.reviewNote && (
        <p className="text-sm">
          <b>Review note:</b> {a.reviewNote}
        </p>
      )}
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-border/60 py-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-right break-all">{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h3 className="mb-2 text-sm font-bold">Documents</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {docs.map(([label, doc]) => (
            <div key={label}>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
              {doc ? (
                <>
                  <DocPreview doc={doc} large />
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">{doc.name}</p>
                </>
              ) : (
                <p className="text-xs text-red-600">Missing</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold">Registration fee</h3>
        {fee ? (
          <p className="text-sm">
            {formatBDT(fee.amount)} via {fee.method} from {fee.payerNumber} on {formatDateTime(fee.paidAt)} ·{" "}
            <span className="font-mono">{fee.trxId}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Not paid yet.</p>
        )}
      </div>
    </div>
  );
}
