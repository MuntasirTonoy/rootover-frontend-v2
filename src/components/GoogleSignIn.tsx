"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useApp } from "@/context/AppStore";
import { errorMessage } from "@/lib/api";
import type { User } from "@/lib/types";
import { useConfig } from "@/lib/use-config";

// Google Identity Services, the script behind the official "Continue with
// Google" button. It hands us an ID token, which the API checks with Google.
interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        ux_mode?: "popup" | "redirect";
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let script: Promise<GoogleIdentity> | null = null;

const loadGoogle = () =>
  (script ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = "https://accounts.google.com/gsi/client";
    el.async = true;
    el.onload = () => (window.google ? resolve(window.google) : reject(new Error("Google sign-in didn't load.")));
    el.onerror = () => {
      script = null; // try again next time
      el.remove();
      reject(new Error("Google sign-in didn't load."));
    };
    document.head.appendChild(el);
  }));

// The Google button plus an "or" divider above the email form. Renders nothing
// while the config loads, or when the API has no GOOGLE_CLIENT_ID.
export default function GoogleSignIn({
  onSignedIn,
  text = "continue_with",
}: {
  onSignedIn: (user: User) => void;
  // Google's wording: "Continue with Google" / "Sign up with Google"
  text?: "continue_with" | "signup_with" | "signin_with";
}) {
  const clientId = useConfig()?.googleClientId;
  const { loginWithGoogle } = useApp();
  const box = useRef<HTMLDivElement>(null);
  const lightBox = useRef<HTMLDivElement>(null);
  const darkBox = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Google keeps the first callback; this ref always points at the latest one
  const handle = useRef<(credential: string) => void>(() => undefined);
  useLayoutEffect(() => {
    handle.current = async (credential) => {
      setBusy(true);
      try {
        onSignedIn(await loginWithGoogle(credential));
      } catch (err) {
        toast.error(errorMessage(err));
        setBusy(false);
      }
    };
  });

  useEffect(() => {
    if (!clientId) return;
    let live = true;
    loadGoogle()
      .then((google) => {
        const parent = box.current;
        const light = lightBox.current;
        const dark = darkBox.current;
        if (!live || !parent || !light || !dark) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => handle.current(credential),
          ux_mode: "popup",
        });
        // Both themes are rendered once and swapped with CSS, so switching the
        // theme doesn't re-create Google's iframe (which made the form flicker)
        const width = Math.max(200, Math.min(400, Math.floor(parent.offsetWidth))); // Google allows 200-400 px
        for (const [el, theme] of [
          [light, "outline"],
          [dark, "filled_black"],
        ] as const) {
          el.replaceChildren();
          google.accounts.id.renderButton(el, {
            type: "standard",
            theme,
            size: "large",
            text,
            shape: "rectangular",
            logo_alignment: "center",
            locale: "en", // otherwise Google follows the browser's language
            width,
          });
        }
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [clientId, text]);

  if (!clientId) return null;

  return (
    <div>
      <div className="relative">
        {/* color-scheme: light stops the browser painting an opaque white
            backdrop behind Google's (light) iframe while the page is dark */}
        <div ref={box} className={`h-11 [color-scheme:light] ${busy ? "pointer-events-none opacity-50" : ""}`}>
          <div ref={lightBox} className="flex justify-center dark:hidden" />
          <div ref={darkBox} className="hidden justify-center dark:flex" />
        </div>
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={22} />
          </div>
        )}
      </div>
      {failed && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Google sign-in couldn&apos;t load. Check your connection or use your email below.
        </p>
      )}
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
