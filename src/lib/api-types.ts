// Response shapes of the Root Over API (backend BACKEND_SPEC section 11).
// The mock's documents live in types.ts; these are what pages connected to the
// API receive instead.
import type { MonthPoint, TeacherFinance } from "./selectors";
import type {
  ApplicationStatus,
  Coupon,
  CourseStatus,
  Enrollment,
  Level,
  PaymentMethod,
  Purchase,
  RegistrationFee,
  Review,
  Role,
  TeacherApplication,
  TeacherProfile,
  UserStatus,
  Withdrawal,
} from "./types";

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

export type { MonthPoint, TeacherFinance };

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
