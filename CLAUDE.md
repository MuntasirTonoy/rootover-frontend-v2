# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Frontend (v2) for **Root Over Education**, a course marketplace for Bangladesh: verified teachers sell complete subject courses (Level → Course → Chapters → Lessons → YouTube unlisted video) and students buy and watch them. It is **frontend-only**: there is no backend, database or payment gateway. Everything runs on a mock data layer persisted in `localStorage`. The real backend lives in a separate project and must not be touched from here.

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

### Store and mock auth (`src/context/AppStore.tsx`)

`AppProvider` holds the `DemoDB` in React state, persists it to `localStorage` (`rootover_demo_db`) and syncs across tabs. `useApp()` exposes `db`, `user`, `hydrated` and every action (purchase, save/complete lessons, teacher application + simulated fee, course CRUD, coupons, withdrawals, admin moderation, `resetDemo`). Actions go through `mutate()`, which deep-copies the DB and optionally appends an activity-log entry. **Auth is UI-preview only**: plain-text demo passwords, session = user id in `localStorage` (`rootover_demo_session`). Render nothing user-specific until `hydrated` is true (`AuthGuard` does this).

### Roles and routes

- **Public**: `/`, `/courses`, `/courses/[courseId]`, `/teachers`, `/teachers/[teacherId]`, `/free-trial`, `/about`, `/login` (one-click demo logins), `/register`, `/learn/[courseId]?lesson=` (player; preview lessons are open to anyone).
- **Student** (`src/app/(student)/`): `/dashboard`, `/my-classes`, `/saved-videos`, `/purchase-history` are student-only; `/profile` is shared by every role and renders inside that role's sidebar. Only students can buy courses (`/checkout` is student-only and `purchase()` rejects other roles).
- **Teacher** (`src/app/teacher/`): `/teacher/apply` is open to any signed-in user; every other teacher route requires an approved teacher (gated in `teacher/layout.tsx`). `useTeacher()` (`lib/use-teacher.ts`) returns the signed-in teacher's profile and courses.
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
