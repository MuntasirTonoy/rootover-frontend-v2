"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CreditCard, Loader2, Lock, Smartphone, Tag, X } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import CourseThumb from "@/components/course/CourseThumb";
import LoadingAnimation from "@/components/LoadingAnimation";
import Modal from "@/components/ui/Modal";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { EmptyBlock, Field, SimulatedNotice } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { CouponPublic, CourseDetail, Quote } from "@/lib/api-types";
import { formatBDT, maskNumber } from "@/lib/format";
import type { Enrollment, PaymentMethod, Purchase } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { btn, field, fieldError } from "@/lib/ui";

type QuoteResult = { quote: Quote; coupon: CouponPublic | null };

const methods: { id: PaymentMethod; label: string; caption: string; icon: typeof Smartphone }[] = [
  { id: "bKash", label: "bKash", caption: "Mobile wallet (simulated)", icon: Smartphone },
  { id: "Nagad", label: "Nagad", caption: "Mobile wallet (simulated)", icon: Smartphone },
  { id: "Card", label: "Card", caption: "Visa / Mastercard (simulated)", icon: CreditCard },
];

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <LoadingAnimation />
        </div>
      }
    >
      <AuthGuard allowedRoles={["student"]}>
        <Checkout />
      </AuthGuard>
    </Suspense>
  );
}

function Checkout() {
  const courseId = useSearchParams().get("courseId") ?? "";
  const detail = useApi<CourseDetail>(courseId ? `/courses/${courseId}` : null);
  // Demo hint: codes that currently work for this course
  const demoCodes = useApi<string[]>(courseId ? `/checkout/coupons/${courseId}` : null).data ?? [];

  const [codeInput, setCodeInput] = useState("");
  // The price comes from the API: without a coupon first, then with the applied one
  const [priced, setPriced] = useState<QuoteResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bKash");
  const [walletOpen, setWalletOpen] = useState(false);
  const [wallet, setWallet] = useState({ number: "", pin: "" });
  const [walletError, setWalletError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<Purchase | null>(null);

  const course = detail.data;
  const buyable = !!course?.published && !course.access.enrolled;

  useEffect(() => {
    if (!buyable) return;
    api<QuoteResult>("/checkout/quote", { method: "POST", body: { courseId } })
      .then(setPriced)
      .catch((err) => setCouponError(errorMessage(err)));
  }, [buyable, courseId]);

  if (!ready(detail) && detail.error?.status !== 404) return <ApiStatus state={detail} className="min-h-[60vh]" />;

  if (!course || !course.published) {
    return (
      <div className="container-custom py-16">
        <EmptyBlock
          title="Course not available"
          description="This course can't be purchased right now."
          action={
            <Link href="/courses" className={btn.primary}>
              Browse courses
            </Link>
          }
        />
      </div>
    );
  }

  const { teacher } = course;
  const owned = course.access.enrolled;
  const coupon = priced?.coupon ?? null;
  // Until the first quote arrives, the course's own prices (no coupon)
  const q: Pick<Quote, "listPrice" | "courseDiscount" | "couponDiscount" | "total"> = priced?.quote ?? {
    listPrice: course.price,
    courseDiscount: course.price - course.effectivePrice,
    couponDiscount: 0,
    total: course.effectivePrice,
  };

  if (done || owned) {
    const first = course.enrollment?.resumeLessonId ?? course.chapters[0]?.lessons[0]?.id;
    return (
      <div className="container-custom py-16 max-w-xl text-center">
        <CheckCircle2 size={56} className="mx-auto text-green-600 mb-4" />
        <h1 className="text-2xl font-extrabold mb-2">{done ? "Payment successful!" : "You already own this course"}</h1>
        <p className="text-muted-foreground mb-2">
          {course.title} has been added to My Classes.
        </p>
        {done && (
          <p className="text-sm text-muted-foreground mb-6">
            Paid {formatBDT(done.amountPaid)} via {done.method} (simulated) · Transaction{" "}
            <span className="font-mono">{done.trxId}</span>
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          <Link href={`/learn/${course.id}${first ? `?lesson=${first}` : ""}`} className={btn.primary}>
            Start learning
          </Link>
          <Link href="/my-classes" className={btn.secondary}>
            Go to My Classes
          </Link>
        </div>
      </div>
    );
  }

  // Coupon errors come back as 422 with the spec's messages ("This coupon has expired." ...)
  const applyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    const code = codeInput.trim();
    if (!code) return;
    setApplying(true);
    try {
      setPriced(await api<QuoteResult>("/checkout/quote", { method: "POST", body: { courseId, couponCode: code } }));
      setCouponError("");
    } catch (err) {
      setCouponError(errorMessage(err));
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = async () => {
    setCodeInput("");
    setCouponError("");
    try {
      setPriced(await api<QuoteResult>("/checkout/quote", { method: "POST", body: { courseId } }));
    } catch (err) {
      setCouponError(errorMessage(err));
    }
  };

  // SIMULATED payment: the API records the purchase and enrolls the student at once
  const complete = async () => {
    setProcessing(true);
    try {
      const result = await api<{ purchase: Purchase; enrollment: Enrollment }>("/checkout", {
        method: "POST",
        body: { courseId, couponCode: coupon?.code, method },
      });
      setDone(result.purchase);
    } catch (err) {
      // Bought in another tab meanwhile: show the "already own" screen
      if (err instanceof ApiError && err.status === 409) detail.reload();
      else setCouponError(errorMessage(err));
    } finally {
      setProcessing(false);
      setWalletOpen(false);
    }
  };

  const handlePay = () => {
    if (method === "Card") complete();
    else setWalletOpen(true);
  };

  const confirmWallet = (e: FormEvent) => {
    e.preventDefault();
    if (!/^01\d{9}$/.test(wallet.number)) return setWalletError("Enter an 11-digit number starting with 01.");
    if (!/^\d{4,5}$/.test(wallet.pin)) return setWalletError("Enter any 4–5 digit demo PIN.");
    setWalletError("");
    complete();
  };

  return (
    <div className="container-custom py-10 md:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight mb-1">Checkout</h1>
      <p className="text-muted-foreground mb-6">You&apos;re buying the complete course, including every chapter and lesson.</p>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-lg border border-border bg-card p-4 flex gap-4">
            <CourseThumb course={course} className="!w-40 shrink-0 rounded-md hidden sm:block" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">
                {course.level} · {course.subject}
              </p>
              <h2 className="font-bold text-foreground">{course.title}</h2>
              <p className="text-sm text-muted-foreground">by {teacher.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {course.chapterCount} chapters · {course.lessonCount} lessons · lifetime access
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-bold mb-3 flex items-center gap-2">
              <Tag size={18} className="text-primary" /> Coupon
            </h2>
            {coupon ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm">
                <span>
                  <b className="font-mono">{coupon.code}</b> applied:{" "}
                  {coupon.type === "percent" ? `${coupon.value}% off` : `${formatBDT(coupon.value)} off`}
                </span>
                <button
                  onClick={removeCoupon}
                  className="p-1 rounded hover:bg-surface"
                  aria-label="Remove coupon"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={applyCoupon} className="flex gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  aria-label="Coupon code"
                  aria-invalid={!!couponError}
                  className={`${field} font-mono ${couponError ? fieldError : ""}`}
                />
                <button type="submit" disabled={applying} className={btn.secondary}>
                  {applying ? <Loader2 size={16} className="animate-spin" /> : null}
                  Apply
                </button>
              </form>
            )}
            {couponError && (
              <p className="mt-2 text-xs font-medium text-red-600" role="alert">
                {couponError}
              </p>
            )}
            {demoCodes.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Demo codes for this course: <span className="font-mono">{demoCodes.join(", ")}</span>
              </p>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-bold mb-3 flex items-center gap-2">
              <Lock size={18} className="text-primary" /> Payment method
            </h2>
            <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Payment method">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={method === m.id}
                  onClick={() => setMethod(m.id)}
                  className={`rounded-md border-2 p-3 text-left transition-colors ${
                    method === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <m.icon size={18} className={m.id === "bKash" ? "text-pink-600" : "text-primary"} />
                  <p className="mt-1 font-bold text-foreground">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground">{m.caption}</p>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <SimulatedNotice />
            </div>
          </section>
        </div>

        <aside>
          <div className="lg:sticky lg:top-24 rounded-lg border border-border bg-card p-5">
            <h2 className="font-bold mb-4">Order summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Original price</dt>
                <dd>{formatBDT(q.listPrice)}</dd>
              </div>
              {q.courseDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>Course discount</dt>
                  <dd>-{formatBDT(q.courseDiscount)}</dd>
                </div>
              )}
              {q.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>Coupon ({coupon?.code})</dt>
                  <dd>-{formatBDT(q.couponDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed border-border pt-3 text-base font-extrabold">
                <dt>Total payable</dt>
                <dd className="text-primary">{formatBDT(q.total)}</dd>
              </div>
            </dl>
            <button onClick={handlePay} disabled={processing || !priced} className={`${btn.primary} w-full py-3 mt-5`}>
              {processing ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
              {processing ? "Processing..." : `Pay ${formatBDT(q.total)}`}
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Simulated checkout · no real charge</p>
          </div>
        </aside>
      </div>

      <Modal open={walletOpen} onClose={() => !processing && setWalletOpen(false)} title={`${method} payment (simulated)`} size="md">
        <form onSubmit={confirmWallet} className="space-y-4" noValidate>
          <div className="rounded-md bg-pink-600 p-4 text-white">
            <p className="text-xs opacity-80">Merchant</p>
            <p className="font-bold">Root Over Education (demo)</p>
            <p className="mt-2 text-2xl font-extrabold">{formatBDT(q.total)}</p>
          </div>
          <SimulatedNotice>This is a fake {method} screen. Enter any demo number and PIN.</SimulatedNotice>
          <Field label={`${method} account number`} htmlFor="wallet-number">
            <input
              id="wallet-number"
              inputMode="numeric"
              placeholder="01XXXXXXXXX"
              value={wallet.number}
              onChange={(e) => setWallet((w) => ({ ...w, number: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
              className={field}
            />
          </Field>
          <Field label="PIN" htmlFor="wallet-pin">
            <input
              id="wallet-pin"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              value={wallet.pin}
              onChange={(e) => setWallet((w) => ({ ...w, pin: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
              className={field}
            />
          </Field>
          {walletError && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {walletError}
            </p>
          )}
          <button type="submit" disabled={processing} className={`${btn.primary} w-full`}>
            {processing ? <Loader2 size={16} className="animate-spin" /> : null}
            {processing ? "Confirming..." : `Confirm payment${wallet.number.length === 11 ? ` from ${maskNumber(wallet.number)}` : ""}`}
          </button>
        </form>
      </Modal>
    </div>
  );
}
