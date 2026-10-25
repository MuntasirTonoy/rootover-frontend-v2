"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import { Field, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { confirmAction } from "@/lib/confirm";
import { formatBDT, formatDate, uid } from "@/lib/format";
import type { Coupon } from "@/lib/types";
import { btn, field, fieldError } from "@/lib/ui";
import { useTeacher } from "@/lib/use-teacher";

function couponState(c: Coupon): "active" | "inactive" | "expired" {
  if (new Date(c.expiresAt).getTime() < Date.now()) return "expired";
  return c.active ? "active" : "inactive";
}

export default function CouponsPage() {
  const { db, teacher, courses, saveCoupon, deleteCoupon } = useTeacher();
  const [editing, setEditing] = useState<Coupon | null>(null);
  const coupons = db.coupons
    .filter((c) => c.teacherId === teacher.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const openNew = () =>
    setEditing({
      id: uid("cp"),
      teacherId: teacher.id,
      code: "",
      type: "percent",
      value: 10,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      usageLimit: 50,
      usedCount: 0,
      courseId: null,
      active: true,
      createdAt: new Date().toISOString(),
    });

  const remove = async (c: Coupon) => {
    if (await confirmAction({ title: `Delete coupon ${c.code}?`, danger: true, confirmText: "Delete" })) {
      deleteCoupon(c.id);
      toast.success("Coupon deleted");
    }
  };

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Discount codes students can apply at checkout. Commission is charged on the discounted price."
        actions={
          <button onClick={openNew} className={btn.primary}>
            <Plus size={16} /> New coupon
          </button>
        }
      />
      <DataTable<Coupon>
        rows={coupons}
        rowKey={(c) => c.id}
        emptyTitle="No coupons yet"
        emptyDescription="Create a coupon to run a promotion."
        columns={[
          { header: "Code", cell: (c) => <span className="font-mono font-bold">{c.code}</span> },
          { header: "Discount", cell: (c) => (c.type === "percent" ? `${c.value}%` : formatBDT(c.value)) },
          {
            header: "Applies to",
            cell: (c) => (
              <span className="line-clamp-1 max-w-[200px]">
                {c.courseId ? courses.find((x) => x.id === c.courseId)?.title ?? "Removed course" : "All my courses"}
              </span>
            ),
          },
          { header: "Used", cell: (c) => `${c.usedCount} / ${c.usageLimit}` },
          { header: "Expires", cell: (c) => <span className="whitespace-nowrap">{formatDate(c.expiresAt)}</span> },
          { header: "Status", cell: (c) => <StatusBadge status={couponState(c)} /> },
          {
            header: "Actions",
            className: "text-right",
            cell: (c) => (
              <div className="flex justify-end items-center gap-1">
                <label className="mr-2 flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.active}
                    onChange={(e) => {
                      saveCoupon({ ...c, active: e.target.checked });
                      toast.success(`${c.code} ${e.target.checked ? "activated" : "deactivated"}`);
                    }}
                    className="accent-[var(--primary)] w-4 h-4"
                  />
                  Active
                </label>
                <button onClick={() => setEditing(c)} className={btn.ghost} aria-label={`Edit ${c.code}`}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(c)} className={`${btn.ghost} hover:text-red-600`} aria-label={`Delete ${c.code}`}>
                  <Trash2 size={15} />
                </button>
              </div>
            ),
          },
        ]}
      />

      {editing && (
        <CouponForm
          coupon={editing}
          courses={courses.filter((c) => c.status !== "draft")}
          existingCodes={db.coupons.filter((c) => c.teacherId === teacher.id && c.id !== editing.id).map((c) => c.code)}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            saveCoupon(c);
            setEditing(null);
            toast.success("Coupon saved");
          }}
        />
      )}
    </div>
  );
}

function CouponForm({
  coupon,
  courses,
  existingCodes,
  onClose,
  onSave,
}: {
  coupon: Coupon;
  courses: { id: string; title: string }[];
  existingCodes: string[];
  onClose: () => void;
  onSave: (c: Coupon) => void;
}) {
  const [form, setForm] = useState(coupon);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<Coupon>) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!/^[A-Z0-9]{4,15}$/.test(form.code)) found.code = "Use 4–15 letters or numbers.";
    else if (existingCodes.includes(form.code)) found.code = "You already have a coupon with this code.";
    if (!(form.value > 0)) found.value = "Enter a discount greater than 0.";
    if (form.type === "percent" && form.value > 90) found.value = "Percentage discounts are capped at 90%.";
    if (!(form.usageLimit >= 1)) found.usageLimit = "Allow at least one use.";
    setErrors(found);
    if (!Object.keys(found).length) onSave(form);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={coupon.code ? `Edit ${coupon.code}` : "New coupon"}
      size="md"
      footer={
        <>
          <button onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button type="submit" form="coupon-form" className={btn.primary}>
            Save coupon
          </button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Coupon code" htmlFor="code" error={errors.code}>
          <input
            id="code"
            value={form.code}
            onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })}
            placeholder="e.g. PHYSICS20"
            className={`${field} font-mono ${errors.code ? fieldError : ""}`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" htmlFor="type">
            <select id="type" value={form.type} onChange={(e) => set({ type: e.target.value as Coupon["type"] })} className={field}>
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount (৳)</option>
            </select>
          </Field>
          <Field label={form.type === "percent" ? "Discount (%)" : "Discount (৳)"} htmlFor="value" error={errors.value}>
            <input
              id="value"
              type="number"
              min={1}
              value={form.value || ""}
              onChange={(e) => set({ value: Number(e.target.value) })}
              className={`${field} ${errors.value ? fieldError : ""}`}
            />
          </Field>
        </div>
        <Field label="Applies to" htmlFor="course">
          <select id="course" value={form.courseId ?? ""} onChange={(e) => set({ courseId: e.target.value || null })} className={field}>
            <option value="">All my courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Expiry date" htmlFor="expires">
            <input
              id="expires"
              type="date"
              value={form.expiresAt.slice(0, 10)}
              onChange={(e) => e.target.value && set({ expiresAt: new Date(`${e.target.value}T23:59:59+06:00`).toISOString() })}
              className={field}
            />
          </Field>
          <Field label="Usage limit" htmlFor="limit" error={errors.usageLimit}>
            <input
              id="limit"
              type="number"
              min={1}
              value={form.usageLimit || ""}
              onChange={(e) => set({ usageLimit: Number(e.target.value) })}
              className={`${field} ${errors.usageLimit ? fieldError : ""}`}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} className="accent-[var(--primary)] w-4 h-4" />
          Active
        </label>
      </form>
    </Modal>
  );
}
