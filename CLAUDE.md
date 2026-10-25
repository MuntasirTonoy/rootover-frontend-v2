# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Frontend (v2) for **Root Over Education**, a course marketplace for Bangladesh: verified teachers sell complete subject courses (Level → Course → Chapters → Lessons → YouTube unlisted video) and students buy and watch them. The backend is `../rootover-backend-v2` (Express + Prisma, contract in `docs/BACKEND_SPEC.md`); payments stay simulated. **The switch from the mock to the API happens in stages** (see "Connecting to the API" below): connected pages call the API, the rest still run on the `localStorage` mock.

## Commands

- `npm run dev`: dev server on http://localhost:3000 (Turbopack)
- `npm run build`: production build; also the only check that enforces the Cache Components `Suspense` rules (see below)
- `npm run lint`: ESLint (flat config, `eslint-config-next` core-web-vitals + typescript). The `@next/next/no-img-element` warnings are expected (uploaded images are data/blob URLs)
- `npx tsc --noEmit`: standalone type-check. If it reports errors under `.next/types` for routes that no longer exist, delete `.next` (stale generated types)

There is no test runner configured.

## Next.js version caveat

This is Next.js **16.4** with React 19.3, and APIs differ from older versions. Before writing Next-specific code, read the bundled docs in `node_modules/next/dist/docs/` (`01-app/` for App Router). `next.config.ts` enables `cacheComponents` and `partialPrefetching`, which has concrete consequences here:

- `usePathname`, `useSearchParams`, `useParams` and page `params`/`searchParams` promises are request-time data and must sit under a `<Suspense>` boundary, or `next build` fails. The root layout wraps `<Navbar>` in `Suspense`; the `(student)`, `teacher` and `admin` layouts wrap their content; public pages with params/search params render a `Suspense` around an inner component that calls `use(params)` / `useSearchParams()`.
- Client page components receive `params` as a promise; type it explicitly (`{ params: Promise<{ courseId: string }> }`).

## Architecture

### Data layer (`src/lib/`)

- `types.ts`: the whole data model (`DemoDB` and its collections). Shapes mirror what a real API would return.
- `seed.ts`: fictional seed data built from a **fixed base date and seeded random**, so server and client renders start identical. `DB_VERSION` must be bumped when the shape changes (stored data with another version is discarded). `DEMO_ACCOUNTS` holds the demo logins.
- `pricing.ts`: **the only place money is calculated**: `quote()` (list price → course discount → coupon → total → 10% commission → teacher net), `checkCoupon()`, constants (`COMMISSION_RATE`, `REGISTRATION_FEE`, `CLEARING_DAYS`, `MIN_WITHDRAWAL`).
- `selectors.ts`: pure read helpers over the DB: `catalogCourses` (approved + teacher not banned), `lessonAccess`, `progressOf`, `resumeLesson`, `salesTotals`, `teacherFinance`, `monthlySeries`. Teacher net always satisfies `net = pendingClearance + withdrawn + pendingWithdrawals + withdrawable`; refunded purchases are excluded from totals. Put new derived numbers here rather than computing them in pages.

### Connecting to the API

- `lib/api.ts`: `api<T>(path, { method, body, query })` against `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`), Bearer token from `localStorage` (`rootover_token`). Errors throw `ApiError { status, code, message, fields? }`; show `fields` next to inputs (keys like `chapters.0.title`). A stored token that gets 401, or 403 "suspended", fires `SESSION_EVENT` and the store signs out.
- `lib/api-types.ts`: response shapes (backend spec section 11): `CourseSummary`, `CourseDetail`, `TeacherPublic`, `EnrolledCourse`, `PlayerData`, ... Use these on connected pages, not the mock types in `types.ts`.
- `lib/use-api.ts`: `useApi<T>(path | null)` GETs once the session is known and refetches when the path or user changes (`{ data, error, loading, reload, setData }`); `useDebounced` for search boxes. `components/ui/ApiStatus.tsx` renders the spinner / error + retry: `if (!ready(state)) return <ApiStatus state={state} />`.
- Never compute money or access in connected pages: prices, quotes, coupon checks, progress and lesson locking come from the API (locked lessons arrive with `videoUrl: null`). Filtering already-loaded small lists in the browser is fine.
- **Stage 1 (done):** auth (login, register + 6-digit email code, logout, profile incl. password change with `currentPassword`), `/`, `/courses`, `/courses/[id]`, `/teachers`, `/teachers/[id]`, `/free-trial`, `/learn/[id]` (save, complete, watch tracking), `/checkout`, `/dashboard`, `/my-classes`, `/saved-videos`, `/purchase-history`, `/profile`. `CourseCard`, `TeacherCard` and `EnrolledCourseCard` take API shapes.
- **Stage 2 (done):** `/teacher/apply` (submit, simulated ৳300 fee; approval reloads the account so the teacher tools unlock) and the teacher area: the layout loads `GET /teacher/me` once and provides it through `useTeacher()` (`lib/use-teacher.ts`: `{ teacher, application (masked), reload }`); dashboard, courses, new/edit (`CourseWizard` saves through `saveCourse` / `submitCourse` and maps API field keys onto its own with `editorErrors`), students, earnings, coupons, withdrawals, profile. `DataTable` takes `serverPage` for API-paginated lists. Application documents are sent as `{ name, type, size }` and course thumbnails as `null` until uploads exist.
- **Still on the mock:** the admin area (so real teacher applications and submitted courses can't be reviewed from the UI yet), video reports (`ReportVideoButton`, `/teacher/reports`, report boards) and file uploads (preset avatars only; no course thumbnails or application files). These read `db` keyed by the signed-in user's id, which works because the mock seed and the backend seed share ids (`u-s1`, `u-t1`, `t1`, `c-ssc-physics`, ...). Accounts created through the API don't exist in the mock, so mock pages show nothing for them.

### Store and session (`src/context/AppStore.tsx`)

`useApp()` exposes `user` (from `GET /auth/me`), `hydrated` (false until the stored token has been checked; render nothing user-specific before it, `AuthGuard` does this), the auth actions (`login`, `loginAs`, `register`, `verifyEmail`, `resendVerification`, `logout`, `updateUser`, `refreshUser`; all async) and, for pages not yet connected, the mock `db` plus its remaining actions (admin moderation, video reports, `resetDemo`). Mock actions go through `mutate()`, which deep-copies the DB and optionally appends an activity-log entry; the mock is persisted to `localStorage` (`rootover_demo_db`) and synced across tabs. Remove a mock action once its last page is connected.

### Roles and routes

- **Public**: `/`, `/courses`, `/courses/[courseId]`, `/teachers`, `/teachers/[teacherId]`, `/free-trial`, `/about`, `/login` (one-click demo logins against the backend's seeded accounts), `/register` (form, then the emailed code; `/register?verify=<email>` opens the code step, used when an unverified account logs in), `/learn/[courseId]?lesson=` (player; preview lessons are open to anyone).
- **Student** (`src/app/(student)/`): `/dashboard`, `/my-classes`, `/saved-videos`, `/purchase-history` are student-only; `/profile` is shared by every role and renders inside that role's sidebar. Only students can buy courses (`/checkout` is student-only; the API rejects other roles).
- **Teacher** (`src/app/teacher/`): `/teacher/apply` is open to any signed-in user; every other teacher route requires the teacher role (gated in `teacher/layout.tsx`, which also loads `/teacher/me` for `useTeacher()`).
- **Admin** (`src/app/admin/`): admin-only.

Teacher application flow: `pending_review` → admin requests fee → `payment_required` → applicant pays ৳300 (simulated bKash) → `under_verification` → admin approves (creates a `TeacherProfile` with a generated Teacher ID and switches the user's role to teacher) or rejects.

### UI building blocks

- `components/ui/`: `primitives.tsx` (Badge/StatusBadge, StatCard, PageHeader, Section, Avatar, Stars, ProgressBar, SearchInput, FilterSelect, Field, EmptyBlock, SimulatedNotice), `DataTable` (paginated, horizontally scrollable), `Modal`, `FileInput` (local preview only), `SalesChart` (recharts).
- `components/course/`: `CourseThumb` (generated tile coloured by level when there's no thumbnail), `CurriculumList`, `CurriculumSidebar` (player), `CourseWizard` (3-step create/edit with chapter/lesson reordering and YouTube validation), `TeacherCard`, `EnrolledCourseCard`.
- `components/DashboardShell.tsx` + `lib/navigation.ts`: sidebar layout and per-role nav.
- `lib/ui.ts`: shared class presets (`btn.*`, `field`, `label`, `card`); `lib/confirm.ts`: SweetAlert2 confirm/reason dialogs; `lib/youtube.ts`: `toEmbedUrl` accepts watch/share/embed URLs and pasted `<iframe>` code.
- Icons: `lucide-react`. lucide 1.x removed brand icons, so Facebook/YouTube/Instagram/LinkedIn/Twitter/Google live in `components/BrandIcons.tsx`.

All payment screens and money records must stay clearly labelled as simulated, and demo identity data (NID, TIN, bKash numbers, documents) must stay obviously fictional.

## Styling

Tailwind CSS v4, wired in through the Turbopack loader `@tailwindcss/turbopack` in `next.config.ts`. There is no `postcss.config` or `tailwind.config`; all theme configuration lives in `src/app/globals.css`:

- Design tokens are CSS variables on `:root` (light) and `.dark` (dark). `next-themes` toggles the `.dark` class on `<html>`, and `@custom-variant dark` makes `dark:` utilities follow that class. Keep both token blocks in sync.
- The `@theme` block maps those variables to Tailwind colors, so use semantic classes (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-primary`, `bg-surface`, `text-muted-foreground`, …). `muted` is a mid-grey, so `bg-muted` is strong; use `bg-muted/10`–`/20` for subtle fills.
- Custom CSS classes must go inside an `@layer` (e.g. `@layer components`). Unlayered rules beat Tailwind utilities: `.container-custom` was once unlayered and silently cancelled every `py-*`/`pt-*` on the same element.
- Font: Outfit via `next/font/google`. Helpers: `.container-custom` (max-width 1280px, horizontal padding only) and `animate-float` / `animate-shimmer`.
