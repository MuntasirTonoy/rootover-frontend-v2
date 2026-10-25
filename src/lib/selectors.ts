// Pure read helpers over the demo database. Keep derived numbers here so every
// dashboard computes them the same way.
import { CLEARING_DAYS } from "./pricing";
import { DAY_MS } from "./format";
import type {
  Course,
  DemoDB,
  Enrollment,
  Lesson,
  Purchase,
  Role,
  TeacherProfile,
  User,
} from "./types";

export const dashboardPath = (role: Role) =>
  role === "admin" ? "/admin/dashboard" : role === "teacher" ? "/teacher/dashboard" : "/dashboard";

export const getUser = (db: DemoDB, id: string) => db.users.find((u) => u.id === id);
export const getTeacher = (db: DemoDB, id: string) => db.teachers.find((t) => t.id === id);
export const getTeacherByUser = (db: DemoDB, userId: string) =>
  db.teachers.find((t) => t.userId === userId);
export const getCourse = (db: DemoDB, id: string) => db.courses.find((c) => c.id === id);

export interface TeacherWithUser extends TeacherProfile {
  name: string;
  avatar?: string;
  email: string;
  status: User["status"];
}

export function teacherInfo(db: DemoDB, teacherId: string): TeacherWithUser | undefined {
  const teacher = getTeacher(db, teacherId);
  const user = teacher && getUser(db, teacher.userId);
  if (!teacher || !user) return undefined;
  return { ...teacher, name: user.name, avatar: user.avatar, email: user.email, status: user.status };
}

// Courses students can browse and buy: approved, and the teacher isn't banned
export function catalogCourses(db: DemoDB): Course[] {
  return db.courses.filter(
    (c) => c.status === "approved" && teacherInfo(db, c.teacherId)?.status === "active",
  );
}

export interface FlatLesson {
  lesson: Lesson;
  chapterId: string;
  chapterTitle: string;
  chapterIndex: number;
  index: number;
}

export function flattenLessons(course: Course): FlatLesson[] {
  let index = 0;
  return course.chapters.flatMap((chapter, chapterIndex) =>
    chapter.lessons.map((lesson) => ({
      lesson,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterIndex,
      index: index++,
    })),
  );
}

export const lessonCount = (course: Course) =>
  course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);

export const courseDuration = (course: Course) =>
  course.chapters.reduce(
    (sum, ch) => sum + ch.lessons.reduce((s, l) => s + l.durationMin, 0),
    0,
  );

export function findLesson(course: Course, lessonId: string) {
  return flattenLessons(course).find((f) => f.lesson.id === lessonId);
}

export function courseRating(course: Course) {
  const count = course.reviews.length;
  const average = count
    ? Math.round((course.reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
    : 0;
  return { average, count };
}

export const completedPurchases = (purchases: Purchase[]) =>
  purchases.filter((p) => p.status === "completed");

export const courseStudentCount = (db: DemoDB, courseId: string) =>
  db.enrollments.filter((e) => e.courseId === courseId).length;

// A student's enrollments joined with their courses
export function studentCourses(db: DemoDB, studentId: string) {
  return db.enrollments.flatMap((enrollment) => {
    const course = enrollment.studentId === studentId && getCourse(db, enrollment.courseId);
    return course ? [{ enrollment, course }] : [];
  });
}

export const enrollmentFor = (db: DemoDB, studentId: string, courseId: string) =>
  db.enrollments.find((e) => e.studentId === studentId && e.courseId === courseId);

export function progressOf(course: Course, enrollment?: Enrollment) {
  const total = lessonCount(course);
  const valid = new Set(flattenLessons(course).map((f) => f.lesson.id));
  const completed = enrollment
    ? enrollment.completedLessonIds.filter((id) => valid.has(id)).length
    : 0;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

// The lesson "Continue learning" should open
export function resumeLesson(course: Course, enrollment?: Enrollment): Lesson | undefined {
  const lessons = flattenLessons(course);
  if (enrollment?.lastLessonId) {
    const last = lessons.find((f) => f.lesson.id === enrollment.lastLessonId);
    if (last) return last.lesson;
  }
  const firstOpen = lessons.find((f) => !enrollment?.completedLessonIds.includes(f.lesson.id));
  return (firstOpen ?? lessons[0])?.lesson;
}

// Who may watch which lessons of a course
export function lessonAccess(db: DemoDB, course: Course, user: User | null) {
  const owner = !!user && getTeacherByUser(db, user.id)?.id === course.teacherId;
  const enrolled = !!user && !!enrollmentFor(db, user.id, course.id);
  const full = enrolled || owner || user?.role === "admin";
  return {
    enrolled,
    owner,
    full,
    canWatch: (lesson: Lesson) => full || lesson.isPreview,
  };
}

export const latestApplication = (db: DemoDB, userId: string) =>
  db.applications
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];

// ---------------------------------------------------------------- money

function sumBy<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((sum, item) => sum + pick(item), 0);
}

export interface SalesTotals {
  sales: number;
  listTotal: number;
  discounts: number;
  gross: number;
  commission: number;
  teacherNet: number;
  refunds: number;
  refundedCount: number;
}

// Gross = what students paid. Discounts = list price minus paid. Refunded sales are excluded.
export function salesTotals(purchases: Purchase[]): SalesTotals {
  const done = completedPurchases(purchases);
  const refunded = purchases.filter((p) => p.status === "refunded");
  const listTotal = sumBy(done, (p) => p.listPrice);
  const gross = sumBy(done, (p) => p.amountPaid);
  return {
    sales: done.length,
    listTotal,
    discounts: listTotal - gross,
    gross,
    commission: sumBy(done, (p) => p.commission),
    teacherNet: sumBy(done, (p) => p.teacherNet),
    refunds: sumBy(refunded, (p) => p.amountPaid),
    refundedCount: refunded.length,
  };
}

export interface TeacherFinance extends SalesTotals {
  pendingClearance: number;
  withdrawn: number;
  pendingWithdrawals: number;
  withdrawable: number;
}

// Net earnings = pending clearance + withdrawn + pending withdrawals + withdrawable
export function teacherFinance(db: DemoDB, teacherId: string, now = Date.now()): TeacherFinance {
  const purchases = db.purchases.filter((p) => p.teacherId === teacherId);
  const totals = salesTotals(purchases);
  const cutoff = now - CLEARING_DAYS * DAY_MS;
  const pendingClearance = sumBy(
    completedPurchases(purchases).filter((p) => new Date(p.createdAt).getTime() > cutoff),
    (p) => p.teacherNet,
  );
  const withdrawals = db.withdrawals.filter((w) => w.teacherId === teacherId);
  const withdrawn = sumBy(withdrawals.filter((w) => w.status === "approved"), (w) => w.amount);
  const pendingWithdrawals = sumBy(withdrawals.filter((w) => w.status === "pending"), (w) => w.amount);
  return {
    ...totals,
    pendingClearance,
    withdrawn,
    pendingWithdrawals,
    withdrawable: Math.max(0, totals.teacherNet - pendingClearance - withdrawn - pendingWithdrawals),
  };
}

export interface MonthPoint {
  month: string;
  gross: number;
  commission: number;
  net: number;
  sales: number;
}

export function monthlySeries(purchases: Purchase[], now = Date.now(), months = 6): MonthPoint[] {
  const end = new Date(now);
  const points: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const inMonth = completedPurchases(purchases).filter((p) => {
      const pd = new Date(p.createdAt);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
    });
    points.push({
      month: d.toLocaleDateString("en-GB", { month: "short" }),
      gross: sumBy(inMonth, (p) => p.amountPaid),
      commission: sumBy(inMonth, (p) => p.commission),
      net: sumBy(inMonth, (p) => p.teacherNet),
      sales: inMonth.length,
    });
  }
  return points;
}

export const studentsOf = (db: DemoDB) => db.users.filter((u) => u.role === "student");
