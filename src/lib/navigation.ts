import {
  Activity,
  BadgePercent,
  BarChart3,
  Bookmark,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  Flag,
  GraduationCap,
  LayoutDashboard,
  Library,
  Receipt,
  ShieldCheck,
  User,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import type { NavItem } from "@/components/DashboardShell";
import type { Role } from "./types";

// Student dashboard sidebar (desktop). Profile lives in the avatar dropdown.
export const studentNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "My Classes", href: "/my-classes", icon: Library },
  { label: "Saved Videos", href: "/saved-videos", icon: Bookmark },
  { label: "Video Reports", href: "/video-reports", icon: Flag },
  { label: "Purchase History", href: "/purchase-history", icon: Receipt },
];

// Everything a student can open, for the mobile hamburger menu
export const studentMobileNav: NavItem[] = [...studentNav, { label: "Profile", href: "/profile", icon: User }];

export const teacherNav: NavItem[] = [
  { label: "Overview", href: "/teacher/dashboard", icon: LayoutDashboard },
  { label: "My Courses", href: "/teacher/courses", icon: BookOpen },
  { label: "Students", href: "/teacher/students", icon: Users },
  { label: "Video Reports", href: "/teacher/reports", icon: Flag },
  { label: "Coupons", href: "/teacher/coupons", icon: BadgePercent },
  { label: "Earnings", href: "/teacher/earnings", icon: BarChart3 },
  { label: "Withdrawals", href: "/teacher/withdrawals", icon: Wallet },
  { label: "Teacher Profile", href: "/teacher/profile", icon: UserCog },
];

export const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Teacher Applications", href: "/admin/teacher-applications", icon: ClipboardCheck },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Video Reports", href: "/admin/video-reports", icon: Flag },
  { label: "Teachers", href: "/admin/teachers", icon: GraduationCap },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Admins", href: "/admin/admins", icon: ShieldCheck },
  { label: "Registration Fees", href: "/admin/payments", icon: CreditCard },
  { label: "Transactions", href: "/admin/transactions", icon: Receipt },
  { label: "Withdrawals", href: "/admin/withdrawals", icon: Wallet },
  { label: "Statistics", href: "/admin/reports", icon: BarChart3 },
  { label: "Activity Log", href: "/admin/activity-logs", icon: Activity },
];

// Where each role lands after signing in
export const dashboardPath = (role: Role) =>
  role === "admin" ? "/admin/dashboard" : role === "teacher" ? "/teacher/dashboard" : "/dashboard";
