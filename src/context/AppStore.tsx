"use client";

// Session + demo store. Authentication is real: the backend issues a JWT
// (stored in localStorage, sent as a Bearer token by lib/api.ts) and `user` is
// the account from GET /auth/me. Pages already connected to the API fetch
// their own data; the rest still read the mock database below, which lives in
// React state, is persisted to localStorage and shares its seed ids with the
// backend's seed, so the signed-in user's id finds their mock records.
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
import { api, ApiError, getToken, SESSION_EVENT, setToken } from "@/lib/api";
import type { ApiUser, Session } from "@/lib/api-types";
import { uid } from "@/lib/format";
import { findLesson, getTeacherByUser, lessonAccess } from "@/lib/selectors";
import { isActiveReport, reportContext } from "@/lib/reports";
import type {
  ApplicationStatus,
  CourseStatus,
  DemoDB,
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
const TOKEN_KEY = "rootover_token";

export interface Registration {
  message: string;
  email: string;
  // Seconds until another verification code can be requested
  resendAvailableIn: number;
}

export interface ProfilePatch {
  name?: string;
  phone?: string;
  institution?: string;
  gender?: string;
  dateOfBirth?: string;
  avatar?: string;
  password?: string;
  currentPassword?: string;
}

export type ApplicationInput = Omit<
  TeacherApplication,
  "id" | "userId" | "status" | "submittedAt" | "updatedAt" | "reviewNote" | "teacherId"
>;

interface AppContextValue {
  db: DemoDB;
  // False until the stored session has been checked; gate user-specific UI on it
  hydrated: boolean;
  user: User | null;
  // Throw ApiError (code EMAIL_NOT_VERIFIED when the sign-up code is pending)
  login: (email: string, password: string) => Promise<User>;
  loginAs: (role: Role) => Promise<User>;
  // Sends a 6-digit code; the account is usable after verifyEmail
  register: (input: { name: string; email: string; password: string }) => Promise<Registration>;
  verifyEmail: (email: string, code: string) => Promise<User>;
  resendVerification: (email: string) => Promise<Registration>;
  logout: () => void;
  updateUser: (patch: ProfilePatch) => Promise<User>;
  // Reloads the account (e.g. after an admin changed the role)
  refreshUser: () => Promise<void>;
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

const fromApi = (u: ApiUser): User => ({ ...u });

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DemoDB>(createSeedDB);
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const warnedQuota = useRef(false);

  // Latest values for validation inside actions, synced before any event handler can run
  const dbRef = useRef(db);
  const userRef = useRef(user);
  useLayoutEffect(() => {
    dbRef.current = db;
    userRef.current = user;
  });

  // The account behind the stored token, or null (an invalid token is dropped)
  const loadSession = useCallback(async () => {
    if (!getToken()) return setUser(null);
    try {
      const me = await api<{ user: ApiUser }>("/auth/me");
      setUser(fromApi(me.user));
    } catch (err) {
      // Network trouble keeps the token for the next try; a rejected one is dropped
      if (err instanceof ApiError && err.status !== 0) setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const stored = readStoredDB();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    if (stored) setDb(stored);
    loadSession().finally(() => setHydrated(true));

    // Keep several tabs in sync: demo data, and signing in or out
    const onStorage = (e: StorageEvent) => {
      if (e.key === DB_KEY) setDb(readStoredDB() ?? createSeedDB());
      if (e.key === TOKEN_KEY) void loadSession();
    };
    // The API rejected the token mid-session (expired, or the account was banned)
    const onSessionEnded = (e: Event) => {
      setToken(null);
      if (!userRef.current) return;
      setUser(null);
      const message = (e as CustomEvent<string>).detail;
      toast.error(message === "Please log in first." ? "Your session has ended. Please log in again." : message);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SESSION_EVENT, onSessionEnded);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SESSION_EVENT, onSessionEnded);
    };
  }, [loadSession]);

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

  const startSession = useCallback((session: Session) => {
    setToken(session.token);
    const next = fromApi(session.user);
    userRef.current = next;
    setUser(next);
    return next;
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

  const login = async (email: string, password: string) =>
    startSession(await api<Session>("/auth/login", { method: "POST", body: { email, password } }));

  const loginAs = (role: Role) => {
    const account = DEMO_ACCOUNTS.find((a) => a.role === role)!;
    return login(account.email, account.password);
  };

  const register = (input: { name: string; email: string; password: string }) =>
    api<Registration>("/auth/register", { method: "POST", body: input });

  const verifyEmail = async (email: string, code: string) =>
    startSession(await api<Session>("/auth/verify-email", { method: "POST", body: { email, code } }));

  const resendVerification = (email: string) =>
    api<Registration>("/auth/resend-verification", { method: "POST", body: { email } });

  // Tokens are stateless, so the server call is a courtesy; the local session ends at once
  const logout = useCallback(() => {
    if (getToken()) void api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    userRef.current = null;
    setUser(null);
  }, []);

  // A password change answers with a fresh token (older ones are revoked)
  const updateUser = async (patch: ProfilePatch) => {
    requireUser();
    const res = await api<{ user: ApiUser; token?: string }>("/me", { method: "PATCH", body: patch });
    if (res.token) setToken(res.token);
    const next = fromApi(res.user);
    setUser(next);
    // Mirror into the demo data so pages still on the mock show the new name/avatar
    mutate((d) => {
      const mock = d.users.find((u) => u.id === next.id);
      if (mock) Object.assign(mock, res.user);
    });
    return next;
  };

  const refreshUser = loadSession;

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
        verifyEmail,
        resendVerification,
        logout,
        updateUser,
        refreshUser,
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
