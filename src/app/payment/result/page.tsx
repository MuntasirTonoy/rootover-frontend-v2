"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import LoadingAnimation from "@/components/LoadingAnimation";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import type { PaymentView } from "@/lib/api-types";
import { formatBDT, formatDateTime } from "@/lib/format";
import { btn } from "@/lib/ui";
import { useApi } from "@/lib/use-api";

// Where the API sends the payer after bKash: /payment/result?id=<payment id>
// (or ?error=not_found / &error=gateway). The API has already confirmed the
// payment with bKash; this page only shows the outcome.
export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <LoadingAnimation />
        </div>
      }
    >
      <AuthGuard>
        <PaymentResult />
      </AuthGuard>
    </Suspense>
  );
}

function PaymentResult() {
  const params = useSearchParams();
  const id = params.get("id");
  const gatewayError = params.get("error") === "gateway";
  const payment = useApi<PaymentView>(id && `/payments/${id}`);
  const pending = payment.data?.state === "initiated" || payment.data?.state === "processing";
  const { reload } = payment;

  // A payment still being confirmed is checked again shortly
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(reload, 2000);
    return () => clearTimeout(t);
  }, [pending, reload, payment.data]);

  if (!id)
    return (
      <Outcome icon="failed" title="Payment not found" text="We couldn't find this payment. If money was taken, contact support.">
        <Link href="/" className={btn.primary}>
          Go home
        </Link>
      </Outcome>
    );
  if (!ready(payment)) return <ApiStatus state={payment} className="min-h-[60vh]" />;

  const p = payment.data;
  const isCourse = p.purpose === "course_purchase";
  const what = isCourse ? (p.course?.title ?? "your course") : "the teacher registration fee";
  const via = p.provider === "simulated" ? "simulated payment" : p.sandbox ? "bKash sandbox" : "bKash";

  if (p.state === "completed") {
    return (
      <Outcome icon="completed" title="Payment successful!" text={isCourse ? `${what} has been added to My Classes.` : "Your application is now under final verification."}>
        <p className="mb-6 text-sm text-muted-foreground">
          Paid {formatBDT(p.amount)} via {via}
          {p.trxId && (
            <>
              {" "}· Transaction <span className="font-mono">{p.trxId}</span>
            </>
          )}{" "}
          · {formatDateTime(p.updatedAt)}
        </p>
        {isCourse && p.course ? (
          <>
            <Link href={`/learn/${p.course.id}`} className={btn.primary}>
              Start learning
            </Link>
            <Link href="/my-classes" className={btn.secondary}>
              Go to My Classes
            </Link>
          </>
        ) : (
          <Link href="/teacher/apply" className={btn.primary}>
            View your application
          </Link>
        )}
      </Outcome>
    );
  }

  if (pending)
    return (
      <Outcome
        icon="pending"
        title="Confirming your payment..."
        text={
          gatewayError
            ? "bKash didn't answer in time. We'll keep checking; if money was taken it will be recorded."
            : "This takes a few seconds. Please don't pay again."
        }
      />
    );

  const retry = isCourse && p.course ? `/checkout?courseId=${p.course.id}` : "/teacher/apply";
  return (
    <Outcome
      icon="failed"
      title={p.state === "cancelled" ? "Payment cancelled" : "Payment not completed"}
      text={p.failureReason ?? `Paying for ${what} didn't go through. You haven't been charged.`}
    >
      {p.trxId && (
        <p className="mb-6 w-full text-sm text-muted-foreground">
          bKash transaction <span className="font-mono">{p.trxId}</span>: keep this for support.
        </p>
      )}
      <Link href={retry} className={btn.primary}>
        Try again
      </Link>
    </Outcome>
  );
}

const icons = {
  completed: <CheckCircle2 size={56} className="mx-auto text-green-600 mb-4" />,
  pending: <Clock size={56} className="mx-auto text-amber-500 mb-4 animate-pulse" />,
  failed: <XCircle size={56} className="mx-auto text-red-600 mb-4" />,
};

function Outcome({
  icon,
  title,
  text,
  children,
}: {
  icon: keyof typeof icons;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="container-custom py-16 max-w-xl text-center">
      {icons[icon]}
      <h1 className="text-2xl font-extrabold mb-2">{title}</h1>
      <p className="text-muted-foreground mb-2">{text}</p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
