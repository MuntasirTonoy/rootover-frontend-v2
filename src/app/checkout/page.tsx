"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Lock, Smartphone, Tag, X } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import CourseThumb from "@/components/course/CourseThumb";
import LoadingAnimation from "@/components/LoadingAnimation";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { EmptyBlock, SimulatedNotice } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { CouponPublic, CourseDetail, PaymentStart, Quote } from "@/lib/api-types";
import { formatBDT } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { btn, field, fieldError } from "@/lib/ui";

type QuoteResult = { quote: Quote; coupon: CouponPublic | null };

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
  const [processing, setProcessing] = useState(false);

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

  if (owned) {
    const first = course.enrollment?.resumeLessonId ?? course.chapters[0]?.lessons[0]?.id;
    return (
      <div className="container-custom py-16 max-w-xl text-center">
        <CheckCircle2 size={56} className="mx-auto text-green-600 mb-4" />
        <h1 className="text-2xl font-extrabold mb-2">You already own this course</h1>
        <p className="text-muted-foreground mb-2">{course.title} is in My Classes.</p>
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

  // Starts a bKash payment and sends the browser to bKash. bKash returns the
  // payer to the API, which confirms the payment, enrolls the student and
  // redirects to /payment/result.
  const pay = async () => {
    setProcessing(true);
    try {
      const { redirectURL } = await api<PaymentStart>("/checkout", {
        method: "POST",
        body: { courseId, couponCode: coupon?.code },
      });
      window.location.assign(redirectURL);
    } catch (err) {
      setProcessing(false);
      // Bought in another tab meanwhile: show the "already own" screen
      if (err instanceof ApiError && err.status === 409) detail.reload();
      else setCouponError(errorMessage(err));
    }
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
            <div className="flex items-center gap-3 rounded-md border-2 border-primary bg-primary/5 p-3">
              <Smartphone size={20} className="text-pink-600" />
              <div>
                <p className="font-bold text-foreground">bKash</p>
                <p className="text-[11px] text-muted-foreground">You&apos;ll approve the payment on bKash&apos;s own page.</p>
              </div>
            </div>
            <div className="mt-4">
              <SimulatedNotice>
                bKash sandbox: use a bKash test wallet. No real money is charged.
              </SimulatedNotice>
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
            <button onClick={pay} disabled={processing || !priced} className={`${btn.primary} w-full py-3 mt-5`}>
              {processing ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
              {processing ? "Opening bKash..." : `Pay ${formatBDT(q.total)} with bKash`}
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">bKash sandbox · test payments only</p>
          </div>
        </aside>
      </div>

    </div>
  );
}
