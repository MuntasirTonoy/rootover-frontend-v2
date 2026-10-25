"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, Eye, XCircle } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { DocPreview } from "@/components/ui/FileInput";
import Modal from "@/components/ui/Modal";
import { FilterSelect, PageHeader, SearchInput, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { confirmAction, promptReason } from "@/lib/confirm";
import { formatBDT, formatDate, formatDateTime } from "@/lib/format";
import { getUser } from "@/lib/selectors";
import type { TeacherApplication } from "@/lib/types";
import { btn } from "@/lib/ui";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "payment_required", label: "Payment Required" },
  { value: "under_verification", label: "Under Verification" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function TeacherApplicationsPage() {
  const { db, reviewApplication } = useApp();
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const rows = db.applications
    .filter((a) => (!status || a.status === status) && (!q || a.fullName.toLowerCase().includes(q)))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const viewing = db.applications.find((a) => a.id === viewingId);

  const act = async (a: TeacherApplication, action: "request_payment" | "approve" | "reject") => {
    if (action === "reject") {
      const reason = await promptReason({ title: `Reject ${a.fullName}'s application?`, confirmText: "Reject" });
      if (!reason) return;
      reviewApplication(a.id, "reject", reason);
      toast.success("Application rejected");
      return;
    }
    const copy = {
      request_payment: {
        title: "Pass review and request the fee?",
        text: `${a.fullName} will be asked to pay the ${formatBDT(300)} registration fee (simulated).`,
        done: "Registration fee requested",
      },
      approve: {
        title: `Approve ${a.fullName} as a teacher?`,
        text: "A Teacher ID is generated and teacher tools unlock for this account.",
        done: "Teacher approved",
      },
    }[action];
    if (await confirmAction({ title: copy.title, text: copy.text, confirmText: "Confirm" })) {
      reviewApplication(a.id, action);
      toast.success(copy.done);
    }
  };

  const actions = (a: TeacherApplication) => (
    <div className="flex flex-wrap justify-end gap-1">
      {a.status === "pending_review" && (
        <button onClick={() => act(a, "request_payment")} className={btn.small}>
          <CreditCard size={14} /> Request fee
        </button>
      )}
      {a.status === "under_verification" && (
        <button onClick={() => act(a, "approve")} className={`${btn.small} text-green-700 dark:text-green-400`}>
          <CheckCircle2 size={14} /> Approve
        </button>
      )}
      {["pending_review", "payment_required", "under_verification"].includes(a.status) && (
        <button onClick={() => act(a, "reject")} className={`${btn.small} text-red-600`}>
          <XCircle size={14} /> Reject
        </button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Teacher applications"
        description="Review → request ৳300 fee → applicant pays (simulated) → verify and approve."
      />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search applicants" className="flex-1" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
      </div>
      <DataTable<TeacherApplication>
        rows={rows}
        rowKey={(a) => a.id}
        emptyTitle="No applications"
        columns={[
          {
            header: "Applicant",
            cell: (a) => (
              <div className="min-w-[160px]">
                <p className="font-semibold">{a.fullName}</p>
                <p className="text-xs text-muted-foreground">{getUser(db, a.userId)?.email}</p>
              </div>
            ),
          },
          { header: "Submitted", cell: (a) => <span className="whitespace-nowrap">{formatDate(a.submittedAt)}</span> },
          {
            header: "Fee",
            cell: (a) =>
              db.registrationFees.some((f) => f.applicationId === a.id) ? (
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
              <div className="flex justify-end gap-1">
                <button onClick={() => setViewingId(a.id)} className={btn.small}>
                  <Eye size={14} /> Details
                </button>
                {actions(a)}
              </div>
            ),
          },
        ]}
      />

      {viewing && (
        <Modal open onClose={() => setViewingId(null)} title={`Application: ${viewing.fullName}`} size="xl" footer={actions(viewing)}>
          <ApplicationDetails application={viewing} />
        </Modal>
      )}
    </div>
  );
}

function ApplicationDetails({ application: a }: { application: TeacherApplication }) {
  const { db } = useApp();
  const fee = db.registrationFees.find((f) => f.applicationId === a.id);
  const teacher = a.teacherId ? db.teachers.find((t) => t.id === a.teacherId) : undefined;
  const rows: [string, string][] = [
    ["Full name", a.fullName],
    ["Account email", getUser(db, a.userId)?.email ?? "—"],
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
      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
        Demo data: identity numbers and documents are fictional.
      </p>
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
            {formatBDT(fee.amount)} via {fee.method} (simulated) from {fee.payerNumber} on {formatDateTime(fee.paidAt)} ·{" "}
            <span className="font-mono">{fee.trxId}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Not paid yet.</p>
        )}
      </div>
    </div>
  );
}
