"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, Plus, Save, X } from "lucide-react";
import { DocPreview } from "@/components/ui/FileInput";
import { Avatar, Field, PageHeader, Section, StatusBadge } from "@/components/ui/primitives";
import { formatDate, maskNumber } from "@/lib/format";
import { latestApplication } from "@/lib/selectors";
import { btn, field } from "@/lib/ui";
import { useTeacher } from "@/lib/use-teacher";

export default function TeacherProfilePage() {
  const { db, user, teacher, updateTeacherProfile } = useTeacher();
  const application = latestApplication(db, user!.id);
  const [form, setForm] = useState({
    headline: teacher.headline,
    bio: teacher.bio,
    institution: teacher.institution,
    experienceYears: teacher.experienceYears,
    qualifications: teacher.qualifications.length ? teacher.qualifications : [""],
  });

  const save = (e: FormEvent) => {
    e.preventDefault();
    updateTeacherProfile(teacher.id, {
      ...form,
      headline: form.headline.trim() || "Teacher on Root Over",
      qualifications: form.qualifications.map((q) => q.trim()).filter(Boolean),
    });
    toast.success("Teacher profile saved");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher profile"
        description="This is what students see on your public profile and course pages."
        actions={
          <Link href={`/teachers/${teacher.id}`} className={btn.secondary}>
            <Eye size={16} /> View public profile
          </Link>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={save} className="lg:col-span-2 rounded-lg border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={user!.name} src={user!.avatar} size="w-14 h-14" />
            <div className="text-sm">
              <p className="font-bold">{user!.name}</p>
              <p className="text-xs text-muted-foreground">
                Change your name and photo from{" "}
                <Link href="/profile" className="font-semibold text-primary hover:underline">
                  account settings
                </Link>
                .
              </p>
            </div>
          </div>
          <Field label="Headline" htmlFor="headline">
            <input id="headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} className={field} />
          </Field>
          <Field label="Bio" htmlFor="bio">
            <textarea id="bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={field} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Institution" htmlFor="institution">
              <input id="institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} className={field} />
            </Field>
            <Field label="Years of experience" htmlFor="experience">
              <input
                id="experience"
                type="number"
                min={0}
                value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
                className={field}
              />
            </Field>
          </div>
          <div>
            <span className="block text-sm font-semibold mb-1.5">Qualifications</span>
            <div className="space-y-2">
              {form.qualifications.map((q, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={q}
                    aria-label={`Qualification ${i + 1}`}
                    placeholder="e.g. MSc in Physics"
                    onChange={(e) =>
                      setForm({ ...form, qualifications: form.qualifications.map((x, j) => (j === i ? e.target.value : x)) })
                    }
                    className={field}
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, qualifications: form.qualifications.filter((_, j) => j !== i) })}
                    className={btn.ghost}
                    aria-label={`Remove qualification ${i + 1}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, qualifications: [...form.qualifications, ""] })}
              className={`${btn.small} mt-2`}
            >
              <Plus size={14} /> Add qualification
            </button>
          </div>
          <div className="flex justify-end">
            <button type="submit" className={btn.primary}>
              <Save size={16} /> Save profile
            </button>
          </div>
        </form>

        <Section title="Application & verification">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Teacher ID</dt>
              <dd className="font-mono font-bold">{teacher.teacherCode}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Joined</dt>
              <dd>{formatDate(teacher.joinedAt)}</dd>
            </div>
            {application && (
              <>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <StatusBadge status={application.status} />
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">NID</dt>
                  <dd className="font-mono">{maskNumber(application.nid)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">bKash</dt>
                  <dd className="font-mono">{maskNumber(application.bkashNumber)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">TIN</dt>
                  <dd className="font-mono">{maskNumber(application.tin)}</dd>
                </div>
              </>
            )}
          </dl>
          {application?.photo && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Submitted photo</p>
              <DocPreview doc={application.photo} />
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
