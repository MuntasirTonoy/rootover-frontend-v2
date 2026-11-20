"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Lock, ShoppingCart, Tag, Trash2, X } from "lucide-react";
import CourseThumb from "@/components/course/CourseThumb";
import LoadingAnimation from "@/components/LoadingAnimation";
import PaymentModeNotice from "@/components/ui/PaymentModeNotice";
import { EmptyBlock, PageHeader } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { CartQuote, CartQuoteItem, PaymentStart } from "@/lib/api-types";
import { cart, useCart } from "@/lib/cart";
import { formatBDT } from "@/lib/format";
import { btn, field, fieldError } from "@/lib/ui";

// The cart: every course priced by the API (POST /checkout/cart/quote, which
// also works for guests), a coupon per course, and one bKash payment for all
// of them (POST /checkout/cart). The browser never adds up prices itself.
export default function CartPage() {
  const { user, hydrated } = useApp();
  const items = useCart();
  // Re-price whenever the cart (courses or coupons) or the account changes
  const cartKey = JSON.stringify(items);
  const [priced, setPriced] = useState<{ key: string; data?: CartQuote; error?: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const canBuy = !user || user.role === "student";
  const requestKey = `${cartKey}|${user?.id ?? "guest"}`;

  useEffect(() => {
    if (!hydrated || !canBuy || items.length === 0) return;
    let live = true;
    api<CartQuote>("/checkout/cart/quote", { method: "POST", body: { items } })
      .then((data) => live && setPriced({ key: requestKey, data }))
      .catch((err) => live && setPriced({ key: requestKey, error: errorMessage(err) }));
    return () => {
      live = false;
    };
    // `items` is captured through requestKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, hydrated, canBuy]);

  if (!hydrated)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );

  if (!canBuy)
    return (
      <div className="container-custom py-16">
        <EmptyBlock
          title="Only student accounts can buy courses"
          description="Teacher and admin accounts don't have a cart."
          action={
            <Link href="/courses" className={btn.primary}>
              Browse courses
            </Link>
          }
        />
      </div>
    );

  if (items.length === 0)
    return (
      <div className="container-custom py-16">
        <EmptyBlock
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Add courses from the catalog, then pay for all of them at once."
          action={
            <Link href="/courses" className={btn.primary}>
              Browse courses
            </Link>
          }
        />
      </div>
    );

  // The latest quote for this exact cart; an older one is shown dimmed while re-pricing
  const quote = priced?.data;
  const stale = priced?.key !== requestKey;
  const blocked = quote?.items.filter((i) => i.error) ?? [];

  const pay = async () => {
    setPaying(true);
    setPayError("");
    try {
      const { redirectURL } = await api<PaymentStart>("/checkout/cart", { method: "POST", body: { items } });
      window.location.assign(redirectURL);
    } catch (err) {
      setPaying(false);
      setPayError(errorMessage(err));
      // Something changed (owned meanwhile, coupon used up): show the new prices
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) setPriced(null);
    }
  };

  return (
    <div className="container-custom py-10 md:py-14">
      <PageHeader
        title="Your cart"
        description={`${items.length} ${items.length === 1 ? "course" : "courses"} · one bKash payment for all of them`}
      />

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        <div className={`lg:col-span-2 space-y-3 ${stale && quote ? "opacity-60" : ""}`}>
          {!quote && !priced?.error && (
            <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-card">
              <LoadingAnimation />
            </div>
          )}
          {priced?.error && !quote && (
            <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
              {priced.error}
            </p>
          )}
          {quote?.items.map((item) => <CartRow key={item.courseId} item={item} />)}
        </div>

        <aside className="lg:sticky lg:top-24 rounded-lg border border-border bg-card p-5">
          <h2 className="font-bold mb-4">Order summary</h2>
          <dl className="space-y-2 text-sm">
            {quote?.items
              .filter((i) => i.quote && !i.error)
              .map((i) => (
                <div key={i.courseId} className="flex justify-between gap-3">
                  <dt className="min-w-0 truncate text-muted-foreground">{i.course?.title}</dt>
                  <dd className="shrink-0">{formatBDT(i.quote?.total)}</dd>
                </div>
              ))}
            <div className="flex justify-between border-t border-dashed border-border pt-3 text-base font-extrabold">
              <dt>Total payable</dt>
              <dd className="text-primary">{formatBDT(quote?.total)}</dd>
            </div>
          </dl>

          {blocked.length > 0 && (
            <p className="mt-4 flex gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              Remove the {blocked.length === 1 ? "course" : "courses"} that can&apos;t be bought to continue.
            </p>
          )}
          {payError && (
            <p role="alert" className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600">
              {payError}
            </p>
          )}

          {user ? (
            <button
              onClick={pay}
              disabled={paying || !quote || stale || blocked.length > 0}
              className={`${btn.primary} w-full py-3 mt-5`}
            >
              {paying ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
              {paying ? "Opening bKash..." : `Pay ${formatBDT(quote?.total)} with bKash`}
            </button>
          ) : (
            <Link href="/login?redirect=/cart" className={`${btn.primary} w-full py-3 mt-5`}>
              <Lock size={16} /> Log in to pay
            </Link>
          )}
          <div className="mt-4">
            <PaymentModeNotice />
          </div>
        </aside>
      </div>
    </div>
  );
}

// One course: thumbnail, price from the API, its own coupon, remove
function CartRow({ item }: { item: CartQuoteItem }) {
  const { course, quote, coupon } = item;
  const [code, setCode] = useState("");

  const apply = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) cart.setCoupon(item.courseId, code.trim().toUpperCase());
  };

  return (
    <article className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <div className="flex gap-3 sm:gap-4">
        {course && (
          <Link href={`/courses/${course.id}`} className="w-24 sm:w-36 shrink-0 overflow-hidden rounded-md">
            <CourseThumb course={course} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {course && (
                <p className="text-[11px] font-bold text-primary">
                  {course.level} · {course.subject}
                </p>
              )}
              <h3 className="font-bold leading-snug text-foreground line-clamp-2">
                {course ? <Link href={`/courses/${course.id}`} className="hover:text-primary">{course.title}</Link> : "Course unavailable"}
              </h3>
              {course && <p className="text-xs text-muted-foreground">by {course.teacher.name}</p>}
            </div>
            <button
              onClick={() => cart.remove(item.courseId)}
              aria-label={`Remove ${course?.title ?? "course"} from cart`}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {item.error ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <AlertCircle size={13} /> {item.error}
            </p>
          ) : (
            quote && (
              <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                <span className="font-extrabold text-foreground">{formatBDT(quote.total)}</span>
                {quote.total < quote.listPrice && (
                  <span className="text-xs text-muted-foreground line-through">{formatBDT(quote.listPrice)}</span>
                )}
              </p>
            )
          )}
        </div>
      </div>

      {!item.error && (
        <div className="mt-3 border-t border-border pt-3">
          {coupon ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs">
              <span className="flex items-center gap-1.5">
                <Tag size={13} className="text-green-600" />
                <b className="font-mono">{coupon.code}</b>
                {coupon.type === "percent" ? `${coupon.value}% off` : `${formatBDT(coupon.value)} off`}
              </span>
              <button
                onClick={() => cart.setCoupon(item.courseId, undefined)}
                aria-label="Remove coupon"
                className="rounded p-0.5 hover:bg-surface"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <form onSubmit={apply} className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Coupon code (optional)"
                aria-label={`Coupon code for ${course?.title ?? "this course"}`}
                aria-invalid={!!item.couponError}
                className={`${field} py-1.5 font-mono text-xs ${item.couponError ? fieldError : ""}`}
              />
              <button type="submit" className={`${btn.small} shrink-0`}>
                Apply
              </button>
            </form>
          )}
          {item.couponError && (
            <p className="mt-1.5 flex items-center justify-between gap-2 text-xs font-medium text-red-600" role="alert">
              {item.couponError}
              <button onClick={() => cart.setCoupon(item.courseId, undefined)} className="font-semibold underline">
                Remove
              </button>
            </p>
          )}
        </div>
      )}
    </article>
  );
}
