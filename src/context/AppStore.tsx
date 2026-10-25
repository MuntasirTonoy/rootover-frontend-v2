"use client";

// Demo store + mock authentication. FOR UI PREVIEW ONLY - this is not secure:
// passwords are plain text in the bundle and the "session" is a localStorage
// key. The whole demo database lives in React state and is persisted to
// localStorage so actions survive refreshes and sync across tabs.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { createSeedDB, DB_VERSION, DEMO_ACCOUNTS } from "@/lib/seed";
import { checkCoupon, MIN_WITHDRAWAL, quote, REGISTRATION_FEE } from "@/lib/pricing";
import { trxId, uid } from "@/lib/format";
import {
  catalogCourses,
  enrollmentFor,
  findLesson,
  getTeacherByUser,
  lessonAccess,
  teacherFinance,
} from "@/lib/selectors";
import { isActiveReport, reportContext } from "@/lib/reports";
import type {
  ApplicationStatus,
  Coupon,
  Course,
  CourseStatus,
  DemoDB,
  PaymentMethod,
  Purchase,
  ReportReason,
  Role,
  TeacherApplication,
  TeacherProfile,
  User,
  UserStatus,
  VideoReport,
  WithdrawalStatus,
} from "@/lib/types";

const DB_KEY = "rootover_demo_db";
const SESSION_KEY = "rootover_demo_session";

export type ApplicationInput = Omit<
  TeacherApplication,
  "id" | "userId" | "status" | "submittedAt" | "updatedAt" | "reviewNote" | "teacherId"
>;

interface AppContextValue {
  db: DemoDB;
  // False until localStorage has been read; gate user-specific UI on it
  hydrated: boolean;
  user: User | null;
  login: (email: string, password: string) => User;
  loginAs: (role: Role) => User;
  register: (input: { name: string; email: string; password: string }) => User;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  purchase: (input: {
    courseId: string;
    couponCode?: string;
    method: PaymentMethod;
  }) => Purchase;
  toggleSaved: (courseId: string, lessonId: string) => boolean;
  setLessonComplete: (courseId: string, lessonId: string, done: boolean) => void;
  recordWatch: (courseId: string, lessonId: string) => void;
  submitApplication: (input: ApplicationInput) => void;
  payRegistrationFee: (applicationId: string, payerNumber: string) => void;
  saveCourse: (course: Course) => void;
  deleteCourse: (courseId: string) => void;
  updateTeacherProfile: (teacherId: string, patch: Partial<TeacherProfile>) => void;
  saveCoupon: (coupon: Coupon) => void;
  deleteCoupon: (couponId: string) => void;
  requestWithdrawal: (amount: number, accountNumber: string) => void;
  reviewApplication: (
    applicationId: string,
    action: "request_payment" | "approve" | "reject",
    note?: string,
  ) => void;
  setCourseStatus: (courseId: string, status: CourseStatus, note?: string) => void;
  setUserStatus: (userId: string, status: UserStatus) => void;
  processWithdrawal: (id: string, status: Exclude<WithdrawalStatus, "pending">, note?: string) => void;
  reportVideo: (input: { courseId: string; lessonId: string; reason: ReportReason; description?: string }) => void;
  submitReportFix: (reportId: string, note: string) => void;
  reviewReportFix: (reportId: string, decision: "approve" | "reject", note?: string) => void;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function readStoredDB(): DemoDB | null {
  try {
    const raw = localStorage.getItem(DB_KEY);
    const parsed = raw ? (JSON.parse(raw) as DemoDB) : null;
    return parsed?.version === DB_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DemoDB>(createSeedDB);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const warnedQuota = useRef(false);

  const user = (sessionId && db.users.find((u) => u.id === sessionId)) || null;

  // Latest values for validation inside actions, synced before any event handler can run
  const dbRef = useRef(db);
  const userRef = useRef(user);
  useLayoutEffect(() => {
    dbRef.current = db;
    userRef.current = user;
  });

  useEffect(() => {
    const stored = readStoredDB();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    if (stored) setDb(stored);
    setSessionId(readSession());
    setHydrated(true);

    // Keep several tabs (e.g. admin + teacher) in sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === DB_KEY) setDb(readStoredDB() ?? createSeedDB());
      if (e.key === SESSION_KEY) setSessionId(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      if (!warnedQuota.current) {
        warnedQuota.current = true;
        toast.warning("Browser storage is full, so demo changes won't survive a refresh.");
      }
    }
  }, [db, hydrated]);

  const setSession = useCallback((id: string | null) => {
    setSessionId(id);
    try {
      if (id) localStorage.setItem(SESSION_KEY, id);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // Session just won't persist
    }
  }, []);

  // Applies a change to a deep copy of the database, with an activity log entry
  const mutate = useCallback((fn: (d: DemoDB) => void, log?: { action: string; target: string }) => {
    setDb((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      if (log) {
        const actor = userRef.current;
        draft.activityLogs.unshift({
          id: uid("log"),
          actorName: actor?.name ?? "System",
          actorRole: actor?.role ?? "system",
          at: new Date().toISOString(),
          ...log,
        });
      }
      return draft;
    });
  }, []);

  const requireUser = () => {
    if (!userRef.current) throw new Error("Please log in first.");
    return userRef.current;
  };

  const login = (email: string, password: string) => {
    const found = dbRef.current.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!found) throw new Error("Incorrect email or password.");
    if (found.status === "banned")
      throw new Error("This account has been suspended by an administrator.");
    setSession(found.id);
    return found;
  };

  const loginAs = (role: Role) => {
    const account = DEMO_ACCOUNTS.find((a) => a.role === role)!;
    return login(account.email, account.password);
  };

  const register = ({ name, email, password }: { name: string; email: string; password: string }) => {
    if (dbRef.current.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
      throw new Error("An account with this email already exists.");
    const created: User = {
      id: uid("u"),
      name: name.trim(),
      email: email.trim(),
      password,
      role: "student",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    userRef.current = created;
    mutate((d) => d.users.push(created), { action: "Registered a new account", target: created.email });
    setSession(created.id);
    return created;
  };

  const logout = () => setSession(null);

  const updateUser = (patch: Partial<User>) => {
    const current = requireUser();
    mutate((d) => Object.assign(d.users.find((u) => u.id === current.id)!, patch));
  };

  const purchase: AppContextValue["purchase"] = ({ courseId, couponCode, method }) => {
    const current = requireUser();
    if (current.role !== "student") throw new Error("Only student accounts can buy courses.");
    const d0 = dbRef.current;
    const course = catalogCourses(d0).find((c) => c.id === courseId);
    if (!course) throw new Error("This course isn't available for purchase.");
    if (enrollmentFor(d0, current.id, courseId)) throw new Error("You already own this course.");
    let coupon: Coupon | undefined;
    if (couponCode) {
      const check = checkCoupon(d0.coupons, course, couponCode);
      if (!check.ok) throw new Error(check.error);
      coupon = check.coupon;
    }
    const q = quote(course, coupon);
    const now = new Date().toISOString();
    const record: Purchase = {
      id: uid("p"),
      studentId: current.id,
      courseId,
      teacherId: course.teacherId,
      listPrice: q.listPrice,
      coursePrice: q.coursePrice,
      couponCode: coupon?.code,
      couponDiscount: q.couponDiscount,
      amountPaid: q.total,
      commission: q.commission,
      teacherNet: q.teacherNet,
      method,
      trxId: trxId(),
      status: "completed",
      createdAt: now,
    };
    mutate(
      (d) => {
        d.purchases.push(record);
        d.enrollments.push({
          id: uid("e"),
          studentId: current.id,
          courseId,
          purchaseId: record.id,
          enrolledAt: now,
          completedLessonIds: [],
        });
        if (coupon) d.coupons.find((c) => c.id === coupon.id)!.usedCount += 1;
      },
      { action: "Purchased a course (simulated payment)", target: course.title },
    );
    return record;
  };

  const toggleSaved = (courseId: string, lessonId: string) => {
    const current = requireUser();
    const exists = dbRef.current.savedLessons.some(
      (s) => s.studentId === current.id && s.lessonId === lessonId,
    );
    mutate((d) => {
      if (exists) {
        d.savedLessons = d.savedLessons.filter(
          (s) => !(s.studentId === current.id && s.lessonId === lessonId),
        );
      } else {
        d.savedLessons.push({
          id: uid("sv"),
          studentId: current.id,
          courseId,
          lessonId,
          savedAt: new Date().toISOString(),
        });
      }
    });
    return !exists;
  };

  const setLessonComplete = (courseId: string, lessonId: string, done: boolean) => {
    const current = requireUser();
    mutate((d) => {
      const e = enrollmentFor(d, current.id, courseId);
      if (!e) return;
      e.completedLessonIds = done
        ? [...new Set([...e.completedLessonIds, lessonId])]
        : e.completedLessonIds.filter((id) => id !== lessonId);
    });
  };

  const recordWatch = (courseId: string, lessonId: string) => {
    const current = userRef.current;
    if (!current) return;
    const e = enrollmentFor(dbRef.current, current.id, courseId);
    if (!e || e.lastLessonId === lessonId) return;
    mutate((d) => {
      const target = enrollmentFor(d, current.id, courseId)!;
      target.lastLessonId = lessonId;
      target.lastWatchedAt = new Date().toISOString();
    });
  };

  const submitApplication = (input: ApplicationInput) => {
    const current = requireUser();
    const now = new Date().toISOString();
    mutate(
      (d) =>
        d.applications.push({
          ...input,
          id: uid("app"),
          userId: current.id,
          status: "pending_review",
          submittedAt: now,
          updatedAt: now,
        }),
      { action: "Submitted a teacher application", target: input.fullName },
    );
  };

  const payRegistrationFee = (applicationId: string, payerNumber: string) => {
    const current = requireUser();
    mutate(
      (d) => {
        const app = d.applications.find((a) => a.id === applicationId)!;
        app.status = "under_verification";
        app.updatedAt = new Date().toISOString();
        d.registrationFees.push({
          id: uid("fee"),
          applicationId,
          userId: current.id,
          amount: REGISTRATION_FEE,
          method: "bKash",
          payerNumber,
          trxId: trxId(),
          paidAt: new Date().toISOString(),
        });
      },
      { action: "Paid the teacher registration fee (simulated)", target: `৳${REGISTRATION_FEE} via bKash` },
    );
  };

  const saveCourse = (course: Course) => {
    const existing = dbRef.current.courses.find((c) => c.id === course.id);
    const submitted = course.status === "pending" && existing?.status !== "pending";
    mutate(
      (d) => {
        const next = { ...course, updatedAt: new Date().toISOString() };
        const i = d.courses.findIndex((c) => c.id === course.id);
        if (i >= 0) d.courses[i] = next;
        else d.courses.push(next);
      },
      submitted
        ? { action: "Submitted a course for approval", target: course.title }
        : existing
          ? undefined
          : { action: "Created a course draft", target: course.title },
    );
  };

  const deleteCourse = (courseId: string) => {
    const course = dbRef.current.courses.find((c) => c.id === courseId);
    mutate((d) => {
      d.courses = d.courses.filter((c) => c.id !== courseId);
    }, course && { action: "Deleted a course", target: course.title });
  };

  const updateTeacherProfile = (teacherId: string, patch: Partial<TeacherProfile>) => {
    mutate((d) => Object.assign(d.teachers.find((t) => t.id === teacherId)!, patch));
  };

  const saveCoupon = (coupon: Coupon) => {
    const isNew = !dbRef.current.coupons.some((c) => c.id === coupon.id);
    mutate(
      (d) => {
        const i = d.coupons.findIndex((c) => c.id === coupon.id);
        if (i >= 0) d.coupons[i] = coupon;
        else d.coupons.push(coupon);
      },
      isNew ? { action: "Created a coupon", target: coupon.code } : undefined,
    );
  };

  const deleteCoupon = (couponId: string) => {
    mutate((d) => {
      d.coupons = d.coupons.filter((c) => c.id !== couponId);
    });
  };

  const requestWithdrawal = (amount: number, accountNumber: string) => {
    const current = requireUser();
    const teacher = getTeacherByUser(dbRef.current, current.id);
    if (!teacher) throw new Error("Only approved teachers can withdraw.");
    const { withdrawable } = teacherFinance(dbRef.current, teacher.id);
    if (amount < MIN_WITHDRAWAL) throw new Error(`The minimum withdrawal is ৳${MIN_WITHDRAWAL}.`);
    if (amount > withdrawable) throw new Error("The amount is more than your withdrawable balance.");
    mutate(
      (d) =>
        d.withdrawals.unshift({
          id: uid("w"),
          teacherId: teacher.id,
          amount,
          method: "bKash",
          accountNumber,
          status: "pending",
          requestedAt: new Date().toISOString(),
        }),
      { action: "Requested a withdrawal", target: `৳${amount.toLocaleString("en-US")}` },
    );
  };

  const reviewApplication: AppContextValue["reviewApplication"] = (applicationId, action, note) => {
    const app = dbRef.current.applications.find((a) => a.id === applicationId);
    if (!app) return;
    const next: Record<typeof action, ApplicationStatus> = {
      request_payment: "payment_required",
      approve: "approved",
      reject: "rejected",
    };
    const labels = {
      request_payment: "Requested registration fee",
      approve: "Approved teacher application",
      reject: "Rejected teacher application",
    };
    mutate(
      (d) => {
        const target = d.applications.find((a) => a.id === applicationId)!;
        target.status = next[action];
        target.updatedAt = new Date().toISOString();
        if (note) target.reviewNote = note;
        if (action === "approve") {
          const serial = 101 + d.teachers.length;
          const teacher: TeacherProfile = {
            id: uid("t"),
            userId: target.userId,
            teacherCode: `RO-T-26-${String(serial).padStart(4, "0")}`,
            headline: "New teacher on Root Over",
            bio: "",
            qualifications: [],
            institution: "",
            experienceYears: 0,
            joinedAt: new Date().toISOString(),
          };
          d.teachers.push(teacher);
          target.teacherId = teacher.id;
          const applicant = d.users.find((u) => u.id === target.userId)!;
          if (applicant.role === "student") applicant.role = "teacher";
          if (target.photo?.dataUrl && !applicant.avatar) applicant.avatar = target.photo.dataUrl;
        }
      },
      { action: labels[action], target: app.fullName },
    );
  };

  const setCourseStatus = (courseId: string, status: CourseStatus, note?: string) => {
    const course = dbRef.current.courses.find((c) => c.id === courseId);
    const verbs: Partial<Record<CourseStatus, string>> = {
      approved: "Approved course",
      rejected: "Rejected course",
      suspended: "Suspended course",
    };
    mutate(
      (d) => {
        const target = d.courses.find((c) => c.id === courseId)!;
        target.status = status;
        target.statusNote = note;
        target.updatedAt = new Date().toISOString();
      },
      course && { action: verbs[status] ?? `Set course to ${status}`, target: course.title },
    );
  };

  const setUserStatus = (userId: string, status: UserStatus) => {
    const target = dbRef.current.users.find((u) => u.id === userId);
    mutate(
      (d) => {
        d.users.find((u) => u.id === userId)!.status = status;
      },
      target && { action: status === "banned" ? "Banned user" : "Unbanned user", target: target.name },
    );
  };

  const processWithdrawal: AppContextValue["processWithdrawal"] = (id, status, note) => {
    const w = dbRef.current.withdrawals.find((x) => x.id === id);
    const teacher = w && dbRef.current.teachers.find((t) => t.id === w.teacherId);
    const name = teacher && dbRef.current.users.find((u) => u.id === teacher.userId)?.name;
    mutate(
      (d) => {
        const target = d.withdrawals.find((x) => x.id === id)!;
        target.status = status;
        target.processedAt = new Date().toISOString();
        if (note) target.note = note;
      },
      { action: status === "approved" ? "Approved withdrawal" : "Rejected withdrawal", target: name ?? id },
    );
  };

  const reportVideo: AppContextValue["reportVideo"] = ({ courseId, lessonId, reason, description }) => {
    const current = requireUser();
    if (current.role !== "student") throw new Error("Only students can report videos.");
    const d0 = dbRef.current;
    const course = d0.courses.find((c) => c.id === courseId);
    const found = course && findLesson(course, lessonId);
    if (!course || !found || !lessonAccess(d0, course, current).canWatch(found.lesson))
      throw new Error("You can only report lessons you can watch.");
    if (d0.videoReports.some((r) => r.reporterId === current.id && r.lessonId === lessonId && isActiveReport(r)))
      throw new Error("You've already reported this video. We'll update you when it's fixed.");
    const text = description?.trim();
    if (reason === "OTHER" && !text) throw new Error("Please describe the problem.");
    const now = new Date().toISOString();
    mutate(
      (d) =>
        d.videoReports.unshift({
          id: uid("vr"),
          lessonId,
          courseId,
          teacherId: course.teacherId,
          reporterId: current.id,
          reason,
          description: text || undefined,
          status: "open",
          createdAt: now,
          updatedAt: now,
          events: [{ id: uid("vre"), type: "reported", actorName: current.name, actorRole: current.role, note: text || undefined, at: now }],
        }),
      { action: "Reported a video", target: `${course.title} · ${found.lesson.title}` },
    );
  };

  // Shared by the fix/review actions: validates the transition and appends history
  const transitionReport = (
    reportId: string,
    allowedFrom: VideoReport["status"][],
    apply: (r: VideoReport, now: string) => void,
    event: VideoReport["events"][number]["type"],
    note: string | undefined,
    action: string,
  ) => {
    const current = requireUser();
    const report = dbRef.current.videoReports.find((r) => r.id === reportId);
    if (!report) throw new Error("Report not found.");
    if (!allowedFrom.includes(report.status)) throw new Error("This report can't be updated from its current status.");
    const { course, lesson } = reportContext(dbRef.current, report);
    mutate(
      (d) => {
        const target = d.videoReports.find((r) => r.id === reportId)!;
        const now = new Date().toISOString();
        apply(target, now);
        target.updatedAt = now;
        target.events.push({ id: uid("vre"), type: event, actorName: current.name, actorRole: current.role, note, at: now });
      },
      { action, target: `${course?.title ?? "Course"} · ${lesson?.title ?? "Lesson"}` },
    );
  };

  const submitReportFix = (reportId: string, note: string) => {
    const current = requireUser();
    const report = dbRef.current.videoReports.find((r) => r.id === reportId);
    if (!report || getTeacherByUser(dbRef.current, current.id)?.id !== report.teacherId)
      throw new Error("Only the course's teacher can fix this report.");
    const text = note.trim();
    if (text.length < 5) throw new Error("Describe what you fixed.");
    transitionReport(
      reportId,
      ["open", "fix_rejected"],
      (r, now) => {
        r.status = "fix_submitted";
        r.teacherNote = text;
        r.fixSubmittedAt = now;
      },
      "fix_submitted",
      text,
      "Submitted a video fix",
    );
  };

  const reviewReportFix: AppContextValue["reviewReportFix"] = (reportId, decision, note) => {
    if (requireUser().role !== "admin") throw new Error("Only admins can review fixes.");
    const text = note?.trim() || undefined;
    if (decision === "reject" && (!text || text.length < 5)) throw new Error("Explain why the fix was rejected.");
    transitionReport(
      reportId,
      ["fix_submitted"],
      (r, now) => {
        r.status = decision === "approve" ? "resolved" : "fix_rejected";
        r.adminNote = text;
        if (decision === "approve") r.resolvedAt = now;
      },
      decision === "approve" ? "fix_approved" : "fix_rejected",
      text,
      decision === "approve" ? "Approved a video fix" : "Rejected a video fix",
    );
  };

  const resetDemo = () => {
    setDb(createSeedDB());
    toast.success("Demo data has been reset.");
  };

  return (
    <AppContext.Provider
      value={{
        db,
        hydrated,
        user,
        login,
        loginAs,
        register,
        logout,
        updateUser,
        purchase,
        toggleSaved,
        setLessonComplete,
        recordWatch,
        submitApplication,
        payRegistrationFee,
        saveCourse,
        deleteCourse,
        updateTeacherProfile,
        saveCoupon,
        deleteCoupon,
        requestWithdrawal,
        reviewApplication,
        setCourseStatus,
        setUserStatus,
        processWithdrawal,
        reportVideo,
        submitReportFix,
        reviewReportFix,
        resetDemo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
