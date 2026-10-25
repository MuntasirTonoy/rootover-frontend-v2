# Root Over Education: Backend Specification

> **For the coding agent building the backend.** This document is the contract between the existing
> frontend (`D:\Work\Rootover-v2\rootover-frontend-v2`, Next.js 16 + TypeScript) and the backend you will
> build. The frontend currently runs on a mock data layer; every rule below is taken from that working
> mock so the two stay consistent. **Follow this spec exactly.** Where it says "MUST", the frontend
> depends on it.
>
> If you can read the frontend folder, these files are the source of truth and are worth opening:
> `src/lib/types.ts` (data shapes), `src/lib/pricing.ts` (money maths), `src/lib/selectors.ts` (derived
> numbers), `src/context/AppStore.tsx` (every action and its validation), `src/lib/seed.ts` (demo data).
> Section 13 (lesson notes) is **not yet in the frontend UI**; section 14 (video reports) is.

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [Tech stack and project setup](#2-tech-stack-and-project-setup)
3. [API conventions](#3-api-conventions)
4. [Database schema (Prisma)](#4-database-schema-prisma)
5. [Authentication and authorization](#5-authentication-and-authorization)
6. [Money rules: pricing, coupons, commission, balances](#6-money-rules)
7. [Course rules and lesson access](#7-course-rules-and-lesson-access)
8. [Teacher application workflow](#8-teacher-application-workflow)
9. [Validation rules](#9-validation-rules)
10. [API endpoints](#10-api-endpoints)
11. [Response shapes (TypeScript)](#11-response-shapes)
12. [Activity log](#12-activity-log)
13. [Lesson notes (new)](#13-lesson-notes-new)
14. [Video report system (new)](#14-video-report-system-new)
15. [File uploads](#15-file-uploads)
16. [Seed data](#16-seed-data)
17. [Security checklist](#17-security-checklist)
18. [Environment variables](#18-environment-variables)
19. [Acceptance tests](#19-acceptance-tests)
20. [Build order](#20-build-order)

---

## 1. Product overview

Root Over is a course marketplace for Bangladesh. Verified teachers sell **complete subject courses**;
students buy a whole course once and watch it lesson by lesson.

Hierarchy: **Educational level → Course (one subject) → Chapters → Lessons (parts) → YouTube unlisted video**.
Example: SSC → Physics → Motion → Part 1, Part 2, Part 3.

Levels (exact strings): `SSC`, `HSC`, `BSc`, `BBA`, `BA`, `Others`.

Currency: BDT (৳), stored as **integers** (whole taka).

### Roles

| Role | Can do |
|---|---|
| `student` | Browse, buy courses (simulated payment), watch lessons, mark complete, save lessons, report videos, apply to become a teacher |
| `teacher` | Everything public, plus: create/edit courses, submit for approval, manage coupons, see students and earnings, request withdrawals, fix reported videos. **Teachers cannot buy courses** and have no My Classes / Saved Videos. |
| `admin` | Review teacher applications, approve/reject/suspend courses, ban/unban users, view all payments, transactions and reports, process withdrawals, approve/reject video-report fixes, view activity log |

Every account is created as `student`. A student becomes a `teacher` only when an admin approves their
teacher application (section 8).

### Payments are simulated

There is **no real payment gateway**. Course purchases (bKash / Nagad / Card) and the ৳300 teacher
registration fee are recorded immediately as successful with a generated transaction ID. Never call a
real payment provider. Keep the payment step isolated (one service function) so a real bKash
integration can replace it later.

---

## 2. Tech stack and project setup

**First, inspect the backend folder.** If a stack already exists, keep it and adapt this spec to it
(do not rewrite working code). If the folder is empty, use:

- Node.js 20+, **TypeScript** (strict)
- **Express 5** (or Fastify if already present)
- **Prisma** ORM + **PostgreSQL** (Neon in production; local Postgres in development)
- **zod** for request validation
- **bcrypt** for password hashing, **jsonwebtoken** for auth tokens
- **multer** for multipart uploads
- `cors`, `helmet`, `express-rate-limit`, `morgan` (or pino)

Suggested layout:

```
src/
  index.ts              # app bootstrap, middleware, routes
  config/env.ts         # zod-validated env vars
  lib/prisma.ts         # PrismaClient singleton
  lib/pricing.ts        # MUST match section 6 exactly
  lib/finance.ts        # salesTotals, teacherFinance, monthlySeries
  lib/errors.ts         # AppError + error middleware
  lib/activity.ts       # logActivity()
  middleware/auth.ts    # requireAuth, requireRole
  modules/<area>/       # router.ts, service.ts, schemas.ts per area
prisma/schema.prisma
prisma/seed.ts
```

Scripts: `dev`, `build`, `start`, `db:migrate` (`prisma migrate dev`), `db:seed`, `lint`, `test`.
Default port **5000**. Allow CORS from `http://localhost:3000`.

---

## 3. API conventions

- Base path: **`/api`**. JSON in and out (`Content-Type: application/json`), except uploads (multipart).
- IDs are strings (`cuid()`). The field is always **`id`** (not `_id`).
- Dates are **ISO 8601 strings** in responses. `dateOfBirth` is a plain `YYYY-MM-DD` string.
- Money fields are **integers** in BDT.
- Enum values are sent exactly as listed in this document (lowercase statuses such as `pending_review`,
  levels such as `BSc`, report reasons such as `VIDEO_ISSUE`).
- Auth: `Authorization: Bearer <token>` header (section 5).

### Pagination

List endpoints that can grow accept `?page=1&limit=10` (limit max 100) and return:

```json
{ "data": [ ... ], "pagination": { "page": 1, "limit": 10, "total": 57, "pages": 6 } }
```

### Errors

All errors use one shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable message", "fields": { "email": "Enter a valid email address." } } }
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body/query fails zod validation (`fields` filled per field) |
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired token |
| 403 | `FORBIDDEN` | Wrong role, not the owner, or account banned |
| 404 | `NOT_FOUND` | Resource missing (or not visible to this user) |
| 409 | `CONFLICT` | Duplicate (email taken, already enrolled, duplicate coupon code, open report exists) |
| 422 | `BUSINESS_RULE` | Valid input that breaks a rule (coupon expired, amount above withdrawable, illegal status transition) |
| 500 | `INTERNAL` | Unexpected; never leak stack traces |

`message` strings should match the frontend wording where this spec quotes them.

---

## 4. Database schema (Prisma)

Use this schema as-is (adjust only `datasource` if needed). Enum values are lowercase where the
frontend uses lowercase so no mapping layer is needed.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  student
  teacher
  admin
}

enum ActorRole {
  student
  teacher
  admin
  system
}

enum UserStatus {
  active
  banned
}

enum Level {
  SSC
  HSC
  BSc
  BBA
  BA
  Others
}

enum ApplicationStatus {
  pending_review
  payment_required
  under_verification
  approved
  rejected
}

enum CourseStatus {
  draft
  pending
  approved
  rejected
  suspended
}

enum CouponType {
  percent
  fixed
}

enum PaymentMethod {
  bKash
  Nagad
  Card
}

enum PurchaseStatus {
  completed
  refunded
}

enum WithdrawalStatus {
  pending
  approved
  rejected
}

enum ReportReason {
  VIDEO_ISSUE
  AUDIO_ISSUE
  WRONG_CONTENT
  INAPPROPRIATE_CONTENT
  BROKEN_LINK
  OTHER
}

enum ReportStatus {
  open
  fix_submitted
  fix_rejected
  resolved
}

enum ReportEventType {
  reported
  fix_submitted
  fix_approved
  fix_rejected
}

model User {
  id           String     @id @default(cuid())
  name         String
  email        String     @unique
  passwordHash String
  role         Role       @default(student)
  status       UserStatus @default(active)
  avatar       String?
  phone        String?
  institution  String?
  gender       String?
  dateOfBirth  String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  teacherProfile   TeacherProfile?
  applications     TeacherApplication[]
  registrationFees RegistrationFee[]
  purchases        Purchase[]
  enrollments      Enrollment[]
  savedLessons     SavedLesson[]
  reviews          Review[]
  videoReports     VideoReport[]       @relation("ReportReporter")
  reportEvents     VideoReportEvent[]
  activityLogs     ActivityLog[]
}

model TeacherProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  teacherCode     String   @unique
  headline        String   @default("New teacher on Root Over")
  bio             String   @default("")
  qualifications  String[]
  institution     String   @default("")
  experienceYears Int      @default(0)
  joinedAt        DateTime @default(now())

  application  TeacherApplication?
  courses      Course[]
  coupons      Coupon[]
  sales        Purchase[]
  withdrawals  Withdrawal[]
  videoReports VideoReport[]
}

model TeacherApplication {
  id             String            @id @default(cuid())
  userId         String
  user           User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  fullName       String
  nid            String
  bkashNumber    String
  tin            String
  dateOfBirth    String
  gender         String
  // Each document: { url, name, type, size } (see section 15)
  photo          Json?
  sscCertificate Json?
  hscCertificate Json?
  fatherVoterId  Json?
  status         ApplicationStatus @default(pending_review)
  reviewNote     String?
  teacherId      String?           @unique
  teacher        TeacherProfile?   @relation(fields: [teacherId], references: [id])
  submittedAt    DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  registrationFee RegistrationFee?

  @@index([userId])
  @@index([status])
}

model RegistrationFee {
  id            String             @id @default(cuid())
  applicationId String             @unique
  application   TeacherApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  userId        String
  user          User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount        Int
  method        PaymentMethod      @default(bKash)
  payerNumber   String
  trxId         String             @unique
  paidAt        DateTime           @default(now())
}

model Course {
  id            String       @id @default(cuid())
  teacherId     String
  teacher       TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Restrict)
  level         Level
  subject       String
  title         String
  description   String
  thumbnail     String?
  outcomes      String[]
  price         Int
  discountPrice Int?
  status        CourseStatus @default(draft)
  statusNote    String?
  featured      Boolean      @default(false)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  chapters     Chapter[]
  reviews      Review[]
  coupons      Coupon[]
  purchases    Purchase[]
  enrollments  Enrollment[]
  savedLessons SavedLesson[]
  videoReports VideoReport[]

  @@index([status])
  @@index([teacherId])
  @@index([level])
}

model Chapter {
  id       String   @id @default(cuid())
  courseId String
  course   Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title    String
  position Int
  lessons  Lesson[]

  @@index([courseId, position])
}

model Lesson {
  id          String  @id @default(cuid())
  chapterId   String
  chapter     Chapter @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  title       String
  durationMin Int
  // Always stored normalised: https://www.youtube.com/embed/<11-char id>
  videoUrl    String
  // Optional link to lesson notes (PDF / Google Drive). See section 13.
  noteLink    String?
  isPreview   Boolean @default(false)
  position    Int

  completions LessonCompletion[]
  savedBy     SavedLesson[]
  reports     VideoReport[]

  @@index([chapterId, position])
}

model Review {
  id          String   @id @default(cuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  studentId   String?
  student     User?    @relation(fields: [studentId], references: [id], onDelete: SetNull)
  studentName String
  rating      Int
  comment     String
  date        DateTime @default(now())

  @@unique([courseId, studentId])
}

model Coupon {
  id         String         @id @default(cuid())
  teacherId  String
  teacher    TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  code       String
  type       CouponType
  value      Int
  expiresAt  DateTime
  usageLimit Int
  usedCount  Int            @default(0)
  // null = applies to every course of this teacher
  courseId   String?
  course     Course?        @relation(fields: [courseId], references: [id], onDelete: Cascade)
  active     Boolean        @default(true)
  createdAt  DateTime       @default(now())

  @@unique([teacherId, code])
}

model Purchase {
  id             String         @id @default(cuid())
  studentId      String
  student        User           @relation(fields: [studentId], references: [id], onDelete: Restrict)
  courseId       String
  course         Course         @relation(fields: [courseId], references: [id], onDelete: Restrict)
  teacherId      String
  teacher        TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Restrict)
  listPrice      Int
  coursePrice    Int
  couponCode     String?
  couponDiscount Int
  amountPaid     Int
  commission     Int
  teacherNet     Int
  method         PaymentMethod
  trxId          String         @unique
  status         PurchaseStatus @default(completed)
  createdAt      DateTime       @default(now())

  enrollment Enrollment?

  @@index([teacherId, createdAt])
  @@index([studentId])
  @@index([courseId])
}

model Enrollment {
  id            String    @id @default(cuid())
  studentId     String
  student       User      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  courseId      String
  course        Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  purchaseId    String    @unique
  purchase      Purchase  @relation(fields: [purchaseId], references: [id], onDelete: Restrict)
  enrolledAt    DateTime  @default(now())
  // Plain id (no FK) so deleting a lesson never breaks the enrollment
  lastLessonId  String?
  lastWatchedAt DateTime?

  completions LessonCompletion[]

  @@unique([studentId, courseId])
}

model LessonCompletion {
  enrollmentId String
  enrollment   Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  lessonId     String
  lesson       Lesson     @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  completedAt  DateTime   @default(now())

  @@id([enrollmentId, lessonId])
}

model SavedLesson {
  id        String   @id @default(cuid())
  studentId String
  student   User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessonId  String
  lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  savedAt   DateTime @default(now())

  @@unique([studentId, lessonId])
}

model Withdrawal {
  id            String           @id @default(cuid())
  teacherId     String
  teacher       TeacherProfile   @relation(fields: [teacherId], references: [id], onDelete: Restrict)
  amount        Int
  method        PaymentMethod    @default(bKash)
  accountNumber String
  status        WithdrawalStatus @default(pending)
  requestedAt   DateTime         @default(now())
  processedAt   DateTime?
  note          String?

  @@index([teacherId, status])
}

model ActivityLog {
  id        String    @id @default(cuid())
  actorId   String?
  actor     User?     @relation(fields: [actorId], references: [id], onDelete: SetNull)
  actorName String
  actorRole ActorRole
  action    String
  target    String
  at        DateTime  @default(now())

  @@index([at])
}

model VideoReport {
  id             String         @id @default(cuid())
  lessonId       String
  lesson         Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  courseId       String
  course         Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  teacherId      String
  teacher        TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  reporterId     String
  reporter       User           @relation("ReportReporter", fields: [reporterId], references: [id], onDelete: Cascade)
  reason         ReportReason
  description    String?
  status         ReportStatus   @default(open)
  teacherNote    String?
  adminNote      String?
  fixSubmittedAt DateTime?
  resolvedAt     DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  events VideoReportEvent[]

  @@index([teacherId, status])
  @@index([status])
  @@index([lessonId])
}

model VideoReportEvent {
  id        String          @id @default(cuid())
  reportId  String
  report    VideoReport     @relation(fields: [reportId], references: [id], onDelete: Cascade)
  actorId   String?
  actor     User?           @relation(fields: [actorId], references: [id], onDelete: SetNull)
  actorRole ActorRole
  type      ReportEventType
  note      String?
  at        DateTime        @default(now())

  @@index([reportId, at])
}
```

Notes:
- Chapters and lessons are ordered by `position` (0-based, contiguous after every save).
- Purchases are **never deleted** (financial records). A refund only flips `status` to `refunded`.
- Run every multi-row write (purchase, approval, course save, withdrawal) inside `prisma.$transaction`.

---

## 5. Authentication and authorization

> If the existing backend already has an auth system (for example Firebase Admin token verification),
> keep it and map users to the `User` table by email. Otherwise implement the following.

- **Register** creates a `student` with a bcrypt hash (cost 10+). Email is stored trimmed, compared
  case-insensitively (store lowercase).
- **Login** checks email + password. Wrong credentials → 401 `"Incorrect email or password."`.
  Banned user → 403 `"This account has been suspended by an administrator."`.
- Issue a **JWT** (`sub` = user id, `role`, expiry 7 days) returned in the JSON body. The frontend sends
  it as `Authorization: Bearer <token>`.
- `requireAuth` middleware: verify token, **reload the user from the DB on every request** (role or ban
  can change), reject banned users with 403.
- `requireRole(...roles)` middleware for role-only routes.
- Ownership checks in services (a teacher may only touch their own courses, coupons, students,
  withdrawals and reports).
- Never return `passwordHash`.

Route access summary:

| Area | Who |
|---|---|
| Public catalog, course details, teacher profiles, free previews | anyone (token optional; if present it unlocks owned lessons) |
| `/api/me/*` profile | any signed-in user |
| Learning (`/api/me/enrollments`, saved lessons, purchases, checkout, progress) | `student` only |
| Teacher application (`/api/teacher-applications`) | `student` only (submit / pay); the owner can read their own |
| `/api/teacher/*` | `teacher` with a `TeacherProfile` |
| `/api/admin/*` | `admin` |

---

## 6. Money rules

These MUST match the frontend exactly (`src/lib/pricing.ts`). Put them in one module and reuse it.

```ts
export const COMMISSION_RATE = 0.1;    // platform keeps 10%
export const REGISTRATION_FEE = 300;   // teacher registration, BDT
export const CLEARING_DAYS = 7;        // sales are withdrawable after 7 days
export const MIN_WITHDRAWAL = 500;     // BDT

// Price before coupons
export function coursePrice(c: { price: number; discountPrice?: number | null }) {
  return c.discountPrice && c.discountPrice < c.price ? c.discountPrice : c.price;
}

export function couponDiscount(base: number, coupon: { type: "percent" | "fixed"; value: number }) {
  const raw = coupon.type === "percent" ? Math.round((base * coupon.value) / 100) : coupon.value;
  return Math.max(0, Math.min(raw, base));
}

// Commission is 10% of what the student actually paid (after all discounts)
export function splitSale(amountPaid: number) {
  const commission = Math.round(amountPaid * COMMISSION_RATE);
  return { commission, teacherNet: amountPaid - commission };
}

export function quote(course, coupon?) {
  const base = coursePrice(course);
  const off = coupon ? couponDiscount(base, coupon) : 0;
  const total = base - off;
  return {
    listPrice: course.price,
    coursePrice: base,
    courseDiscount: course.price - base,
    couponDiscount: off,
    total,
    ...splitSale(total),
  };
}
```

**Worked example (MUST hold):** price ৳1,000, no course discount, coupon 20% → student pays ৳800,
commission ৳80, teacher earns ৳720.

### Coupon check (in this order, first failure wins)

Given `courseId` and a `code` (compare case-insensitively, trimmed):

1. No coupon with that code anywhere → 422 `"This coupon code doesn't exist."`
2. No coupon with that code **owned by the course's teacher**, or its `courseId` is set and is not this
   course → 422 `"This coupon isn't valid for this course."`
3. `active = false` → 422 `"This coupon is no longer active."`
4. `expiresAt < now` → 422 `"This coupon has expired."`
5. `usedCount >= usageLimit` → 422 `"This coupon has reached its usage limit."`

On a successful purchase, increment `usedCount` **in the same transaction** (use a conditional update
`where usedCount < usageLimit` to avoid races).

### Purchase record

Store every field from `quote()` on the `Purchase` row (`listPrice`, `coursePrice`, `couponCode`,
`couponDiscount`, `amountPaid = total`, `commission`, `teacherNet`) plus `teacherId` copied from the
course at purchase time. Never recompute historical purchases from current course prices.

### Totals (`salesTotals(purchases)`)

Over **completed** purchases only:

| Field | Formula |
|---|---|
| `sales` | count |
| `listTotal` | Σ listPrice |
| `gross` | Σ amountPaid |
| `discounts` | listTotal − gross |
| `commission` | Σ commission |
| `teacherNet` | Σ teacherNet |
| `refunds` | Σ amountPaid of **refunded** purchases |
| `refundedCount` | count of refunded |

### Teacher balance (`teacherFinance(teacherId, now)`)

```
pendingClearance   = Σ teacherNet of completed sales created within the last CLEARING_DAYS
withdrawn          = Σ amount of withdrawals with status approved
pendingWithdrawals = Σ amount of withdrawals with status pending
withdrawable       = max(0, teacherNet − pendingClearance − withdrawn − pendingWithdrawals)
```

Invariant: `teacherNet = pendingClearance + withdrawn + pendingWithdrawals + withdrawable` (when not clamped).
A rejected withdrawal simply stops counting, so the amount returns to `withdrawable`.

Platform totals are the same `salesTotals` over all purchases. **Platform revenue** =
`commission + Σ registration fees`. Platform totals MUST equal the sum of per-teacher totals.

### Monthly series

For charts: the last 6 calendar months (current month last), each
`{ month: "Oct", gross, commission, net, sales }` over completed purchases. Use `Asia/Dhaka` time zone for
month boundaries.

---

## 7. Course rules and lesson access

### Catalog visibility

A course is **in the catalog** (listed, viewable, purchasable) only when
`status = approved` **and** its teacher's user `status = active`. Banning a teacher hides all of their
courses immediately; unbanning restores them.

Course details for a non-catalog course return 404, **except** to its owner teacher and admins, who see
it with its status (the frontend shows a "Preview only" banner).

### Status transitions

| From | To | Who | Notes |
|---|---|---|---|
| (new) | `draft` | owner teacher | create |
| `draft`, `rejected` | `pending` | owner teacher | "Submit for approval"; requires the full validation in section 9; clears `statusNote` |
| `pending` | `approved` | admin | |
| `pending` | `rejected` | admin | `statusNote` (reason) required |
| `approved` | `suspended` | admin | `statusNote` required |
| `suspended` | `approved` | admin | "Reinstate" |

Any other transition → 422 `BUSINESS_RULE`.

- **Saving a course never changes its status.** Editing an approved course keeps it approved and live
  (current product decision; keep it).
- A teacher may delete a course only if it is `draft` or `rejected` **and** has zero enrollments.
- The editor saves the whole course at once (info + chapters + lessons). See `PUT /api/teacher/courses/:id`.
- Every `videoUrl` is normalised to `https://www.youtube.com/embed/<id>` on save (section 9).

### Derived course fields

- `lessonCount` = number of lessons; `durationMin` = Σ lesson `durationMin`.
- `rating` = `{ average, count }`, average of review ratings rounded to 1 decimal (0 when no reviews).
- `studentCount` = number of enrollments.

### Lesson access (who can watch)

```
owner    = signed-in teacher who owns the course
enrolled = signed-in student with an Enrollment for the course
full     = enrolled || owner || admin
canWatch(lesson) = full || lesson.isPreview
```

**Security:** for any lesson the requester can't watch, the API MUST return `videoUrl: null` and
`noteLink: null`. Never send locked video URLs to the browser.

### Progress

- `progress = { completed, total, percent }`; `completed` counts only `LessonCompletion` rows whose
  lesson still exists; `percent = round(completed / total * 100)` (0 when total is 0).
- **Resume lesson:** `lastLessonId` if it still exists, else the first lesson not completed, else the
  first lesson.
- Opening a watchable lesson as an enrolled student sets `lastLessonId` and `lastWatchedAt` (skip the
  write when `lastLessonId` is already that lesson).
- Only enrolled students can mark lessons complete / save lessons. Saving is per student per lesson
  (toggle).

### Buying

- Only `student` accounts may buy → 403 `"Only student accounts can buy courses."`
- Course must be in the catalog → 422 `"This course isn't available for purchase."`
- Already enrolled → 409 `"You already own this course."`
- Create `Purchase` (status `completed`, generated `trxId`, e.g. `DEMO` + base36 timestamp + 3 random
  chars, uppercase) and `Enrollment` in one transaction. Log activity.

---

## 8. Teacher application workflow

```
(student submits) ─► pending_review ─(admin: request fee)─► payment_required
                                                                 │
                                       (applicant pays ৳300, simulated)
                                                                 ▼
                         approved ◄─(admin: approve)── under_verification
   any of the three non-final states ─(admin: reject + reason)─► rejected
```

Rules:

- Only `student`s can apply. A student may not submit while they have an application in
  `pending_review`, `payment_required` or `under_verification` (409). After `rejected` they may submit a
  **new** application (keep the old one as history). The "current" application is the latest by
  `submittedAt`.
- **Request fee:** only from `pending_review`.
- **Pay fee:** only by the applicant, only from `payment_required`. Creates `RegistrationFee`
  (`amount = 300`, method bKash, `payerNumber`, generated `trxId`) and moves to `under_verification`.
  Simulated: no gateway call.
- **Approve:** only from `under_verification`. In one transaction:
  1. create `TeacherProfile` with `teacherCode = "RO-T-26-" + zero-padded 4-digit serial`, where serial
     = `101 + (number of existing teacher profiles)` (e.g. `RO-T-26-0105`). Use a retry on unique
     conflict;
  2. set `application.teacherId`, `status = approved`;
  3. change the user's `role` from `student` to `teacher`;
  4. if the user has no avatar and the application photo has a URL, copy it to `user.avatar`.
- **Reject:** from `pending_review`, `payment_required` or `under_verification`; `reviewNote` required.
- Every step is logged (section 12).

Status meaning for the UI: no application = "Not Applied".

---

## 9. Validation rules

Implement with zod. Messages below are what the frontend shows; reuse them.

### Accounts

| Field | Rule | Message |
|---|---|---|
| `name` (register/profile) | trimmed length ≥ 2 | `Enter your full name.` |
| `email` | valid email | `Enter a valid email address.` |
| `password` (register, optional on profile) | length ≥ 6 | `Use at least 6 characters.` |
| `phone` (optional) | `^01\d{9}$` | `Use an 11-digit number starting with 01.` |
| `gender` (optional) | `male` \| `female` \| `other` \| empty | |
| `dateOfBirth` (optional) | `YYYY-MM-DD` | |
| `avatar` (optional) | URL (uploaded or preset) | |

Email is not editable after registration.

### Teacher application

| Field | Rule | Message |
|---|---|---|
| `fullName` | trimmed length ≥ 3 | `Enter your full name as on your NID.` |
| `nid` | digits only, length 10, 13 or 17 | `NID must be 10, 13 or 17 digits.` |
| `bkashNumber` | `^01\d{9}$` | `Enter an 11-digit bKash number starting with 01.` |
| `tin` | exactly 12 digits | `TIN must be 12 digits.` |
| `dateOfBirth` | valid date, applicant ≥ 18 years old | `You must be at least 18 years old.` |
| `gender` | required | `Select your gender.` |
| `photo` | required image (jpeg/png/webp) ≤ 5 MB | `Upload a profile photograph.` |
| `sscCertificate` | required PDF ≤ 5 MB | `Upload your SSC certificate.` |
| `hscCertificate` | required PDF ≤ 5 MB | `Upload your HSC certificate.` |
| `fatherVoterId` | required image or PDF ≤ 5 MB | `Upload your father's voter ID.` |

Fee payment: `payerNumber` `^01\d{9}$`. (The frontend also collects a 4–5 digit demo PIN; **never send
or store the PIN**.)

### Course (save draft)

Only `title` (trimmed length ≥ 5) is required to save a draft.

### Course (submit for approval): full validation

| Field | Rule | Message |
|---|---|---|
| `level` | one of the 6 levels | |
| `title` | trimmed length ≥ 5 | `Give the course a title of at least 5 characters.` |
| `subject` | non-empty | `Enter the subject, e.g. Physics.` |
| `description` | trimmed length ≥ 20 | `Describe the course in at least 20 characters.` |
| `outcomes` | ≥ 1 non-empty string (empty strings removed) | `Add at least one learning outcome.` |
| `price` | integer ≥ 100 | `The price must be at least ৳100.` |
| `discountPrice` | optional; if set, integer > 0 and < `price` | `The discount price must be lower than the regular price.` |
| `chapters` | ≥ 1 | `Add at least one chapter.` |
| chapter `title` | non-empty | `Chapter title is required.` |
| chapter `lessons` | ≥ 1 | `Add at least one lesson to this chapter.` |
| lesson `title` | non-empty | `Lesson title is required.` |
| lesson `durationMin` | integer > 0 | `Enter a duration in minutes.` |
| lesson `videoUrl` | supported YouTube link (below) | `Enter a valid YouTube link or embed code.` |
| lesson `noteLink` | optional; `https://` URL ≤ 2048 chars | `Enter a valid https link for the notes.` |
| `thumbnail` | optional URL | |

Return per-field errors using keys the editor can map, e.g. `chapters.0.title`,
`chapters.1.lessons.2.videoUrl`.

**YouTube normalisation** (accept any of these, store the embed form):

```ts
const YOUTUBE_ID = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?"]*).*/;
export function toEmbedUrl(input: string): string | null {
  const iframeSrc = input.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1]; // pasted <iframe> code
  const url = (iframeSrc ?? input).trim();
  if (!/youtube\.com|youtu\.be|youtube-nocookie\.com/.test(url)) return null;
  const m = url.match(YOUTUBE_ID);
  return m && m[2].length === 11 ? `https://www.youtube.com/embed/${m[2]}` : null;
}
```

### Coupon

| Field | Rule | Message |
|---|---|---|
| `code` | uppercase, `^[A-Z0-9]{4,15}$`, unique per teacher | `Use 4–15 letters or numbers.` / `You already have a coupon with this code.` |
| `type` | `percent` \| `fixed` | |
| `value` | integer > 0; if percent, ≤ 90 | `Enter a discount greater than 0.` / `Percentage discounts are capped at 90%.` |
| `usageLimit` | integer ≥ 1 | `Allow at least one use.` |
| `expiresAt` | ISO date-time (the UI sends end of day, Asia/Dhaka) | |
| `courseId` | null or one of the teacher's own courses | |
| `active` | boolean | |

### Withdrawal

| Field | Rule | Message |
|---|---|---|
| `amount` | integer ≥ 500 | `The minimum withdrawal is ৳500.` |
| `amount` | ≤ current `withdrawable` (re-check inside the transaction) | `The amount is more than your withdrawable balance.` |
| `accountNumber` | `^01\d{9}$` | `Enter an 11-digit bKash number starting with 01.` |

### Video report

See section 14.

---

## 10. API endpoints

`🔓` public (token optional) · `👤` any signed-in user · `🎓` student · `🧑‍🏫` teacher · `🛡` admin.

### 10.1 Auth & profile

| Method | Path | Who | Body / query | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | 🔓 | `{ name, email, password }` | `201 { token, user: User }` |
| POST | `/api/auth/login` | 🔓 | `{ email, password }` | `{ token, user: User }` |
| POST | `/api/auth/logout` | 👤 | none | `204` (stateless; client drops token) |
| GET | `/api/auth/me` | 👤 | none | `{ user: User, teacher: TeacherProfile \| null }` |
| PATCH | `/api/me` | 👤 | `{ name?, phone?, institution?, gender?, dateOfBirth?, avatar?, password? }` | `{ user: User }` |

### 10.2 Public catalog

| Method | Path | Who | Query | Response |
|---|---|---|---|---|
| GET | `/api/courses` | 🔓 | `q` (matches title, subject, level, teacher name; case-insensitive), `level`, `subject`, `teacherId`, `price` (`under1000` \| `1000-2000` \| `over2000`, on the effective price), `sort` (`popular` = most students, `rating`, `newest`, `price-asc`, `price-desc`), `featured=true`, `page`, `limit` | paginated `CourseSummary[]` (catalog courses only) |
| GET | `/api/courses/facets` | 🔓 | none | `{ levels: {level, count}[], subjects: string[], teachers: {id, name}[] }` (catalog only) |
| GET | `/api/courses/:id` | 🔓 | none | `CourseDetail` (404 if not visible, see section 7) |
| GET | `/api/teachers` | 🔓 | `q` | `TeacherPublic[]`: active teachers with ≥ 1 catalog course, sorted by students desc |
| GET | `/api/teachers/:id` | 🔓 | none | `{ teacher: TeacherPublic, courses: CourseSummary[] }` (404 if banned/unknown) |
| GET | `/api/free-previews` | 🔓 | none | `{ course: CourseSummary, lesson: LessonPublic, chapterTitle }[]`: preview lessons of catalog courses |

### 10.3 Learning (student)

| Method | Path | Who | Body / query | Response |
|---|---|---|---|---|
| GET | `/api/learn/:courseId` | 🔓 | none | `PlayerData` (course, curriculum with access-filtered URLs, access flags, enrollment progress, saved lesson ids, open report ids) |
| POST | `/api/learn/:courseId/lessons/:lessonId/watch` | 🎓 | none | `204` (updates lastLessonId/lastWatchedAt; no-op if not enrolled) |
| PUT | `/api/learn/:courseId/lessons/:lessonId/complete` | 🎓 | `{ done: boolean }` | `{ progress }` (403 if not enrolled) |
| GET | `/api/me/enrollments` | 🎓 | `q`, `level`, `progress` (`not-started` \| `in-progress` \| `completed`) | `EnrolledCourse[]` (frontend groups by teacher) |
| GET | `/api/me/dashboard` | 🎓 | none | `{ stats: { enrolled, lessonsCompleted, lessonsTotal, overallPercent, saved }, continueLearning: EnrolledCourse[] (≤3, incomplete, most recent first), recentlyWatched: {...}[] (≤5), saved: SavedLessonView[] (≤5), recentPurchases: Purchase[] (≤4), application: TeacherApplication \| null }` |
| GET | `/api/me/saved-lessons` | 🎓 | `q`, `courseId` | `SavedLessonView[]` newest first (skip lessons that no longer exist) |
| POST | `/api/me/saved-lessons` | 🎓 | `{ courseId, lessonId }` | `201 SavedLessonView` (403 unless the student can watch it; 409 if already saved) |
| DELETE | `/api/me/saved-lessons/:lessonId` | 🎓 | none | `204` |
| GET | `/api/me/purchases` | 🎓 | none | `{ purchases: PurchaseView[], totals: { count, paid, saved } }` newest first |

### 10.4 Checkout (simulated)

| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| POST | `/api/checkout/quote` | 🎓 | `{ courseId, couponCode? }` | `{ quote: Quote, coupon: CouponPublic \| null }` or coupon error (section 6) |
| GET | `/api/checkout/coupons/:courseId` | 🎓 | none | `string[]`: codes currently valid for this course (demo hint shown at checkout) |
| POST | `/api/checkout` | 🎓 | `{ courseId, couponCode?, method: "bKash"\|"Nagad"\|"Card" }` | `201 { purchase: Purchase, enrollment: Enrollment }` |

### 10.5 Teacher application

| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| GET | `/api/me/teacher-application` | 👤 | none | `{ application: TeacherApplication \| null, registrationFee: RegistrationFee \| null, teacher: TeacherProfile \| null }` (latest) |
| POST | `/api/teacher-applications` | 🎓 | JSON with uploaded document objects (section 15) | `201 TeacherApplication` |
| POST | `/api/teacher-applications/:id/pay-fee` | 🎓 (owner) | `{ payerNumber }` | `{ application, registrationFee }` |

### 10.6 Teacher

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/api/teacher/me` | none | `{ teacher: TeacherPublic, application: TeacherApplication (identity numbers masked) }` |
| PATCH | `/api/teacher/me` | `{ headline?, bio?, institution?, experienceYears?, qualifications? }` | `TeacherProfile` |
| GET | `/api/teacher/dashboard` | none | `{ counts: {total, approved, pending, draft}, students (unique buyers), finance: TeacherFinance, monthly: MonthPoint[], coursePerformance: {course, status, students, gross, net, rating}[], recentEnrollments: {...}[] (≤6), reports: { needsFix, awaitingAdmin } }` |
| GET | `/api/teacher/courses` | `q`, `status` | `TeacherCourseRow[]` (title, status, statusNote, price, students, net, rating, chapters, lessons, updatedAt) |
| POST | `/api/teacher/courses` | full course body (below), status forced to `draft` | `201 Course` (full, with chapters/lessons) |
| GET | `/api/teacher/courses/:id` | none | `Course` (full, owner only) |
| PUT | `/api/teacher/courses/:id` | full course body | `Course` (status unchanged) |
| POST | `/api/teacher/courses/:id/submit` | none | `Course` (`draft`/`rejected` → `pending`, full validation) |
| DELETE | `/api/teacher/courses/:id` | none | `204` (draft/rejected with 0 students only) |
| GET | `/api/teacher/students` | `courseId`, `q`, `page`, `limit` | paginated `{ enrollment, student: {id, name, email, avatar}, course: {id, title}, progress, amountPaid }` + `stats: { enrollments, uniqueStudents, averageProgress }` |
| GET | `/api/teacher/coupons` | none | `Coupon[]` with computed `state` (`active` \| `inactive` \| `expired`) |
| POST | `/api/teacher/coupons` | coupon body | `201 Coupon` |
| PUT | `/api/teacher/coupons/:id` | coupon body | `Coupon` |
| PATCH | `/api/teacher/coupons/:id/active` | `{ active }` | `Coupon` |
| DELETE | `/api/teacher/coupons/:id` | none | `204` |
| GET | `/api/teacher/earnings` | `courseId`, `page`, `limit` | `{ finance: TeacherFinance, monthly: MonthPoint[], transactions: paginated PurchaseView[] }` |
| GET | `/api/teacher/withdrawals` | none | `{ finance: TeacherFinance, defaultAccount: string (from latest application), withdrawals: Withdrawal[] }` |
| POST | `/api/teacher/withdrawals` | `{ amount, accountNumber }` | `201 Withdrawal` |
| GET | `/api/teacher/reports` | `status`, `courseId`, `page`, `limit` | paginated `VideoReportView[]` (section 14) |
| POST | `/api/teacher/reports/:id/submit-fix` | `{ note }` | `VideoReportView` |

**Course body** (POST/PUT):

```ts
{
  level: Level; subject: string; title: string; description: string;
  thumbnail?: string | null; outcomes: string[];
  price: number; discountPrice?: number | null;
  chapters: {
    id?: string; title: string;
    lessons: { id?: string; title: string; durationMin: number; videoUrl: string; noteLink?: string | null; isPreview: boolean }[];
  }[];
}
```

Saving strategy (MUST keep ids stable, because completions, saved lessons and reports reference them):
in one transaction, update chapters/lessons whose `id` already belongs to this course, create the
ones without a matching id (if the client sent an id that doesn't exist anywhere, you may reuse it,
otherwise generate one), delete the ones missing from the body, and rewrite every `position` from array
order. Normalise every `videoUrl` with `toEmbedUrl` (reject invalid ones only on submit, but always store
the normalised form when valid).

### 10.7 Admin

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/api/admin/overview` | none | `{ counts: { students, teachers, liveCourses, pendingCourses, sales, refunded }, totals: SalesTotals, registrationFees: { total, count }, monthly: MonthPoint[], pendingApplications (pending_review + under_verification, ≤5), pendingCourses (≤5), pendingWithdrawals (≤5), recentActivity (≤8), reports: { open, awaitingApproval } }` |
| GET | `/api/admin/teacher-applications` | `status`, `q`, `page`, `limit` | paginated `{ ...TeacherApplication, email, feePaid: boolean }` |
| GET | `/api/admin/teacher-applications/:id` | none | `{ application (full, unmasked), email, registrationFee, teacher }` |
| POST | `/api/admin/teacher-applications/:id/request-payment` | none | `TeacherApplication` |
| POST | `/api/admin/teacher-applications/:id/approve` | none | `{ application, teacher }` |
| POST | `/api/admin/teacher-applications/:id/reject` | `{ reason }` | `TeacherApplication` |
| GET | `/api/admin/courses` | `status`, `level`, `q` (title or teacher name), `page`, `limit` | paginated rows; **pending first**, then most recently updated |
| GET | `/api/admin/courses/:id` | none | `Course` (full) + teacher + `{ sales, gross }` |
| POST | `/api/admin/courses/:id/approve` | none | `Course` (from `pending` or `suspended`) |
| POST | `/api/admin/courses/:id/reject` | `{ reason }` | `Course` |
| POST | `/api/admin/courses/:id/suspend` | `{ reason }` | `Course` |
| GET | `/api/admin/teachers` | `status`, `q` (name or teacherCode), `page`, `limit` | rows: teacher + user status + `{ liveCourses, totalCourses, gross, net, withdrawable }` |
| GET | `/api/admin/students` | `status`, `q` (name or email), `page`, `limit` | rows: user + `{ enrolled, totalSpent, applicationStatus }` |
| PATCH | `/api/admin/users/:id/status` | `{ status: "active" \| "banned" }` | `User` (admins cannot ban themselves or other admins) |
| GET | `/api/admin/registration-fees` | `q` (applicant or trxId), `page`, `limit` | paginated fees + `{ totals: { collected, count, awaitingPayment } }` |
| GET | `/api/admin/transactions` | `status`, `method`, `q` (trxId, course, student, teacher), `page`, `limit` | paginated `PurchaseView[]` + `totals: SalesTotals` **for the filtered set** |
| GET | `/api/admin/transactions/:id` | none | `PurchaseView` |
| GET | `/api/admin/withdrawals` | `status` (default `pending`), `page`, `limit` | paginated rows with teacher name + their current `withdrawable`; pending first; `+ sums per status` |
| POST | `/api/admin/withdrawals/:id/approve` | none | `Withdrawal` (only from pending; simulated payout) |
| POST | `/api/admin/withdrawals/:id/reject` | `{ reason }` | `Withdrawal` (note = reason) |
| GET | `/api/admin/reports` | none | `{ totals: SalesTotals, registrationFees, platformRevenue, monthly, byTeacher: (TeacherFinance & {id, name})[], byLevel: (SalesTotals & {level})[] }` |
| GET | `/api/admin/activity-logs` | `role`, `q`, `page`, `limit` (default 15) | paginated `ActivityLog[]` newest first |
| GET | `/api/admin/video-reports` | `status`, `courseId`, `teacherId`, `page`, `limit` | paginated `VideoReportView[]` (section 14) |
| POST | `/api/admin/video-reports/:id/approve-fix` | `{ note? }` | `VideoReportView` |
| POST | `/api/admin/video-reports/:id/reject-fix` | `{ reason }` | `VideoReportView` |

### 10.8 Uploads

| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| POST | `/api/uploads` | 👤 | multipart `file`, `purpose` (`avatar` \| `thumbnail` \| `application-doc`) | `201 { url, name, type, size }` |

### 10.9 Video reports (student side)

| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| POST | `/api/learn/:courseId/lessons/:lessonId/reports` | 🎓 | `{ reason, description? }` | `201 VideoReportView` |
| GET | `/api/me/video-reports` | 🎓 | none | `VideoReportView[]` (the student's own reports and their status) |

---

## 11. Response shapes

These mirror `src/lib/types.ts` in the frontend. Keep field names identical.

```ts
type Role = "student" | "teacher" | "admin";
type Level = "SSC" | "HSC" | "BSc" | "BBA" | "BA" | "Others";

interface User {
  id: string; name: string; email: string; role: Role; status: "active" | "banned";
  avatar?: string; phone?: string; institution?: string; gender?: string; dateOfBirth?: string;
  createdAt: string;
}

interface TeacherProfile {
  id: string; userId: string; teacherCode: string; headline: string; bio: string;
  qualifications: string[]; institution: string; experienceYears: number; joinedAt: string;
}

// Public teacher card/profile
interface TeacherPublic extends TeacherProfile {
  name: string; avatar?: string; status: "active" | "banned";
  stats: { courses: number; students: number; rating: number; reviewCount: number };
}

interface UploadedDoc { url?: string; name: string; type: string; size: number }

interface TeacherApplication {
  id: string; userId: string; fullName: string; nid: string; bkashNumber: string; tin: string;
  dateOfBirth: string; gender: string;
  photo?: UploadedDoc; sscCertificate?: UploadedDoc; hscCertificate?: UploadedDoc; fatherVoterId?: UploadedDoc;
  status: "pending_review" | "payment_required" | "under_verification" | "approved" | "rejected";
  submittedAt: string; updatedAt: string; reviewNote?: string; teacherId?: string;
}

interface RegistrationFee {
  id: string; applicationId: string; userId: string; amount: number; method: "bKash";
  payerNumber: string; trxId: string; paidAt: string;
}

interface Lesson {
  id: string; title: string; durationMin: number;
  videoUrl: string | null;   // null when the requester can't watch it
  noteLink: string | null;   // null when absent OR locked
  isPreview: boolean;
  canWatch?: boolean;        // included in public/player responses
}
interface Chapter { id: string; title: string; lessons: Lesson[] }
interface Review { id: string; studentName: string; rating: number; comment: string; date: string }

interface Course {
  id: string; teacherId: string; level: Level; subject: string; title: string; description: string;
  thumbnail?: string; outcomes: string[]; price: number; discountPrice?: number;
  status: "draft" | "pending" | "approved" | "rejected" | "suspended"; statusNote?: string;
  chapters: Chapter[]; reviews: Review[]; featured?: boolean; createdAt: string; updatedAt: string;
}

interface CourseSummary {
  id: string; level: Level; subject: string; title: string; thumbnail?: string;
  price: number; discountPrice?: number; effectivePrice: number; discountPercent: number;
  teacher: { id: string; name: string; avatar?: string };
  rating: { average: number; count: number };
  studentCount: number; lessonCount: number; chapterCount: number; durationMin: number;
  featured: boolean; createdAt: string;
}

interface CourseDetail extends CourseSummary {
  description: string; outcomes: string[]; status: Course["status"]; statusNote?: string;
  published: boolean;                     // in the catalog?
  chapters: Chapter[];                    // access-filtered (see section 7)
  reviews: Review[];
  teacher: TeacherPublic;
  access: { enrolled: boolean; owner: boolean; full: boolean };
  enrollment?: { progress: Progress; resumeLessonId?: string };
}

interface Progress { completed: number; total: number; percent: number }

interface Coupon {
  id: string; teacherId: string; code: string; type: "percent" | "fixed"; value: number;
  expiresAt: string; usageLimit: number; usedCount: number; courseId: string | null;
  active: boolean; createdAt: string; state?: "active" | "inactive" | "expired";
}
interface CouponPublic { code: string; type: "percent" | "fixed"; value: number }

interface Quote {
  listPrice: number; coursePrice: number; courseDiscount: number; couponDiscount: number;
  total: number; commission: number; teacherNet: number;
}

interface Purchase {
  id: string; studentId: string; courseId: string; teacherId: string;
  listPrice: number; coursePrice: number; couponCode?: string; couponDiscount: number;
  amountPaid: number; commission: number; teacherNet: number;
  method: "bKash" | "Nagad" | "Card"; trxId: string; status: "completed" | "refunded"; createdAt: string;
}
interface PurchaseView extends Purchase {
  course: { id: string; title: string }; student: { id: string; name: string; email: string };
  teacher: { id: string; name: string };
}

interface Enrollment {
  id: string; studentId: string; courseId: string; purchaseId: string; enrolledAt: string;
  completedLessonIds: string[]; lastLessonId?: string; lastWatchedAt?: string;
}
interface EnrolledCourse {
  enrollment: Enrollment; course: CourseSummary; progress: Progress;
  resumeLessonId?: string; lastLesson?: { id: string; title: string; chapterTitle: string };
}

interface SavedLessonView {
  id: string; savedAt: string;
  course: { id: string; title: string; level: Level; subject: string; thumbnail?: string };
  teacher: { id: string; name: string };
  lesson: { id: string; title: string; durationMin: number };
  chapter: { id: string; title: string; index: number };
}

interface Withdrawal {
  id: string; teacherId: string; amount: number; method: "bKash"; accountNumber: string;
  status: "pending" | "approved" | "rejected"; requestedAt: string; processedAt?: string; note?: string;
}

interface SalesTotals {
  sales: number; listTotal: number; discounts: number; gross: number; commission: number;
  teacherNet: number; refunds: number; refundedCount: number;
}
interface TeacherFinance extends SalesTotals {
  pendingClearance: number; withdrawn: number; pendingWithdrawals: number; withdrawable: number;
}
interface MonthPoint { month: string; gross: number; commission: number; net: number; sales: number }

interface ActivityLog {
  id: string; actorName: string; actorRole: Role | "system"; action: string; target: string; at: string;
}

interface PlayerData {
  course: CourseDetail;
  savedLessonIds: string[];
  myOpenReportLessonIds: string[];   // lessons this student already has an unresolved report on
}
```

**Masking:** in teacher-facing responses (`/api/teacher/me`) mask `nid`, `bkashNumber`, `tin` as
first 3 chars + `•` + last 3 chars (e.g. `017•••••999`). Admin detail endpoints return them unmasked.
Students only ever see their own application.

---

## 12. Activity log

Write one `ActivityLog` row for each of these (actor = the signed-in user; `actorName`/`actorRole`
copied at write time so history survives user changes). `target` is shown next to the action.

| Action (exact text) | Target |
|---|---|
| `Registered a new account` | email |
| `Purchased a course (simulated payment)` | course title |
| `Submitted a teacher application` | applicant full name |
| `Paid the teacher registration fee (simulated)` | `৳300 via bKash` |
| `Requested registration fee` | applicant full name |
| `Approved teacher application` | applicant full name |
| `Rejected teacher application` | applicant full name |
| `Created a course draft` | course title |
| `Submitted a course for approval` | course title |
| `Deleted a course` | course title |
| `Approved course` / `Rejected course` / `Suspended course` | course title |
| `Created a coupon` | code |
| `Requested a withdrawal` | `৳<amount with thousands separators>` |
| `Approved withdrawal` / `Rejected withdrawal` | teacher name |
| `Banned user` / `Unbanned user` | user name |
| `Reported a video` | `<course title> · <lesson title>` |
| `Submitted a video fix` | `<course title> · <lesson title>` |
| `Approved a video fix` / `Rejected a video fix` | `<course title> · <lesson title>` |

---

## 13. Lesson notes (new)

- `Lesson.noteLink` (optional): a link to the lesson's notes (PDF, Google Drive, etc.).
- Teachers set it per lesson in the course editor (`chapters[].lessons[].noteLink`). Validate as an
  `https://` URL when present; empty string → `null`.
- In player responses `noteLink` is returned **only when the requester can watch that lesson**; otherwise
  `null`. The player shows a "Download notes" button when it is present.
- Seed: give a few seeded lessons a note link (fictional URLs such as `https://example.com/notes/motion.pdf`).

> Frontend status: `noteLink` is **not yet** in the frontend `Lesson` type or the course editor; it will
> be added. Accept and return it now.

---

## 14. Video report system (new)

Students can report a problem with any lesson video they can watch. The course's teacher fixes it,
and an admin must approve the fix before the report closes. A rejected fix goes back to the teacher,
who fixes it again and resubmits, repeating until the admin approves.

> Frontend status: **built on the mock store.** The player has a Report button (students), the teacher
> dashboard has `/teacher/reports`, the admin dashboard has `/admin/video-reports`, and both overview
> pages show an alert with the count waiting on that role. The frontend logic lives in
> `src/context/AppStore.tsx` (`reportVideo`, `submitReportFix`, `reviewReportFix`) and `src/lib/reports.ts`;
> match its rules and messages.

### Reasons (enum `ReportReason`)

| Value | Label |
|---|---|
| `VIDEO_ISSUE` | Video problem (not playing, poor quality) |
| `AUDIO_ISSUE` | Audio problem |
| `WRONG_CONTENT` | Wrong or mismatched content |
| `INAPPROPRIATE_CONTENT` | Inappropriate content |
| `BROKEN_LINK` | Broken or private video link |
| `OTHER` | Other (description required) |

### Lifecycle (enum `ReportStatus`)

```
 student reports ──► open ──(teacher: submit fix + note)──► fix_submitted
                                                              │        │
                                   (admin: approve fix)◄──────┘        └──(admin: reject fix + reason)
                                            │                                     │
                                            ▼                                     ▼
                                        resolved                            fix_rejected
                                                                                  │
                                         (teacher fixes again: submit fix + note) │
                                                         fix_submitted ◄──────────┘
```

| Action | Allowed from | Who | Sets |
|---|---|---|---|
| Report | (new) | student who can watch the lesson | `status = open`, event `reported` |
| Submit fix | `open`, `fix_rejected` | the course's teacher | `status = fix_submitted`, `teacherNote`, `fixSubmittedAt = now`, event `fix_submitted` |
| Approve fix | `fix_submitted` | admin | `status = resolved`, `resolvedAt = now`, `adminNote` (optional), event `fix_approved` |
| Reject fix | `fix_submitted` | admin | `status = fix_rejected`, `adminNote = reason` (required), event `fix_rejected` |

Any other transition → 422 `BUSINESS_RULE` (`"This report can't be updated from its current status."`).
`resolved` is final. Teachers can never resolve their own reports. Admins never submit fixes.

### Rules

- **Who can report:** students who can watch the lesson (`canWatch`, see section 7), including free
  previews. Teachers and admins cannot create reports.
- **One active report per student per lesson:** if the student already has a report on that lesson
  with status other than `resolved` → 409 `"You've already reported this video. We'll update you when it's fixed."`
- `description`: optional, max 1000 chars; **required when `reason = OTHER`**
  (`"Please describe the problem."`).
- Fix `note`: required, 5–1000 chars (`"Describe what you fixed."`). The teacher usually also edits
  the lesson (new `videoUrl`, title, etc.) through the normal course editor before submitting the fix;
  the report does not change the lesson by itself.
- Reject `reason`: required, 5–1000 chars.
- Store `courseId` and `teacherId` on the report at creation (copied from the lesson's course) so
  dashboards can filter fast and history survives course edits.
- Every transition appends a `VideoReportEvent` (full history, shown as a timeline) and an
  `ActivityLog` row (section 12).

### Dashboard counts

- Teacher overview `reports`: `needsFix = count(status in [open, fix_rejected])`,
  `awaitingAdmin = count(status = fix_submitted)` for that teacher.
- Admin overview `reports`: `open = count(status in [open, fix_rejected])`,
  `awaitingApproval = count(status = fix_submitted)`.
- Lists sort by priority: teacher sees `fix_rejected` and `open` first; admin sees `fix_submitted`
  first; then newest `updatedAt`.

### `VideoReportView`

```ts
interface VideoReportView {
  id: string;
  reason: "VIDEO_ISSUE" | "AUDIO_ISSUE" | "WRONG_CONTENT" | "INAPPROPRIATE_CONTENT" | "BROKEN_LINK" | "OTHER";
  description?: string;
  status: "open" | "fix_submitted" | "fix_rejected" | "resolved";
  teacherNote?: string;
  adminNote?: string;
  createdAt: string; updatedAt: string; fixSubmittedAt?: string; resolvedAt?: string;
  course: { id: string; title: string };
  chapter: { id: string; title: string };
  lesson: { id: string; title: string; videoUrl: string };   // full URL: only teacher/admin/reporter see this
  teacher: { id: string; name: string };
  reporter: { id: string; name: string };                      // teachers see the name only, never email
  events: { id: string; type: "reported" | "fix_submitted" | "fix_approved" | "fix_rejected"; actorName: string; actorRole: string; note?: string; at: string }[];
}
```

If the lesson is deleted, its reports are deleted with it (cascade).

---

## 15. File uploads

Used for avatars, course thumbnails and teacher-application documents.

- `POST /api/uploads` (multipart, field `file`) with `purpose`:
  - `avatar`, `thumbnail`: images (`image/jpeg`, `image/png`, `image/webp`), ≤ 5 MB → **public** URL.
  - `application-doc`: image or `application/pdf`, ≤ 5 MB → **private** storage. Return a URL that
    only works through an authenticated download endpoint
    (`GET /api/uploads/private/:key`, allowed for the uploader and admins).
- Validate MIME by content (magic bytes), not just the extension. Randomise stored file names.
- Storage: use **Cloudinary** if credentials are configured (the previous version of this project used
  it), otherwise local disk under `uploads/` served by Express in development. Keep it behind one
  `storage` service so it can be swapped.
- The application body references uploaded files as `{ url, name, type, size }`.

---

## 16. Seed data

`prisma/seed.ts` must create a realistic, **fictional** dataset matching the frontend demo
(`rootover-frontend-v2/src/lib/seed.ts`; port that file's data directly when available).
Idempotent: wipe and recreate in development.

Required demo accounts (hash these passwords):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@rootover.demo` | `Admin@123` |
| Teacher | `teacher@rootover.demo` | `Teacher@123` |
| Student | `student@rootover.demo` | `Student@123` |

Other seeded users use password `Demo@123`.

Minimum content:

- **4 approved teachers** (the demo teacher is "Dr. Rezaul Karim", `RO-T-26-0101`; others `0102`–`0104`),
  each with an approved application and a paid ৳300 registration fee.
- **11 courses**: at least one per level (SSC, HSC, BSc, BBA, BA, Others); statuses: 8 `approved`,
  1 `pending`, 1 `rejected` (with a `statusNote`), 1 `draft` (owned by the demo teacher). Each approved
  course has 2–4 chapters with 2–3 lessons, the first lesson of each course `isPreview = true`, all
  using `https://www.youtube.com/embed/KDPZy2lBhik`, and 2–4 demo reviews.
- **12 students** (one `banned`), the demo student enrolled in 4 courses from 3 different teachers (two
  from the demo teacher) with mixed progress (one in progress, one barely started, one 100%, one new) and
  4 saved lessons. **The demo student has no teacher application** so the workflow can be demoed.
- Applications in every state: `pending_review`, `payment_required`, `under_verification` (fee paid),
  `rejected` (with reason), plus the approved ones.
- Coupons per teacher: active course-specific (`PHYSICS20` 20%), active all-courses fixed
  (`KARIM100` ৳100), expired (`EID25`), inactive (`ACCOUNT10`), plus `CHEM15`, `CODE50`.
- ~45 purchases spread over the last 6 months (some using coupons, a few in the last 7 days so
  "pending clearance" is non-zero, exactly one `refunded` with no enrollment).
- Withdrawals per teacher: approved, pending, and one rejected, never exceeding what was withdrawable.
- A handful of video reports in each status (`open`, `fix_submitted`, `fix_rejected`, `resolved`) with
  matching event history, and some lessons with `noteLink`.
- ~10 activity log entries.

All identity data must be obviously fictional: NID like `9990000101xx`, bKash `01700000xxx`,
TIN `000000xxxxxx`, documents as placeholder files.

---

## 17. Security checklist

- Hash passwords (bcrypt); never log or return them; never store payment PINs.
- Validate every request body/query with zod; reject unknown enum values.
- Enforce role **and ownership** in services, not just routes.
- Never send locked lesson `videoUrl`/`noteLink` (section 7).
- Rate-limit `/api/auth/*` (e.g. 20 req / 15 min / IP) and report creation (e.g. 10 / hour / user).
- Private application documents only via authenticated download (uploader + admin).
- Mask NID/TIN/bKash outside admin views.
- Money changes only inside transactions; re-check balances/limits inside the transaction.
- `helmet`, strict CORS (`CORS_ORIGIN`), JSON body limit (e.g. 1 MB), uploads limit 5 MB.
- Central error handler; never leak stack traces or Prisma errors to clients.

---

## 18. Environment variables

```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/rootover
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
# Optional; when absent, files are stored on local disk under ./uploads
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Validate env at startup with zod and fail fast with a clear message. Provide `.env.example`.

---

## 19. Acceptance tests

Write automated tests (Vitest/Jest + supertest against a test database) covering at least:

1. `quote({price: 1000}, {type: "percent", value: 20})` → total 800, commission 80, teacherNet 720.
2. Course ৳1,500 with discount ৳1,200 + fixed coupon ৳100 → coursePrice 1200, courseDiscount 300, total 1100.
3. Fixed coupon larger than the price → total 0 (never negative).
4. For every seeded purchase: `amountPaid = coursePrice − couponDiscount`, `commission + teacherNet = amountPaid`,
   `commission = round(amountPaid × 0.1)`.
5. For every teacher: `teacherNet = pendingClearance + withdrawn + pendingWithdrawals + withdrawable`, withdrawable ≥ 0.
6. Platform gross/commission/net equal the sums over all teachers.
7. Coupon checks: `PHYSICS20` valid on SSC Physics, invalid on HSC Physics ("isn't valid for this course");
   `KARIM100` invalid on another teacher's course; `EID25` expired; `ACCOUNT10` inactive; unknown code;
   usage limit reached.
8. Locked lessons return `videoUrl: null` and `noteLink: null` to guests and non-enrolled students;
   previews are watchable by everyone.
9. A teacher/admin calling `POST /api/checkout` gets 403; buying twice gets 409.
10. Application workflow end to end: submit → request fee → pay → approve → user role is `teacher`,
    `teacherCode` generated; illegal transitions return 422.
11. Course workflow: draft → submit (validation) → approve → appears in `/api/courses`; ban teacher → disappears.
12. Withdrawal above withdrawable → 422; rejected withdrawal returns the amount to withdrawable.
13. Video report: report → submit fix → reject → status `fix_rejected` → submit fix again → approve →
    `resolved`; duplicate active report → 409; teacher cannot approve; `OTHER` without description → 400.
14. Banned user cannot log in (403) and existing tokens stop working.

---

## 20. Build order

1. Project setup, env validation, Prisma schema, migration, error handling, logging.
2. Auth (register/login/me), role + ownership middleware.
3. Seed script (section 16); verify with Prisma Studio.
4. Pricing/finance modules + their unit tests (section 19, tests 1–7).
5. Public catalog, course details (access filtering), teachers, free previews.
6. Checkout, enrollments, progress, saved lessons, purchase history, student dashboard.
7. Teacher application + registration fee.
8. Teacher course CRUD + submit, students, coupons, earnings, withdrawals, profile.
9. Admin: applications, courses, users, fees, transactions, withdrawals, reports, activity log.
10. Lesson notes + video report system.
11. Uploads.
12. Full test suite, lint, `tsc --noEmit`, build; fix every error before finishing.

**Definition of done:** `npm run build` and `npm test` pass with zero errors, migrations apply to a
fresh database, the seed runs twice without failing, and every endpoint in section 10 responds with
the shapes in section 11.
