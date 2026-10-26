"use client";

import type { ReactNode } from "react";
import { useConfig } from "@/lib/use-config";
import { Notice } from "./primitives";

type Mode = "simulated" | "sandbox" | "live";

// How payments work on this deployment, from GET /config: simulated (no
// gateway), the bKash sandbox (test wallets) or bKash live
export function usePaymentMode(): Mode | undefined {
  const payment = useConfig()?.payment;
  if (!payment) return undefined;
  if (payment.provider === "simulated") return "simulated";
  return payment.sandbox ? "sandbox" : "live";
}

const TEXT: Record<Exclude<Mode, "live">, string> = {
  simulated: "Simulated payments: no money is charged.",
  sandbox: "bKash sandbox: use a bKash test wallet. No real money is charged.",
};

// Says when payments aren't real; renders nothing for live bKash (or while loading)
export default function PaymentModeNotice({
  inline = false,
  children,
}: {
  // Plain small text instead of the boxed notice
  inline?: boolean;
  // Replaces the default wording
  children?: (mode: Exclude<Mode, "live">) => ReactNode;
}) {
  const mode = usePaymentMode();
  if (!mode || mode === "live") return null;
  const text = children ? children(mode) : TEXT[mode];
  return inline ? (
    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{text}</p>
  ) : (
    <Notice>{text}</Notice>
  );
}
