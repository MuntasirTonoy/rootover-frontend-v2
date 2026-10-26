// Shared shapes and enums of the Root Over API (backend BACKEND_SPEC section 11).
// Composite response shapes live in api-types.ts.

export type Role = "student" | "teacher" | "admin";

export const LEVELS = ["SSC", "HSC", "BSc", "BBA", "BA", "Others"] as const;
export type Level = (typeof LEVELS)[number];

export type UserStatus = "active" | "banned";

export interface User {
  id: string;
  name: string;
  email: string;
  // Seed data only (the demo logins); signed-in users come from the API without it
  password?: string;
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
  // Picked by an admin for the home page
  featured: boolean;
}

export type ApplicationStatus =
  | "pending_review"
  | "payment_required"
  | "under_verification"
  | "approved"
  | "rejected";

// An uploaded file (POST /uploads). `id` is sent back when an application
// references it; private documents have a /uploads/private/:id url.
export interface UploadedDoc {
  id?: string;
  name: string;
  type: string;
  size: number;
  url?: string;
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
  // https link to the lesson notes (PDF, Drive...), or null
  noteLink?: string | null;
  isPreview: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
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
  rating?: { average: number; count: number };
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

export const REPORT_REASONS = [
  "VIDEO_ISSUE",
  "AUDIO_ISSUE",
  "WRONG_CONTENT",
  "INAPPROPRIATE_CONTENT",
  "BROKEN_LINK",
  "OTHER",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// open → fix_submitted → resolved, or → fix_rejected → fix_submitted → ...
export type ReportStatus = "open" | "fix_submitted" | "fix_rejected" | "resolved";

export interface ActivityLog {
  id: string;
  actorName: string;
  actorRole: Role | "system";
  action: string;
  target: string;
  at: string;
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
