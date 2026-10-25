// Data model for the frontend-only demo marketplace. Shapes are designed so a
// real API can later return the same documents.

export type Role = "student" | "teacher" | "admin";

export const LEVELS = ["SSC", "HSC", "BSc", "BBA", "BA", "Others"] as const;
export type Level = (typeof LEVELS)[number];

export type UserStatus = "active" | "banned";

export interface User {
  id: string;
  name: string;
  email: string;
  // Demo only - plain-text so the mock login can check it
  password: string;
  role: Role;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  institution?: string;
  gender?: string;
  dateOfBirth?: string;
  createdAt: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  teacherCode: string;
  headline: string;
  bio: string;
  qualifications: string[];
  institution: string;
  experienceYears: number;
  joinedAt: string;
}

export type ApplicationStatus =
  | "pending_review"
  | "payment_required"
  | "under_verification"
  | "approved"
  | "rejected";

// A locally previewed file; dataUrl is only kept when small enough for localStorage
export interface UploadedDoc {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
}

export interface TeacherApplication {
  id: string;
  userId: string;
  fullName: string;
  nid: string;
  bkashNumber: string;
  tin: string;
  dateOfBirth: string;
  gender: string;
  photo?: UploadedDoc;
  sscCertificate?: UploadedDoc;
  hscCertificate?: UploadedDoc;
  fatherVoterId?: UploadedDoc;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  reviewNote?: string;
  teacherId?: string;
}

export interface RegistrationFee {
  id: string;
  applicationId: string;
  userId: string;
  amount: number;
  method: "bKash";
  payerNumber: string;
  trxId: string;
  paidAt: string;
}

export type CourseStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export interface Lesson {
  id: string;
  title: string;
  durationMin: number;
  videoUrl: string;
  isPreview: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Review {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Course {
  id: string;
  teacherId: string;
  level: Level;
  subject: string;
  title: string;
  description: string;
  thumbnail?: string;
  outcomes: string[];
  price: number;
  discountPrice?: number;
  status: CourseStatus;
  statusNote?: string;
  chapters: Chapter[];
  reviews: Review[];
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  teacherId: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  expiresAt: string;
  usageLimit: number;
  usedCount: number;
  // null applies to every course of the teacher
  courseId: string | null;
  active: boolean;
  createdAt: string;
}

export type PaymentMethod = "bKash" | "Nagad" | "Card";

export interface Purchase {
  id: string;
  studentId: string;
  courseId: string;
  teacherId: string;
  listPrice: number;
  coursePrice: number;
  couponCode?: string;
  couponDiscount: number;
  amountPaid: number;
  commission: number;
  teacherNet: number;
  method: PaymentMethod;
  trxId: string;
  status: "completed" | "refunded";
  createdAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  purchaseId: string;
  enrolledAt: string;
  completedLessonIds: string[];
  lastLessonId?: string;
  lastWatchedAt?: string;
}

export interface SavedLesson {
  id: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  savedAt: string;
}

export type WithdrawalStatus = "pending" | "approved" | "rejected";

export interface Withdrawal {
  id: string;
  teacherId: string;
  amount: number;
  method: "bKash";
  accountNumber: string;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  note?: string;
}

export interface ActivityLog {
  id: string;
  actorName: string;
  actorRole: Role | "system";
  action: string;
  target: string;
  at: string;
}

export interface DemoDB {
  version: number;
  users: User[];
  teachers: TeacherProfile[];
  applications: TeacherApplication[];
  registrationFees: RegistrationFee[];
  courses: Course[];
  coupons: Coupon[];
  purchases: Purchase[];
  enrollments: Enrollment[];
  savedLessons: SavedLesson[];
  withdrawals: Withdrawal[];
  activityLogs: ActivityLog[];
}

// Site content used by the About page
export interface BulletPoint {
  title: string;
  text: string;
}

export interface SocialLink {
  label: string;
  url: string;
}
