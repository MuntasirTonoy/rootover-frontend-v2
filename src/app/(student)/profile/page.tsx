"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { Camera, GraduationCap, Loader2, PlayCircle, Save, UserRound } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Avatar, Field, PageHeader } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { ApiError, errorMessage } from "@/lib/api";
import type { EnrolledCourse } from "@/lib/api-types";
import type { User } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { btn, field, fieldError } from "@/lib/ui";

type Errors = { name?: string; phone?: string; password?: string; currentPassword?: string; _?: string };

const AVATARS = [
  "Felix", "Aneka", "Zoe", "Jack", "Bella", "Shadow", "Ginger", "Midnight",
  "Luna", "Max", "Charlie", "Oliver", "Lucy", "Coco", "Milo",
].map((seed) => `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`);

export default function ProfilePage() {
  const { user } = useApp();
  // Remount the form when the account changes so it starts from that user's data
  return user ? <ProfileForm key={user.id} user={user} /> : null;
}

function ProfileForm({ user }: { user: User }) {
  const { updateUser } = useApp();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? "",
    institution: user.institution ?? "",
    gender: user.gender ?? "",
    dateOfBirth: user.dateOfBirth ?? "",
    password: "",
    currentPassword: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [tempAvatar, setTempAvatar] = useState(user.avatar ?? "");

  // Only students have purchased courses
  const owned = useApi<EnrolledCourse[]>(user.role === "student" ? "/me/enrollments" : null).data ?? [];
  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    if (form.name.trim().length < 2) found.name = "Enter your full name.";
    if (form.phone && !/^01\d{9}$/.test(form.phone)) found.phone = "Use an 11-digit number starting with 01.";
    if (form.password && form.password.length < 6) found.password = "Use at least 6 characters.";
    if (form.password && !form.currentPassword) found.currentPassword = "Enter your current password.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    const { password, currentPassword, ...rest } = form;
    try {
      // Empty strings clear optional fields; a new password needs the current one
      await updateUser({ ...rest, name: rest.name.trim(), ...(password ? { password, currentPassword } : {}) });
      setForm((f) => ({ ...f, password: "", currentPassword: "" }));
      toast.success(password ? "Profile and password updated" : "Profile updated");
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : undefined;
      setErrors(fields && Object.keys(fields).length ? fields : { _: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  // Presets only for now: the API stores https links, and photo uploads arrive with the uploads endpoint
  const saveAvatar = async () => {
    try {
      await updateUser({ avatar: tempAvatar });
      setAvatarOpen(false);
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader title="Profile" description="Manage your account details." />

      {/* Mobile stacks the cards; desktop puts the form on the right spanning both rows */}
      <div className="grid md:grid-cols-3 gap-4 md:gap-6 items-start">
          <div className="md:col-start-1 md:row-start-1 rounded-lg border border-border bg-card p-4 md:p-6 flex items-center gap-4 md:flex-col md:text-center">
            <div className="relative shrink-0">
              <Avatar name={user.name} src={user.avatar} size="w-16 h-16 md:w-24 md:h-24 text-xl md:text-2xl" />
              <button
                onClick={() => {
                  setTempAvatar(user.avatar ?? "");
                  setAvatarOpen(true);
                }}
                className="absolute bottom-0 right-0 rounded-full border border-border bg-background p-2 text-primary hover:bg-primary hover:text-white"
                aria-label="Change avatar"
              >
                <Camera size={14} />
              </button>
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-foreground truncate">{user.name}</h2>
              <p className="text-xs text-muted-foreground break-all">{user.email}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-primary">{user.role}</p>
            </div>
          </div>

          {user.role === "student" && (
          <div className="md:col-start-1 md:row-start-2 rounded-lg border border-border bg-surface p-4 md:p-5">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-foreground">
              <GraduationCap size={18} className="text-primary" /> Purchased Courses
              <span className="ml-auto text-xs font-medium text-muted-foreground">{owned.length}</span>
            </h3>
            {owned.length ? (
              <div className="space-y-3">
                {owned.map(({ course, progress, resumeLessonId }) => (
                  <Link
                    key={course.id}
                    href={`/learn/${course.id}${resumeLessonId ? `?lesson=${resumeLessonId}` : ""}`}
                    className="block rounded-md border border-border bg-background p-3 hover:border-primary/50 group"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {course.level} · {course.subject}
                    </p>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary">{course.title}</h4>
                    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <UserRound size={14} className="shrink-0" />
                      <span className="truncate font-semibold text-foreground">{course.teacher.name}</span>
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <PlayCircle size={12} /> {progress.completed}/{progress.total} lessons · {progress.percent}%
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No purchased courses yet.{" "}
                <Link href="/courses" className="font-bold text-primary hover:underline">
                  Browse courses
                </Link>
              </p>
            )}
          </div>
          )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="md:col-start-2 md:col-span-2 md:row-start-1 md:row-span-2 rounded-lg border border-border bg-card p-4 md:p-6 space-y-5 md:max-h-[calc(100vh-8rem)] md:overflow-y-auto"
        >
          <h3 className="font-bold text-foreground">Account details</h3>
          <Field label="Full name" htmlFor="name" error={errors.name}>
            <input id="name" value={form.name} onChange={set("name")} className={`${field} ${errors.name ? fieldError : ""}`} />
          </Field>
          <Field label="Email" htmlFor="email" hint="Email can't be changed.">
            <input id="email" value={user.email} disabled className={field} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Mobile number" htmlFor="phone" error={errors.phone}>
              <input
                id="phone"
                inputMode="numeric"
                placeholder="01XXXXXXXXX"
                value={form.phone}
                onChange={set("phone")}
                className={`${field} ${errors.phone ? fieldError : ""}`}
              />
            </Field>
            <Field label="Institution" htmlFor="institution">
              <input id="institution" value={form.institution} onChange={set("institution")} className={field} />
            </Field>
            <Field label="Gender" htmlFor="gender">
              <select id="gender" value={form.gender} onChange={set("gender")} className={field}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Date of birth" htmlFor="dob">
              <input id="dob" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} className={field} />
            </Field>
          </div>
          <Field label="New password" htmlFor="password" error={errors.password} hint="Leave blank to keep your current password.">
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              className={`${field} ${errors.password ? fieldError : ""}`}
            />
          </Field>
          {/* Needed (and only shown) when changing the password */}
          {form.password && (
            <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword}>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={set("currentPassword")}
                className={`${field} ${errors.currentPassword ? fieldError : ""}`}
              />
            </Field>
          )}
          {errors._ && (
            <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
              {errors._}
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className={`${btn.primary} w-full sm:w-auto`}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save changes
            </button>
          </div>
        </form>
      </div>

      <Modal
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        title="Choose an avatar"
        footer={
          <>
            <button onClick={() => setAvatarOpen(false)} className={btn.secondary}>
              Cancel
            </button>
            <button onClick={saveAvatar} className={btn.primary}>
              Save avatar
            </button>
          </>
        }
      >
        <p className="mb-4 text-xs text-muted-foreground">Uploading your own photo is coming soon.</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {AVATARS.map((avatar, i) => (
            <button
              key={avatar}
              onClick={() => setTempAvatar(avatar)}
              aria-label={`Avatar ${i + 1}`}
              aria-pressed={tempAvatar === avatar}
              className={`aspect-square overflow-hidden rounded-md border-2 ${tempAvatar === avatar ? "border-primary" : "border-transparent hover:border-border"}`}
            >
              <img src={avatar} alt="" className="h-full w-full bg-surface object-cover" />
            </button>
          ))}
        </div>
        {tempAvatar && !AVATARS.includes(tempAvatar) && (
          <div className="mt-4 flex items-center gap-3 text-sm">
            <img src={tempAvatar} alt="Uploaded avatar preview" className="h-14 w-14 rounded-full object-cover" />
            Uploaded image selected
          </div>
        )}
      </Modal>
    </div>
  );
}
