"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import CourseThumb from "./CourseThumb";
import CurriculumList from "./CurriculumList";
import { Avatar, Badge, courseStatusLabel, Field, StatusBadge } from "@/components/ui/primitives";
import { api, ApiError, errorMessage, withQuery } from "@/lib/api";
import type { Quote, TeacherPublic } from "@/lib/api-types";
import { confirmAction } from "@/lib/confirm";
import { formatBDT, formatDuration, uid } from "@/lib/format";
import { LEVELS, type Chapter, type Course, type Lesson } from "@/lib/types";
import { btn, field, fieldError } from "@/lib/ui";
import { uploadFile } from "@/lib/uploads";
import { useApi, useDebounced } from "@/lib/use-api";
import { editorErrors, saveCourse, submitCourse } from "@/lib/use-teacher";

type Errors = Record<string, string>;

const stepsMeta = ["Course information", "Curriculum", "Review & submit"];

function move<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const newLesson = (): Lesson => ({ id: uid("l"), title: "", durationMin: 10, videoUrl: "", isPreview: false });
const newChapter = (): Chapter => ({ id: uid("ch"), title: "", lessons: [newLesson()] });

export function blankCourse(teacherId: string): Course {
  const now = new Date().toISOString();
  return {
    id: uid("c"),
    teacherId,
    level: "SSC",
    subject: "",
    title: "",
    description: "",
    outcomes: [""],
    price: 1000,
    status: "draft",
    chapters: [newChapter()],
    createdAt: now,
    updatedAt: now,
  };
}

function validateInfo(c: Course): Errors {
  const e: Errors = {};
  if (c.title.trim().length < 5) e.title = "Give the course a title of at least 5 characters.";
  if (!c.subject.trim()) e.subject = "Enter the subject, e.g. Physics.";
  if (c.description.trim().length < 20) e.description = "Describe the course in at least 20 characters.";
  if (!c.outcomes.some((o) => o.trim())) e.outcomes = "Add at least one learning outcome.";
  if (!Number.isFinite(c.price) || c.price < 100) e.price = "The price must be at least ৳100.";
  if (c.discountPrice !== undefined && (c.discountPrice <= 0 || c.discountPrice >= c.price))
    e.discountPrice = "The discount price must be lower than the regular price.";
  return e;
}

function validateCurriculum(c: Course): Errors {
  const e: Errors = {};
  if (c.chapters.length === 0) e.chapters = "Add at least one chapter.";
  c.chapters.forEach((ch) => {
    if (!ch.title.trim()) e[`ch-${ch.id}`] = "Chapter title is required.";
    if (ch.lessons.length === 0) e[`ch-${ch.id}-lessons`] = "Add at least one lesson to this chapter.";
    ch.lessons.forEach((l) => {
      if (!l.title.trim()) e[`l-${l.id}-title`] = "Lesson title is required.";
      if (!(l.durationMin > 0)) e[`l-${l.id}-duration`] = "Enter a duration in minutes.";
      if (!l.videoUrl.trim()) e[`l-${l.id}-url`] = "Enter a valid YouTube link or embed code.";
      if (l.noteLink?.trim() && !/^https:\/\/\S+$/.test(l.noteLink.trim()))
        e[`l-${l.id}-note`] = "Enter a valid https link for the notes.";
    });
  });
  return e;
}

interface CourseWizardProps {
  initial: Course;
  teacher: TeacherPublic;
  isNew: boolean;
}

// Courses students can see (or soon will): the API only saves them complete
const GUARDED: Course["status"][] = ["pending", "approved", "suspended"];

export default function CourseWizard({ initial, teacher, isNew }: CourseWizardProps) {
  const router = useRouter();
  const [course, setCourse] = useState<Course>(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const update = (patch: Partial<Course>) => setCourse((c) => ({ ...c, ...patch }));
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // Uploaded straight away; the course references it once saved
  const pickThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingThumb(true);
    try {
      update({ thumbnail: (await uploadFile(file, "thumbnail")).url });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploadingThumb(false);
    }
  };
  const updateChapter = (id: string, patch: Partial<Chapter>) =>
    update({ chapters: course.chapters.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)) });
  const updateLesson = (chapterId: string, lessonId: string, patch: Partial<Lesson>) =>
    updateChapter(chapterId, {
      lessons: course.chapters
        .find((ch) => ch.id === chapterId)!
        .lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
    });

  const goTo = (target: number) => {
    // Moving forward requires every step being passed to be valid
    if (target > step) {
      const infoErrors = validateInfo(course);
      const curriculumErrors = target > 1 ? validateCurriculum(course) : {};
      const [blockingStep, blocking] = Object.keys(infoErrors).length
        ? [0, infoErrors]
        : [1, curriculumErrors];
      if (Object.keys(blocking).length) {
        setErrors(blocking);
        setStep(blockingStep);
        toast.error("Please fix the highlighted fields before continuing.");
        return;
      }
    }
    setErrors({});
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cleaned = (status: Course["status"]): Course => ({
    ...course,
    status,
    title: course.title.trim(),
    subject: course.subject.trim(),
    outcomes: course.outcomes.map((o) => o.trim()).filter(Boolean),
  });

  // Shows every missing field and jumps to the first step that has one
  const showErrors = (all: Errors, message: string) => {
    setErrors(all);
    setStep(Object.keys(validateInfo(course)).length ? 0 : 1);
    toast.error(message);
  };

  // Server field errors land on the same inputs as the editor's own checks
  const showServerError = (err: unknown, target: Course) => {
    if (err instanceof ApiError && err.fields && Object.keys(err.fields).length) {
      const mapped = editorErrors(err.fields, target);
      setErrors(mapped);
      setStep(Object.keys(mapped).some((k) => k.startsWith("ch-") || k.startsWith("l-") || k === "chapters") ? 1 : 0);
    }
    toast.error(errorMessage(err));
  };

  // Saves to the API and continues from what it returns (new chapters and
  // lessons get their real ids there). New courses move to their edit URL.
  const persist = async () => {
    const saved = await saveCourse(cleaned(course.status), isNew);
    setCourse(saved);
    if (isNew) router.replace(`/teacher/courses/${saved.id}/edit`);
    return saved;
  };

  const saveDraft = async () => {
    if (course.title.trim().length < 5) {
      setStep(0);
      setErrors({ title: "Give the course a title of at least 5 characters before saving." });
      return;
    }
    // A live or under-review course can't be saved incomplete
    if (GUARDED.includes(course.status)) {
      const all = { ...validateInfo(course), ...validateCurriculum(course) };
      if (Object.keys(all).length) return showErrors(all, "This course is live or under review, so every field must stay complete.");
    }
    setBusy(true);
    try {
      await persist();
      setErrors({});
      toast.success(isNew ? "Draft saved" : "Changes saved");
    } catch (err) {
      showServerError(err, course);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const all = { ...validateInfo(course), ...validateCurriculum(course) };
    if (Object.keys(all).length) return showErrors(all, "Complete every required field before submitting.");
    const ok = await confirmAction({
      title: "Submit for approval?",
      text: "An admin will review the course before students can buy it.",
      confirmText: "Submit",
    });
    if (!ok) return;
    setBusy(true);
    let saved: Course | undefined;
    try {
      // Save first: the API checks the saved course
      saved = await persist();
      await submitCourse(saved.id);
      toast.success("Course submitted for admin approval");
      router.push("/teacher/courses");
    } catch (err) {
      showServerError(err, saved ?? course);
    } finally {
      setBusy(false);
    }
  };

  const err = (key: string) => errors[key];
  // What students pay and the teacher earns comes from the API (it owns the money maths)
  const priceKey = useDebounced(`${course.price}|${course.discountPrice ?? ""}`);
  const [price, discountPrice] = priceKey.split("|");
  const earnings = useApi<Quote>(
    Number(price) > 0 ? withQuery("/teacher/price-preview", { price, discountPrice }) : null,
  ).data;
  const lessons = course.chapters.flatMap((ch) => ch.lessons);

  return (
    <div>
      {/* Status + step indicator */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold">{isNew ? "New course" : course.title || "Untitled course"}</span>
          <StatusBadge status={course.status} label={courseStatusLabel(course.status)} />
        </div>
        {course.statusNote && course.status === "rejected" && (
          <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            <b>Admin feedback:</b> {course.statusNote}
          </p>
        )}
        <ol className="grid grid-cols-3 gap-2">
          {stepsMeta.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => goTo(i)}
                className="w-full text-left"
                aria-current={step === i ? "step" : undefined}
              >
                <div className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted/20"}`} />
                <p className={`mt-2 text-xs font-semibold ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                  {i + 1}. {label}
                </p>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {step === 0 && (
        <div className="rounded-lg border border-border bg-card p-5 md:p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Educational level" htmlFor="level">
              <select
                id="level"
                value={course.level}
                onChange={(e) => update({ level: e.target.value as Course["level"] })}
                className={field}
              >
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Subject" htmlFor="subject" error={err("subject")}>
              <input
                id="subject"
                placeholder="e.g. Physics"
                value={course.subject}
                onChange={(e) => update({ subject: e.target.value })}
                className={`${field} ${err("subject") ? fieldError : ""}`}
              />
            </Field>
          </div>
          <Field label="Course title" htmlFor="title" error={err("title")}>
            <input
              id="title"
              placeholder="e.g. SSC Physics: Complete Course"
              value={course.title}
              onChange={(e) => update({ title: e.target.value })}
              className={`${field} ${err("title") ? fieldError : ""}`}
            />
          </Field>
          <Field label="Description" htmlFor="description" error={err("description")}>
            <textarea
              id="description"
              rows={4}
              placeholder="What does the course cover and who is it for?"
              value={course.description}
              onChange={(e) => update({ description: e.target.value })}
              className={`${field} ${err("description") ? fieldError : ""}`}
            />
          </Field>

          <div>
            <span className="block text-sm font-semibold mb-1.5">Learning outcomes</span>
            <div className="space-y-2">
              {course.outcomes.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={o}
                    placeholder={`Outcome ${i + 1}, e.g. Solve motion problems`}
                    aria-label={`Learning outcome ${i + 1}`}
                    onChange={(e) => update({ outcomes: course.outcomes.map((x, j) => (j === i ? e.target.value : x)) })}
                    className={field}
                  />
                  <button
                    type="button"
                    onClick={() => update({ outcomes: course.outcomes.filter((_, j) => j !== i) })}
                    disabled={course.outcomes.length === 1}
                    className={btn.ghost}
                    aria-label={`Remove outcome ${i + 1}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            {err("outcomes") && <p className="mt-1 text-xs font-medium text-red-600">{err("outcomes")}</p>}
            <button type="button" onClick={() => update({ outcomes: [...course.outcomes, ""] })} className={`${btn.small} mt-2`}>
              <Plus size={14} /> Add outcome
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Price (৳)" htmlFor="price" error={err("price")}>
              <input
                id="price"
                type="number"
                min={0}
                value={Number.isFinite(course.price) ? course.price : ""}
                onChange={(e) => update({ price: e.target.value === "" ? NaN : Number(e.target.value) })}
                className={`${field} ${err("price") ? fieldError : ""}`}
              />
            </Field>
            <Field label="Discount price (৳, optional)" htmlFor="discount" error={err("discountPrice")}>
              <input
                id="discount"
                type="number"
                min={0}
                value={course.discountPrice ?? ""}
                onChange={(e) => update({ discountPrice: e.target.value === "" ? undefined : Number(e.target.value) })}
                className={`${field} ${err("discountPrice") ? fieldError : ""}`}
              />
            </Field>
          </div>
          {Number.isFinite(course.price) && course.price > 0 && (
            <p className="rounded-md bg-surface px-3 py-2 text-xs text-muted-foreground">
              Students pay <b className="text-foreground">{formatBDT(earnings?.total)}</b>. After the platform commission (
              {formatBDT(earnings?.commission)}) you earn <b className="text-foreground">{formatBDT(earnings?.teacherNet)}</b> per sale
              before coupons.
            </p>
          )}

          {/* Without a thumbnail the course shows a cover generated from its level and subject */}
          <div>
            <span className="block text-sm font-semibold mb-1.5">Course thumbnail</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-40 shrink-0 overflow-hidden rounded-md border border-border">
                <CourseThumb course={course} />
              </div>
              <div className="flex flex-col items-start gap-2">
                <label className={`${btn.small} cursor-pointer`}>
                  {uploadingThumb ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingThumb ? "Uploading..." : course.thumbnail ? "Replace image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={pickThumbnail}
                    disabled={uploadingThumb}
                    className="sr-only"
                  />
                </label>
                {course.thumbnail && (
                  <button type="button" onClick={() => update({ thumbnail: undefined })} className="text-xs text-red-600 hover:underline">
                    Use the generated cover
                  </button>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB. 16:9 looks best.</p>
                {err("thumbnail") && <p className="text-xs text-red-600">{err("thumbnail")}</p>}
              </div>
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold mb-1.5">Teacher</span>
            <div className="flex items-center gap-3 rounded-md border border-border p-3 w-fit">
              <Avatar name={teacher.name} src={teacher.avatar} />
              <div className="text-sm">
                <p className="font-bold">{teacher.name}</p>
                <p className="text-xs text-muted-foreground">
                  {teacher.headline} · {teacher.teacherCode}
                </p>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Edit these details from your teacher profile.</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {err("chapters") && <p className="text-sm font-medium text-red-600">{err("chapters")}</p>}
          {course.chapters.map((chapter, ci) => (
            <div key={chapter.id} className="rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-start gap-2 border-b border-border bg-surface/60 p-3">
                <span className="mt-2.5 text-xs font-bold text-muted-foreground">CH {ci + 1}</span>
                <div className="min-w-[200px] flex-1">
                  <input
                    value={chapter.title}
                    placeholder="Chapter title, e.g. Motion"
                    aria-label={`Chapter ${ci + 1} title`}
                    onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                    className={`${field} font-semibold ${err(`ch-${chapter.id}`) ? fieldError : ""}`}
                  />
                  {err(`ch-${chapter.id}`) && <p className="mt-1 text-xs text-red-600">{err(`ch-${chapter.id}`)}</p>}
                </div>
                <div className="flex gap-1">
                  <IconButton label="Move chapter up" disabled={ci === 0} onClick={() => update({ chapters: move(course.chapters, ci, -1) })}>
                    <ArrowUp size={16} />
                  </IconButton>
                  <IconButton
                    label="Move chapter down"
                    disabled={ci === course.chapters.length - 1}
                    onClick={() => update({ chapters: move(course.chapters, ci, 1) })}
                  >
                    <ArrowDown size={16} />
                  </IconButton>
                  <IconButton
                    label="Delete chapter"
                    danger
                    onClick={async () => {
                      if (await confirmAction({ title: "Delete this chapter?", text: "Its lessons will be removed too.", danger: true, confirmText: "Delete" }))
                        update({ chapters: course.chapters.filter((c) => c.id !== chapter.id) });
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>

              <div className="divide-y divide-border">
                {chapter.lessons.map((lesson, li) => {
                  return (
                    <div key={lesson.id} className="p-3 space-y-3">
                      <div className="flex flex-wrap items-start gap-2">
                        <span className="mt-2.5 text-xs font-bold text-muted-foreground w-12">Part {li + 1}</span>
                        <div className="min-w-[180px] flex-1">
                          <input
                            value={lesson.title}
                            placeholder="Lesson title"
                            aria-label={`Chapter ${ci + 1} part ${li + 1} title`}
                            onChange={(e) => updateLesson(chapter.id, lesson.id, { title: e.target.value })}
                            className={`${field} ${err(`l-${lesson.id}-title`) ? fieldError : ""}`}
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min={1}
                            value={lesson.durationMin || ""}
                            aria-label={`Part ${li + 1} duration in minutes`}
                            onChange={(e) => updateLesson(chapter.id, lesson.id, { durationMin: Number(e.target.value) })}
                            className={`${field} ${err(`l-${lesson.id}-duration`) ? fieldError : ""}`}
                          />
                          <span className="text-[10px] text-muted-foreground">minutes</span>
                        </div>
                        <label className="mt-2 flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lesson.isPreview}
                            onChange={(e) => updateLesson(chapter.id, lesson.id, { isPreview: e.target.checked })}
                            className="accent-[var(--primary)] w-4 h-4"
                          />
                          Free preview
                        </label>
                        <div className="flex gap-1">
                          <IconButton
                            label="Move lesson up"
                            disabled={li === 0}
                            onClick={() => updateChapter(chapter.id, { lessons: move(chapter.lessons, li, -1) })}
                          >
                            <ArrowUp size={14} />
                          </IconButton>
                          <IconButton
                            label="Move lesson down"
                            disabled={li === chapter.lessons.length - 1}
                            onClick={() => updateChapter(chapter.id, { lessons: move(chapter.lessons, li, 1) })}
                          >
                            <ArrowDown size={14} />
                          </IconButton>
                          <IconButton
                            label="Delete lesson"
                            danger
                            onClick={() => updateChapter(chapter.id, { lessons: chapter.lessons.filter((l) => l.id !== lesson.id) })}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </div>
                      <div className="sm:pl-14">
                        <VideoLinkField
                          value={lesson.videoUrl}
                          label={`Part ${li + 1} video URL`}
                          title={lesson.title}
                          error={err(`l-${lesson.id}-url`)}
                          onChange={(videoUrl) => updateLesson(chapter.id, lesson.id, { videoUrl })}
                        />
                        {/* Optional lesson notes (PDF, Google Drive...); only buyers and preview viewers get the link */}
                        <input
                          value={lesson.noteLink ?? ""}
                          placeholder="Notes link (optional): https://..."
                          aria-label={`Part ${li + 1} notes link`}
                          onChange={(e) => updateLesson(chapter.id, lesson.id, { noteLink: e.target.value })}
                          className={`${field} mt-2 text-xs ${err(`l-${lesson.id}-note`) ? fieldError : ""}`}
                        />
                        {err(`l-${lesson.id}-note`) && (
                          <p className="mt-1 text-xs text-red-600">{err(`l-${lesson.id}-note`)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {err(`ch-${chapter.id}-lessons`) && (
                  <p className="p-3 text-xs text-red-600">{err(`ch-${chapter.id}-lessons`)}</p>
                )}
              </div>
              <div className="border-t border-border p-3">
                <button
                  type="button"
                  onClick={() => updateChapter(chapter.id, { lessons: [...chapter.lessons, newLesson()] })}
                  className={btn.small}
                >
                  <Plus size={14} /> Add lesson
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => update({ chapters: [...course.chapters, newChapter()] })} className={`${btn.secondary} w-full`}>
            <Plus size={16} /> Add chapter
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6 rounded-lg border border-border bg-card p-5">
            <CourseThumb course={course} className="rounded-md" />
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <Badge tone="primary">{course.level}</Badge>
                <span className="text-sm text-muted-foreground">{course.subject}</span>
              </div>
              <h2 className="text-xl font-extrabold">{course.title || "Untitled course"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {course.chapters.length} chapters · {lessons.length} lessons · {formatDuration(lessons.reduce((m, l) => m + l.durationMin, 0))}
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold">{formatBDT(earnings?.coursePrice)}</span>
                {!!earnings?.courseDiscount && <span className="text-muted-foreground line-through">{formatBDT(course.price)}</span>}
                <span className="text-xs text-muted-foreground">· you earn {formatBDT(earnings?.teacherNet)} per sale</span>
              </div>
            </div>
          </div>
          {course.outcomes.some((o) => o.trim()) && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-bold mb-2">Learning outcomes</h3>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {course.outcomes.filter((o) => o.trim()).map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h3 className="font-bold mb-2">Curriculum</h3>
            <CurriculumList chapters={course.chapters} />
          </div>
          <p className="text-sm text-muted-foreground">
            Submitting sends the course to an admin for approval. It appears in the catalog once approved.
          </p>
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <button type="button" onClick={() => goTo(step - 1)} disabled={step === 0} className={btn.secondary}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveDraft} disabled={busy} className={btn.secondary}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {course.status === "draft" ? "Save draft" : "Save changes"}
          </button>
          {step < 2 ? (
            <button type="button" onClick={() => goTo(step + 1)} className={btn.primary}>
              Next <ArrowRight size={16} />
            </button>
          ) : (
            // Only drafts and rejected courses can go (back) to review
            (course.status === "draft" || course.status === "rejected") && (
              <button type="button" onClick={submit} disabled={busy} className={btn.primary}>
                <Send size={16} /> Submit for approval
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`p-2 rounded-md border border-border disabled:opacity-30 ${danger ? "text-red-600 hover:bg-red-500/10" : "hover:bg-surface"}`}
    >
      {children}
    </button>
  );
}

// The lesson's video link. The backend owns YouTube parsing: "Check" asks
// GET /teacher/video-link for the embed form, then previews it. Saving
// normalises valid links and submitting rejects invalid ones (shown as `error`).
function VideoLinkField({
  value,
  label,
  title,
  error,
  onChange,
}: {
  value: string;
  label: string;
  title: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [check, setCheck] = useState<{ value: string; embedUrl?: string; error?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  // A result only counts for the text it was made for
  const result = check?.value === value ? check : null;
  const shownError = error || result?.error;

  const toggle = async () => {
    if (open) return setOpen(false);
    if (result?.embedUrl) return setOpen(true);
    setChecking(true);
    try {
      const { embedUrl } = await api<{ embedUrl: string }>(withQuery("/teacher/video-link", { url: value }));
      setCheck({ value, embedUrl });
      setOpen(true);
    } catch (err) {
      setCheck({ value, error: errorMessage(err) });
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <input
          value={value}
          placeholder="YouTube unlisted URL or <iframe> embed code"
          aria-label={label}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(false);
          }}
          className={`${field} font-mono text-xs ${shownError ? fieldError : ""}`}
        />
        <button
          type="button"
          disabled={!value.trim() || checking}
          onClick={toggle}
          className={btn.small}
          aria-label={open ? "Hide video preview" : "Check and preview the video"}
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : open ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {shownError ? (
        <p className="mt-1 text-xs text-red-600">{shownError}</p>
      ) : (
        result?.embedUrl && (
          <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 size={12} /> Valid YouTube video
          </p>
        )
      )}
      {open && result?.embedUrl && (
        <div className="mt-2 aspect-video w-full max-w-md overflow-hidden rounded-md bg-black">
          <iframe src={result.embedUrl} title={`Preview: ${title}`} className="h-full w-full" allowFullScreen />
        </div>
      )}
    </>
  );
}
