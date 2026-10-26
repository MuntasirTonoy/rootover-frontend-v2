"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Radical,
  ShieldCheck,
  User as UserIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { Avatar } from "./ui/primitives";
import { useApp } from "@/context/AppStore";
import { adminNav, studentMobileNav, teacherNav } from "@/lib/navigation";
import { dashboardPath } from "@/lib/navigation";
import { banner } from "@/lib/site-config";
import type { User } from "@/lib/types";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/teachers", label: "Teachers" },
  { href: "/about", label: "About" },
];

interface MenuLink {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const profileLink: MenuLink = { href: "/profile", label: "Profile", icon: UserIcon };
const becomeTeacherLink: MenuLink = { href: "/teacher/apply", label: "Become a Teacher", icon: GraduationCap };

// Desktop avatar dropdown. Students reach their other learning pages from the
// dashboard sidebar, so their dropdown stays short.
function dropdownLinks(user: User): MenuLink[] {
  const dashboard: MenuLink = {
    href: dashboardPath(user.role),
    label: user.role === "admin" ? "Admin Dashboard" : user.role === "teacher" ? "Teacher Dashboard" : "Dashboard",
    icon: user.role === "admin" ? ShieldCheck : LayoutDashboard,
  };
  return user.role === "student" ? [dashboard, profileLink, becomeTeacherLink] : [dashboard, profileLink];
}

// Mobile hamburger: the full sidebar menu for the role, since the dashboard
// sidebar is desktop-only
function mobileLinks(user: User): MenuLink[] {
  if (user.role === "student") return [...studentMobileNav, becomeTeacherLink];
  if (user.role === "teacher") return [...teacherNav, profileLink];
  return [...adminNav, profileLink];
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path: string) =>
    (path === "/" ? pathname === "/" : pathname.startsWith(path))
      ? "text-primary font-bold"
      : "text-muted-foreground hover:text-foreground transition-colors";

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    router.push("/");
  };

  const links = user ? dropdownLinks(user) : [];
  const roleLinks = user ? mobileLinks(user) : [];
  const isCurrent = (link: MenuLink) =>
    link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
  // Teachers don't need the public teacher directory
  const navLinks = user?.role === "teacher" ? publicLinks.filter((l) => l.href !== "/teachers") : publicLinks;

  return (
    <nav className="sticky top-0 z-50 w-full">
      <div className="h-20 border-b border-border bg-background/80 backdrop-blur-md transition-colors duration-300">
        <div className="container-custom h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            {banner.logoUrl ? (
              <img src={banner.logoUrl} alt="Root Over" className="h-10 w-auto object-contain" />
            ) : (
              <>
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <Radical size={20} />
                </div>
                <span className="text-xl font-bold tracking-tight">Root Over</span>
              </>
            )}
          </Link>

          <div className="hidden lg:flex items-center gap-7 font-medium">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(link.href)}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  aria-expanded={isProfileOpen}
                  aria-label="Account menu"
                  className="rounded-full ring-2 ring-offset-2 ring-offset-background ring-primary/40 hover:ring-primary transition-all"
                >
                  <Avatar name={user.name} src={user.avatar} />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-60 p-2 bg-card border border-border rounded-xl shadow-lg animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-border mb-2">
                      <p className="font-bold text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                        {user.role}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsProfileOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            pathname.startsWith(link.href) ? "bg-primary/10 text-primary" : "hover:bg-surface"
                          }`}
                        >
                          <link.icon size={16} />
                          {link.label}
                        </Link>
                      ))}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="px-4 py-2 text-sm font-bold hover:bg-surface rounded-md transition-colors">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-primary text-black font-bold px-5 py-2 text-sm rounded-md hover:bg-primary-hover transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-surface transition-colors"
              aria-label="Open Menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] lg:hidden"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-xs bg-background border-l border-border p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-xl font-bold">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface transition-colors"
                  aria-label="Close Menu"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6">
                <div className="flex flex-col space-y-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`px-4 py-3 rounded-xl font-medium ${pathname === link.href ? "bg-primary/10 text-primary font-bold" : "hover:bg-surface"}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-border pt-6">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-4">
                        <Avatar name={user.name} src={user.avatar} />
                        <div className="min-w-0">
                          <p className="font-bold truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                        </div>
                      </div>
                      {roleLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          aria-current={isCurrent(link) ? "page" : undefined}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium ${
                            isCurrent(link) ? "bg-primary/10 text-primary" : "hover:bg-surface"
                          }`}
                        >
                          <link.icon size={18} />
                          {link.label}
                        </Link>
                      ))}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-500/10 text-red-600 dark:text-red-400 font-medium text-left"
                      >
                        <LogOut size={18} /> Logout
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full py-3 text-center font-bold hover:bg-surface rounded-md border border-border"
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full py-3 text-center font-bold bg-primary text-black rounded-md hover:bg-primary-hover"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function NavbarFallback() {
  return (
    <div className="sticky top-0 z-50 w-full h-20 border-b border-border bg-background/80 backdrop-blur-md" />
  );
}
