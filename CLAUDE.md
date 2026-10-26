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

- `types.ts`: shared shapes and enums of the API (`Course`, `Purchase`, `Role`, `REPORT_REASONS`, ...); composite response shapes are in `api-types.ts`.
- **The backend is the single source of business logic.** The frontend keeps no copy of pricing, finance, access rules or YouTube parsing (`pricing.ts`, `selectors.ts`, `seed.ts` and `youtube.ts` were deleted on 2026-10-26): prices, quotes, totals and balances come from API responses; platform constants (fee, commission, clearing days, minimum withdrawal) from `useConfig()` (`lib/use-config.ts`, `GET /config`, cached per page load; `formatBDT(undefined)` shows `৳…` while it loads); the course editor checks video links with `GET /teacher/video-link` and shows earnings from `GET /teacher/price-preview`. Don't reintroduce local copies.
- `demo-accounts.ts`: the one-click demo logins (the backend seed's accounts). `navigation.ts` also has `dashboardPath(role)`. `reports.ts`, `levels.ts` and `format.ts` are display labels/formatting only.

### Connecting to the API

- `lib/api.ts`: `api<T>(path, { method, body, query })` against `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`), Bearer token from `localStorage` (`rootover_token`). Errors throw `ApiError { status, code, message, fields? }`; show `fields` next to inputs (keys like `chapters.0.title`). A stored token that gets 401, or 403 "suspended", fires `SESSION_EVENT` and the store signs out.
- `lib/api-types.ts`: response shapes (backend spec section 11): `CourseSummary`, `CourseDetail`, `TeacherPublic`, `EnrolledCourse`, `PlayerData`, ... Use these on connected pages, not the mock types in `types.ts`.
- `lib/use-api.ts`: `useApi<T>(path | null)` GETs once the session is known and refetches when the path or user changes (`{ data, error, loading, reload, setData }`); `useDebounced` for search boxes. `components/ui/ApiStatus.tsx` renders the spinner / error + retry: `if (!ready(state)) return <ApiStatus state={state} />`.
- Never compute money or access in connected pages: prices, quotes, coupon checks, progress and lesson locking come from the API (locked lessons arrive with `videoUrl: null`). Filtering already-loaded small lists in the browser is fine.
- **Stage 1 (done):** auth (login, register + 6-digit email code, logout, profile incl. password change with `currentPassword`), `/`, `/courses`, `/courses/[id]`, `/teachers`, `/teachers/[id]`, `/free-trial`, `/learn/[id]` (save, complete, watch tracking), `/checkout`, `/dashboard`, `/my-classes`, `/saved-videos`, `/purchase-history`, `/profile`. `CourseCard`, `TeacherCard` and `EnrolledCourseCard` take API shapes.
- **Stage 2 (done):** `/teacher/apply` (submit, simulated ৳300 fee; approval reloads the account so the teacher tools unlock) and the teacher area: the layout loads `GET /teacher/me` once and provides it through `useTeacher()` (`lib/use-teacher.ts`: `{ teacher, application (masked), reload }`); dashboard, courses, new/edit (`CourseWizard` saves through `saveCourse` / `submitCourse` and maps API field keys onto its own with `editorErrors`), students, earnings, coupons, withdrawals, profile. `DataTable` takes `serverPage` for API-paginated lists. Application documents are sent as `{ name, type, size }` and course thumbnails as `null` until uploads exist.
- **Stage 3 (done):** the admin area except video reports: dashboard (`/admin/overview`), teacher applications (list + detail modal, request fee / approve / reject), courses (list + review modal from `/admin/courses/:id`, approve / reject / suspend / reinstate), teachers, students (`BanToggle` calls `PATCH /admin/users/:id/status` and reports the new status through `onChange`), registration fees, transactions, withdrawals (always sends `status`, since `""` = all and no status = pending), reports, activity log. Lists use `serverPage`; after an action the page reloads the list (and the open modal) instead of patching it, because sums and balances change. The dashboard's "Reset demo data" button is gone (it only reset the mock).
- **bKash payments (2026-10-26):** `/checkout` and the fee step on `/teacher/apply` call the API, get `{ paymentId, redirectURL }` (`PaymentStart`) and `window.location.assign` it (bKash sandbox page, or straight back when the backend runs the simulated provider). The API confirms the payment and redirects to `/payment/result?id=`, which shows `GET /payments/:id` (`PaymentView`), re-checks every 2 s while it's `initiated`/`processing`, and links to the player / My Classes / the application. There is no Nagad/Card or fake wallet modal any more; payment screens say "bKash sandbox: test payments only".
- **Stage 4 (done):** lesson notes (`noteLink` input per lesson in `CourseWizard`, validated as https; the player shows "Download notes" when the API sends a link) and video reports: `ReportVideoButton` posts to `/learn/:courseId/lessons/:lessonId/reports` and takes `reported` / `onReported` from the player (`myOpenReportLessonIds`); `VideoReportsBoard` (`/teacher/reports`, `/admin/video-reports`) loads the API board (`status` always sent: `action` = the role's to-do, `""` = all) and its modal submits / approves / rejects fixes, then reloads.
- **Uploads (part 12):** `lib/uploads.ts` (`uploadFile(file, purpose)` → `POST /uploads` as multipart; `api()` sends `FormData` without a JSON Content-Type). `FileInput` (now with a `purpose` prop) uploads on pick and returns the upload (`{ id, url, name, type, size }`), which the application form sends as-is. Application documents are private: `DocPreview` / `useViewableUrl` fetch a short-lived signed link from `GET /uploads/private/:id` (works for the uploader and admins). The profile avatar picker uploads photos and takes its presets from `useConfig().avatarPresets`; the course editor uploads thumbnails. "Fill demo data" on the application form fills text fields only: documents must be really uploaded.
- **Production mode (part 14):** demo-only UI (one-click logins on `/login`, coupon hints at checkout, "Fill demo data", "fictional data" notes) renders only when `useConfig().demo` is true (the API's `DEMO_MODE`). Payment wording follows the real provider: `components/ui/PaymentModeNotice.tsx` (`usePaymentMode()`: simulated / sandbox / live) shows a notice for simulated or sandbox payments and nothing for live bKash; never hard-code "simulated" or "sandbox" text. The amber callout is `Notice` (primitives). Payouts are manual: the admin sends the money by bKash, then approves to record it. `next.config.ts` sends security headers (no CSP yet) and drops `X-Powered-By`.
- **Admins and suspensions:** `/admin/admins` lists admins and removes others' roles; "Make admin" is on `/admin/students`. Any API answer saying the account is suspended fires `SUSPENDED_EVENT` (`lib/api.ts`) and the store shows `SuspendedDialog` (with the contact details from `site-config.ts`): opening the site with a banned account's saved session (which also signs it out) or logging in to one.
- **Auth inputs:** `components/GoogleSignIn.tsx` ("Continue with Google" on `/login` and `/register`, plus the "or" divider) loads Google Identity Services only when `useConfig().googleClientId` is set, renders Google's own button and posts its ID token through `loginWithGoogle` (`POST /auth/google`); without a client ID it renders nothing. Password fields use `components/ui/PasswordInput.tsx` (eye toggle); 6-digit email codes use `components/ui/OtpInput.tsx` (one box per digit, auto-advance, Backspace, paste/autofill).
- **Platform settings (2026-10-26):** `/admin/settings` changes the sale commission and the registration fee; the API emails the admin a code that must be entered to save (`POST /admin/settings/code`, then `PUT /admin/settings`), and the page calls `invalidateConfig()` (`lib/use-config.ts`) after a save. Never hard-code "10%" or "৳300": read `useConfig()` and format rates with `formatPercent`. Commission *totals* span past rates, so label them without a percentage. Paying the registration fee approves the teacher automatically (no "Verification" step unless an old application is still `under_verification`).
- **Ratings and video reports (2026-10-26):** ratings are anonymous and one-time: `RateCourseForm` posts `{ rating }` to `/learn/:id/rating` and is shown to buyers until `CourseDetail.enrollment.rated`; there are no reviews or comments anywhere (course details show the average and count only). A resolved video report is labelled **Approved** everywhere; both report boards open on all statuses (to-do items still sort first); a student can report the same lesson again once their report is approved.
- **Featured picks and teachers' purchases (2026-10-26):** the home page shows only admin-picked items (`/courses?featured=true`, `/teachers?featured=true`); admins toggle them with `components/dashboard/FeatureToggle.tsx` on `/admin/courses` and `/admin/teachers`. `/teacher/purchased` lists the teacher's own enrollments (`EnrolledCourseCard` with `canRate={false}`), and the player tracks their progress.
- **No page uses the mock any more.** `AppStore` is now only the session (the old `rootover_demo_db` localStorage key is removed on load).

### Store and session (`src/context/AppStore.tsx`)

`useApp()` exposes `user` (from `GET /auth/me`), `hydrated` (false until the stored token has been checked; render nothing user-specific before it, `AuthGuard` does this), the auth actions (`login`, `loginAs`, `register`, `verifyEmail`, `resendVerification`, `logout`, `updateUser`, `refreshUser`; all async) . Pages fetch their own data with `useApi`; there is no client-side data store.

### Roles and routes

- **Public**: `/`, `/courses`, `/courses/[courseId]`, `/teachers`, `/teachers/[teacherId]`, `/free-trial`, `/about`, `/login` (one-click demo logins against the backend's seeded accounts), `/register` (form, then the emailed code; `/register?verify=<email>` opens the code step, used when an unverified account logs in), `/forgot-password` (email → `POST /auth/forgot-password`, then code + new password → `/auth/reset-password`, which signs out every session and sends the user to `/login`; `?email=` pre-fills it from the login form), `/learn/[courseId]?lesson=` (player; preview lessons are open to anyone).
- **Student** (`src/app/(student)/`): `/dashboard`, `/my-classes`, `/saved-videos`, `/video-reports` (the student's own reports from `GET /me/video-reports`, with status and history), `/purchase-history` are student-only; `/profile` is shared by every role and renders inside that role's sidebar. Only students can buy courses (`/checkout` is student-only; the API rejects other roles).
- **Teacher** (`src/app/teacher/`): `/teacher/apply` is open to any signed-in user; every other teacher route requires the teacher role (gated in `teacher/layout.tsx`, which also loads `/teacher/me` for `useTeacher()`).
- **Admin** (`src/app/admin/`): admin-only.

Teacher application flow: `pending_review` → admin requests fee → `payment_required` → applicant pays ৳300 (simulated bKash) → `under_verification` → admin approves (creates a `TeacherProfile` with a generated Teacher ID and switches the user's role to teacher) or rejects.

### UI building blocks

- `components/ui/`: `primitives.tsx` (Badge/StatusBadge, StatCard, PageHeader, Section, Avatar, Stars, ProgressBar, SearchInput, FilterSelect, Field, EmptyBlock, SimulatedNotice), `DataTable` (paginated, horizontally scrollable), `Modal`, `FileInput` (uploads on pick) + `DocPreview`, `SalesChart` (recharts).
- `components/course/`: `CourseThumb` (generated tile coloured by level when there's no thumbnail), `CurriculumList`, `CurriculumSidebar` (player), `CourseWizard` (3-step create/edit with chapter/lesson reordering and YouTube validation), `TeacherCard`, `EnrolledCourseCard`.
- `components/DashboardShell.tsx` + `lib/navigation.ts`: sidebar layout and per-role nav.
- `lib/ui.ts`: shared class presets (`btn.*`, `field`, `label`, `card`); `lib/confirm.ts`: SweetAlert2 confirm/reason dialogs.
- Icons: `lucide-react`. lucide 1.x removed brand icons, so Facebook/YouTube/Instagram/LinkedIn/Twitter/Google live in `components/BrandIcons.tsx`.

Payment screens must say when payments aren't real (use `PaymentModeNotice`), and demo identity data (NID, TIN, bKash numbers, documents) must stay obviously fictional.

## Styling

Tailwind CSS v4, wired in through the Turbopack loader `@tailwindcss/turbopack` in `next.config.ts`. There is no `postcss.config` or `tailwind.config`; all theme configuration lives in `src/app/globals.css`:

- Design tokens are CSS variables on `:root` (light) and `.dark` (dark). `next-themes` toggles the `.dark` class on `<html>`, and `@custom-variant dark` makes `dark:` utilities follow that class. Keep both token blocks in sync.
- The `@theme` block maps those variables to Tailwind colors, so use semantic classes (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-primary`, `bg-surface`, `text-muted-foreground`, …). `muted` is a mid-grey, so `bg-muted` is strong; use `bg-muted/10`–`/20` for subtle fills.
- Custom CSS classes must go inside an `@layer` (e.g. `@layer components`). Unlayered rules beat Tailwind utilities: `.container-custom` was once unlayered and silently cancelled every `py-*`/`pt-*` on the same element.
- Font: Outfit via `next/font/google`. Helpers: `.container-custom` (max-width 1280px, horizontal padding only) and `animate-float` / `animate-shimmer`.
