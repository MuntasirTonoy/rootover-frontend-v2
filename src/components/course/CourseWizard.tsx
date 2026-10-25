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
  X,
} from "lucide-react";
import CourseThumb from "./CourseThumb";
import CurriculumList from "./CurriculumList";
import { Avatar, Badge, courseStatusLabel, Field, StatusBadge } from "@/components/ui/primitives";
import { ApiError, errorMessage } from "@/lib/api";
import type { TeacherPublic } from "@/lib/api-types";
import { confirmAction } from "@/lib/confirm";
import { formatBDT, formatDuration, uid } from "@/lib/format";
import { quote } from "@/lib/pricing";
import { courseDuration, lessonCount } from "@/lib/selectors";
import { LEVELS, type Chapter, type Course, type Lesson } from "@/lib/types";
import { btn, field, fieldError } from "@/lib/ui";
import { editorErrors, saveCourse, submitCourse } from "@/lib/use-teacher";
import { toEmbedUrl } from "@/lib/youtube";

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
    reviews: [],
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
      if (!toEmbedUrl(l.videoUrl)) e[`l-${l.id}-url`] = "Enter a valid YouTube link or embed code.";
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
  const [previewing, setPreviewing] = useState<string | null>(null);

  const update = (patch: Partial<Course>) => setCourse((c) => ({ ...c, ...patch }));
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
    chapters: course.chapters.map((ch) => ({
      ...ch,
      lessons: ch.lessons.map((l) => ({ ...l, videoUrl: toEmbedUrl(l.videoUrl) ?? l.videoUrl })),
    })),
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
  const earnings = quote(course);

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
              Students pay <b className="text-foreground">{formatBDT(earnings.total)}</b>. After the 10% platform commission (
              {formatBDT(earnings.commission)}) you earn <b className="text-foreground">{formatBDT(earnings.teacherNet)}</b> per sale
              before coupons.
            </p>
          )}

          {/* Uploads aren't connected yet; the generated level cover is used meanwhile */}
          <div>
            <span className="block text-sm font-semibold mb-1.5">Course thumbnail</span>
            <div className="flex items-center gap-3">
              <div className="w-40 shrink-0 overflow-hidden rounded-md border border-border">
                <CourseThumb course={course} />
              </div>
              <p className="text-xs text-muted-foreground">
                Uploading your own thumbnail is coming soon. Until then the course uses a cover generated from its level and
                subject.
              </p>
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
                  const embed = toEmbedUrl(lesson.videoUrl);
                  const urlError = err(`l-${lesson.id}-url`) || (lesson.videoUrl && !embed ? "This doesn't look like a YouTube link." : "");
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
                        <div className="flex gap-2">
                          <input
                            value={lesson.videoUrl}
                            placeholder="YouTube unlisted URL or <iframe> embed code"
                            aria-label={`Part ${li + 1} video URL`}
                            onChange={(e) => updateLesson(chapter.id, lesson.id, { videoUrl: e.target.value })}
                            className={`${field} font-mono text-xs ${urlError ? fieldError : ""}`}
                          />
                          <button
                            type="button"
                            disabled={!embed}
                            onClick={() => setPreviewing(previewing === lesson.id ? null : lesson.id)}
                            className={btn.small}
                            aria-label={previewing === lesson.id ? "Hide video preview" : "Show video preview"}
                          >
                            {previewing === lesson.id ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {urlError ? (
                          <p className="mt-1 text-xs text-red-600">{urlError}</p>
                        ) : (
                          embed && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 size={12} /> Valid YouTube video
                            </p>
                          )
                        )}
                        {previewing === lesson.id && embed && (
                          <div className="mt-2 aspect-video w-full max-w-md overflow-hidden rounded-md bg-black">
                            <iframe src={embed} title={`Preview: ${lesson.title}`} className="h-full w-full" allowFullScreen />
                          </div>
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
                {course.chapters.length} chapters · {lessonCount(course)} lessons · {formatDuration(courseDuration(course))}
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold">{formatBDT(earnings.coursePrice)}</span>
                {earnings.courseDiscount > 0 && <span className="text-muted-foreground line-through">{formatBDT(course.price)}</span>}
                <span className="text-xs text-muted-foreground">· you earn {formatBDT(earnings.teacherNet)} per sale</span>
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
