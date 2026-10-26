"use client";

// Session store. The backend issues a JWT (stored in localStorage, sent as a
// Bearer token by lib/api.ts) and `user` is the account from GET /auth/me.
// Every page fetches its own data from the API (lib/use-api.ts).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import SuspendedDialog from "@/components/SuspendedDialog";
import { api, ApiError, getToken, SESSION_EVENT, setToken, SUSPENDED_EVENT } from "@/lib/api";
import type { ApiUser, Session } from "@/lib/api-types";
import type { Role, TeacherApplication, User } from "@/lib/types";

const TOKEN_KEY = "rootover_token";
// Left behind by the old browser-only demo data; removed on load
const LEGACY_DB_KEY = "rootover_demo_db";

export interface Registration {
  message: string;
  email: string;
  // Seconds until another verification code can be requested
  resendAvailableIn: number;
}

export interface ProfilePatch {
  name?: string;
  phone?: string;
  institution?: string;
  gender?: string;
  dateOfBirth?: string;
  avatar?: string;
  password?: string;
  currentPassword?: string;
}

export type ApplicationInput = Omit<
  TeacherApplication,
  "id" | "userId" | "status" | "submittedAt" | "updatedAt" | "reviewNote" | "teacherId"
>;

interface AppContextValue {
  // False until the stored session has been checked; gate user-specific UI on it
  hydrated: boolean;
  user: User | null;
  // Throw ApiError (code EMAIL_NOT_VERIFIED when the sign-up code is pending)
  login: (email: string, password: string) => Promise<User>;
  loginAs: (role: Role) => Promise<User>;
  // Sends a 6-digit code; the account is usable after verifyEmail
  register: (input: { name: string; email: string; password: string }) => Promise<Registration>;
  verifyEmail: (email: string, code: string) => Promise<User>;
  resendVerification: (email: string) => Promise<Registration>;
  logout: () => void;
  updateUser: (patch: ProfilePatch) => Promise<User>;
  // Reloads the account (e.g. after an admin changed the role)
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const fromApi = (u: ApiUser): User => ({ ...u });

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // A suspended account was detected (on load or at login): show the dialog
  const [suspended, setSuspended] = useState(false);

  // Latest user for event handlers, synced before any of them can run
  const userRef = useRef(user);
  useLayoutEffect(() => {
    userRef.current = user;
  });

  // The account behind the stored token, or null (an invalid token is dropped)
  const loadSession = useCallback(async () => {
    if (!getToken()) return setUser(null);
    try {
      const me = await api<{ user: ApiUser }>("/auth/me");
      setUser(fromApi(me.user));
    } catch (err) {
      // Network trouble keeps the token for the next try; a rejected one is dropped
      if (err instanceof ApiError && err.status !== 0) setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DB_KEY);
    } catch {
      // Storage may be unavailable (private mode); nothing to clean up then
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the stored token is only readable after mount
    loadSession().finally(() => setHydrated(true));

    // Signing in or out in another tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) void loadSession();
    };
    // The API rejected the token mid-session (expired, or the account was banned)
    const onSessionEnded = (e: Event) => {
      setToken(null);
      if (!userRef.current) return;
      setUser(null);
      const message = (e as CustomEvent<string>).detail;
      // A suspension gets the dialog instead (SUSPENDED_EVENT)
      if (message === "Please log in first.") toast.error("Your session has ended. Please log in again.");
      else if (!message.includes("suspended")) toast.error(message);
    };
    const onSuspended = () => setSuspended(true);
    window.addEventListener("storage", onStorage);
    window.addEventListener(SESSION_EVENT, onSessionEnded);
    window.addEventListener(SUSPENDED_EVENT, onSuspended);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SESSION_EVENT, onSessionEnded);
      window.removeEventListener(SUSPENDED_EVENT, onSuspended);
    };
  }, [loadSession]);

  const startSession = useCallback((session: Session) => {
    setToken(session.token);
    const next = fromApi(session.user);
    userRef.current = next;
    setUser(next);
    return next;
  }, []);

  const login = async (email: string, password: string) =>
    startSession(await api<Session>("/auth/login", { method: "POST", body: { email, password } }));

  const loginAs = (role: Role) => {
    const account = DEMO_ACCOUNTS.find((a) => a.role === role)!;
    return login(account.email, account.password);
  };

  const register = (input: { name: string; email: string; password: string }) =>
    api<Registration>("/auth/register", { method: "POST", body: input });

  const verifyEmail = async (email: string, code: string) =>
    startSession(await api<Session>("/auth/verify-email", { method: "POST", body: { email, code } }));

  const resendVerification = (email: string) =>
    api<Registration>("/auth/resend-verification", { method: "POST", body: { email } });

  // Tokens are stateless, so the server call is a courtesy; the local session ends at once
  const logout = useCallback(() => {
    if (getToken()) void api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    userRef.current = null;
    setUser(null);
  }, []);

  // A password change answers with a fresh token (older ones are revoked)
  const updateUser = async (patch: ProfilePatch) => {
    if (!userRef.current) throw new Error("Please log in first.");
    const res = await api<{ user: ApiUser; token?: string }>("/me", { method: "PATCH", body: patch });
    if (res.token) setToken(res.token);
    const next = fromApi(res.user);
    setUser(next);
    return next;
  };

  return (
    <AppContext.Provider
      value={{
        hydrated,
        user,
        login,
        loginAs,
        register,
        verifyEmail,
        resendVerification,
        logout,
        updateUser,
        refreshUser: loadSession,
      }}
    >
      {children}
      <SuspendedDialog open={suspended} onClose={() => setSuspended(false)} />
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
