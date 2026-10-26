import type { Role } from "./types";

// One-click demo logins; these accounts come from the backend's seed (npm run db:seed)
export const DEMO_ACCOUNTS: readonly { role: Role; label: string; email: string; password: string }[] = [
  { role: "admin", label: "Admin", email: "admin@rootover.demo", password: "Admin@123" },
  { role: "teacher", label: "Teacher", email: "teacher@rootover.demo", password: "Teacher@123" },
  { role: "student", label: "Student", email: "student@rootover.demo", password: "Student@123" },
];
