// Response shapes of the Root Over API (backend BACKEND_SPEC section 11).
// The mock's documents live in types.ts; these are what pages connected to the
// API receive instead.
import type {
  ActivityLog,
  ApplicationStatus,
  Course,
  Coupon,
  CourseStatus,
  Enrollment,
  Level,
  PaymentMethod,
  Purchase,
  RegistrationFee,
  ReportReason,
  ReportStatus,
  Review,
  Role,
  TeacherApplication,
  TeacherProfile,
  UserStatus,
  WithdrawalStatus,
  Withdrawal,
} from "./types";

// Money figures are computed by the API (backend utils/finance.ts)
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

// teacherNet = pendingClearance + withdrawn + pendingWithdrawals + withdrawable
export interface TeacherFinance extends SalesTotals {
  pendingClearance: number;
  withdrawn: number;
  pendingWithdrawals: number;
  withdrawable: number;
}

export interface MonthPoint {
  month: string;
  gross: number;
  commission: number;
  net: number;
  sales: number;
}

// GET /config
export interface PlatformConfig {
  commissionRate: number;
  registrationFee: number;
  clearingDays: number;
  minWithdrawal: number;
  // Preset avatar images; an avatar is one of these or the user's own upload
  avatarPresets: string[];
  payment: { provider: "bkash" | "simulated"; sandbox: boolean };
  // Demo deployment: one-click demo logins, coupon hints, "Fill demo data"
  demo: boolean;
  // OAuth client ID for "Continue with Google"; null = Google sign-in is off
  googleClientId: string | null;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  institution?: string;
  gender?: string;
  dateOfBirth?: string;
  createdAt: string;
}

export interface Session {
  token: string;
  user: ApiUser;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface Rating {
  average: number;
  count: number;
}

export interface Progress {
  completed: number;
  total: number;
  percent: number;
}

// videoUrl / noteLink are null when the requester can't watch the lesson
export interface LessonPublic {
  id: string;
  title: string;
  durationMin: number;
  videoUrl: string | null;
  noteLink: string | null;
  isPreview: boolean;
  canWatch: boolean;
}

export interface ChapterPublic {
  id: string;
  title: string;
  lessons: LessonPublic[];
}

export interface TeacherPublic extends TeacherProfile {
  name: string;
  avatar?: string;
  status: UserStatus;
  stats: { courses: number; students: number; rating: number; reviewCount: number };
}

export interface CourseSummary {
  id: string;
  level: Level;
  subject: string;
  title: string;
  thumbnail?: string;
  price: number;
  discountPrice?: number;
  effectivePrice: number;
  discountPercent: number;
  teacher: { id: string; name: string; avatar?: string };
  rating: Rating;
  studentCount: number;
  lessonCount: number;
  chapterCount: number;
  durationMin: number;
  featured: boolean;
  createdAt: string;
}

export interface CourseDetail extends Omit<CourseSummary, "teacher"> {
  description: string;
  outcomes: string[];
  status: CourseStatus;
  statusNote?: string;
  // false = the owner or an admin previewing a course that isn't in the catalog
  published: boolean;
  chapters: ChapterPublic[];
  reviews: Review[];
  // The signed-in student's own review, to pre-fill the rating form
  myReview?: Review;
  teacher: TeacherPublic;
  access: { enrolled: boolean; owner: boolean; full: boolean };
  enrollment?: { progress: Progress; resumeLessonId?: string; completedLessonIds: string[] };
}

export interface Facets {
  levels: { level: Level; count: number }[];
  subjects: string[];
  teachers: { id: string; name: string }[];
}

export interface FreePreview {
  course: CourseSummary;
  lesson: LessonPublic;
  chapterTitle: string;
}

export interface PlayerData {
  course: CourseDetail;
  savedLessonIds: string[];
  myOpenReportLessonIds: string[];
}

export interface EnrolledCourse {
  enrollment: Enrollment;
  course: CourseSummary;
  progress: Progress;
  resumeLessonId?: string;
  lastLesson?: { id: string; title: string; chapterTitle: string };
}

export interface SavedLessonView {
  id: string;
  savedAt: string;
  course: { id: string; title: string; level: Level; subject: string; thumbnail?: string };
  teacher: { id: string; name: string };
  lesson: { id: string; title: string; durationMin: number };
  chapter: { id: string; title: string; index: number };
}

export interface PurchaseView extends Purchase {
  course: { id: string; title: string };
  student: { id: string; name: string; email: string };
  teacher: { id: string; name: string };
}

export interface Quote {
  listPrice: number;
  coursePrice: number;
  courseDiscount: number;
  couponDiscount: number;
  total: number;
  commission: number;
  teacherNet: number;
}

export interface CouponPublic {
  code: string;
  type: "percent" | "fixed";
  value: number;
}

export interface StudentDashboard {
  stats: { enrolled: number; lessonsCompleted: number; lessonsTotal: number; overallPercent: number; saved: number };
  continueLearning: EnrolledCourse[];
  recentlyWatched: EnrolledCourse[];
  saved: SavedLessonView[];
  recentPurchases: PurchaseView[];
  // Status card only; full details come from /me/teacher-application
  application: {
    id: string;
    status: ApplicationStatus;
    submittedAt: string;
    updatedAt: string;
    reviewNote?: string;
  } | null;
}

export interface MyApplication {
  application: (TeacherApplication & { status: ApplicationStatus }) | null;
  registrationFee: RegistrationFee | null;
  teacher: TeacherProfile | null;
}

// ---------------------------------------------------------------- teacher area (/teacher)


export interface CouponView extends Coupon {
  state: "active" | "inactive" | "expired";
}

export interface TeacherCourseRow {
  id: string;
  title: string;
  level: Level;
  subject: string;
  thumbnail?: string;
  status: CourseStatus;
  statusNote?: string;
  price: number;
  discountPrice?: number;
  effectivePrice: number;
  students: number;
  net: number;
  rating: Rating;
  chapters: number;
  lessons: number;
  updatedAt: string;
}

export interface TeacherDashboard {
  counts: { total: number; approved: number; pending: number; draft: number };
  // Unique buyers over completed sales
  students: number;
  finance: TeacherFinance;
  monthly: MonthPoint[];
  // Every course except drafts
  coursePerformance: {
    course: { id: string; title: string };
    status: CourseStatus;
    students: number;
    gross: number;
    net: number;
    rating: Rating;
  }[];
  recentEnrollments: {
    purchaseId: string;
    student: { id: string; name: string; avatar?: string };
    course: { id: string; title: string };
    amountPaid: number;
    teacherNet: number;
    createdAt: string;
  }[];
  reports: { needsFix: number; awaitingAdmin: number };
}

export interface TeacherStudentRow {
  enrollment: Enrollment;
  student: { id: string; name: string; email: string; avatar?: string };
  course: { id: string; title: string };
  progress: Progress;
  amountPaid: number;
}

export interface TeacherStudents extends Paginated<TeacherStudentRow> {
  // Over every filtered row, not just this page
  stats: { enrollments: number; uniqueStudents: number; averageProgress: number };
}

export interface TeacherEarnings {
  // Finance and chart cover all sales; courseId only filters the transactions
  finance: TeacherFinance;
  monthly: MonthPoint[];
  transactions: Paginated<PurchaseView>;
}

export interface TeacherWithdrawals {
  finance: TeacherFinance;
  // bKash number from the teacher's application, to pre-fill the form
  defaultAccount: string;
  withdrawals: Withdrawal[];
}

export type { PaymentMethod };

// ---------------------------------------------------------------- admin area (/admin)


export interface AdminOverview {
  counts: {
    students: number;
    teachers: number;
    liveCourses: number;
    pendingCourses: number;
    sales: number;
    refunded: number;
    // Totals behind the ≤5 lists below
    pendingApplications: number;
    pendingWithdrawals: number;
  };
  totals: SalesTotals;
  registrationFees: { total: number; count: number };
  monthly: MonthPoint[];
  pendingApplications: { id: string; fullName: string; status: ApplicationStatus; submittedAt: string }[];
  pendingCourses: { id: string; title: string; teacher: { id: string; name: string }; updatedAt: string }[];
  pendingWithdrawals: { id: string; amount: number; teacher: { id: string; name: string }; requestedAt: string }[];
  recentActivity: ActivityLog[];
  reports: { open: number; awaitingApproval: number };
}

export interface AdminApplicationRow extends TeacherApplication {
  email: string;
  feePaid: boolean;
}

export interface AdminApplicationDetail {
  application: TeacherApplication;
  email: string;
  registrationFee: RegistrationFee | null;
  teacher: TeacherProfile | null;
}

export interface AdminCourseRow {
  id: string;
  title: string;
  level: Level;
  subject: string;
  thumbnail?: string;
  status: CourseStatus;
  statusNote?: string;
  price: number;
  discountPrice?: number;
  effectivePrice: number;
  teacher: { id: string; name: string; teacherCode: string };
  students: number;
  chapterCount: number;
  lessonCount: number;
  durationMin: number;
  createdAt: string;
  updatedAt: string;
}

// The full course with raw lesson links
export interface AdminCourseDetail extends Course {
  teacher: { id: string; name: string; teacherCode: string; status: UserStatus };
  effectivePrice: number;
  sales: number;
  gross: number;
}

export interface AdminTeacherRow extends TeacherProfile {
  name: string;
  email: string;
  avatar?: string;
  status: UserStatus;
  liveCourses: number;
  totalCourses: number;
  gross: number;
  net: number;
  withdrawable: number;
}

export interface AdminStudentRow extends ApiUser {
  enrolled: number;
  totalSpent: number;
  applicationStatus: ApplicationStatus | null;
}

export interface AdminFeeRow extends RegistrationFee {
  applicant: { fullName: string; email: string };
  applicationStatus: ApplicationStatus;
}

export interface AdminFees extends Paginated<AdminFeeRow> {
  totals: { collected: number; count: number; awaitingPayment: number };
}

export interface AdminTransactions extends Paginated<PurchaseView> {
  // Over every filtered row, not just this page
  totals: SalesTotals;
}

export interface AdminWithdrawalRow extends Withdrawal {
  teacher: { id: string; name: string; teacherCode: string };
  // The teacher's balance right now
  withdrawable: number;
}

export interface AdminWithdrawals extends Paginated<AdminWithdrawalRow> {
  sums: Record<WithdrawalStatus, { amount: number; count: number }>;
}

export interface AdminReports {
  totals: SalesTotals;
  registrationFees: { total: number; count: number };
  platformRevenue: number;
  monthly: MonthPoint[];
  byTeacher: (TeacherFinance & { id: string; name: string })[];
  byLevel: (SalesTotals & { level: Level })[];
}

// ---------------------------------------------------------------- payments (bKash)

// POST /checkout and /teacher-applications/:id/pay-fee: send the browser to redirectURL
export interface PaymentStart {
  paymentId: string;
  redirectURL: string;
}

export type PaymentState = "initiated" | "processing" | "completed" | "failed" | "cancelled" | "expired";

// GET /payments/:id (the payer's own payment)
export interface PaymentView {
  id: string;
  purpose: "course_purchase" | "registration_fee";
  provider: "bkash" | "simulated";
  sandbox: boolean;
  state: PaymentState;
  amount: number;
  trxId?: string;
  payerNumber?: string;
  failureReason?: string;
  course?: { id: string; title: string };
  applicationId?: string;
  purchase?: Purchase;
  enrollment?: Enrollment;
  registrationFee?: RegistrationFee;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------- video reports

export interface VideoReportView {
  id: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  teacherNote?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  fixSubmittedAt?: string;
  resolvedAt?: string;
  course: { id: string; title: string };
  chapter: { id: string; title: string };
  // Full link: only the teacher, admins and the reporter receive reports
  lesson: { id: string; title: string; videoUrl: string };
  teacher: { id: string; name: string };
  reporter: { id: string; name: string };
  events: {
    id: string;
    type: "reported" | "fix_submitted" | "fix_approved" | "fix_rejected";
    actorName: string;
    actorRole: Role | "system";
    note?: string;
    at: string;
  }[];
}

// GET /teacher/reports and /admin/video-reports; counts cover every report the role can see
export interface VideoReportBoard extends Paginated<VideoReportView> {
  counts: { needsFix: number; awaitingApproval: number; resolved: number };
}
