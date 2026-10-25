// Single source of truth for money maths. Every page (course details, checkout,
// teacher earnings, admin reports) goes through these helpers so numbers agree.
import type { Coupon, Course } from "./types";

export const COMMISSION_RATE = 0.1;
export const REGISTRATION_FEE = 300;
// Sales stay in "pending clearance" this many days before they can be withdrawn
export const CLEARING_DAYS = 7;
export const MIN_WITHDRAWAL = 500;

// Price the student pays before any coupon
export function coursePrice(course: Pick<Course, "price" | "discountPrice">): number {
  return course.discountPrice && course.discountPrice < course.price
    ? course.discountPrice
    : course.price;
}

export function discountPercent(course: Pick<Course, "price" | "discountPrice">): number {
  const effective = coursePrice(course);
  return course.price > 0 ? Math.round((1 - effective / course.price) * 100) : 0;
}

// Commission is 10% of what the student actually paid, after all discounts
export function splitSale(amountPaid: number) {
  const commission = Math.round(amountPaid * COMMISSION_RATE);
  return { commission, teacherNet: amountPaid - commission };
}

export function couponDiscount(base: number, coupon: Pick<Coupon, "type" | "value">): number {
  const raw =
    coupon.type === "percent" ? Math.round((base * coupon.value) / 100) : coupon.value;
  return Math.max(0, Math.min(raw, base));
}

export interface Quote {
  listPrice: number;
  coursePrice: number;
  courseDiscount: number;
  couponDiscount: number;
  total: number;
  commission: number;
  teacherNet: number;
}

export function quote(
  course: Pick<Course, "price" | "discountPrice">,
  coupon?: Pick<Coupon, "type" | "value"> | null,
): Quote {
  const base = coursePrice(course);
  const off = coupon ? couponDiscount(base, coupon) : 0;
  const total = base - off;
  return {
    listPrice: course.price,
    coursePrice: base,
    courseDiscount: course.price - base,
    couponDiscount: off,
    total,
    ...splitSale(total),
  };
}

export type CouponCheck =
  | { ok: true; coupon: Coupon }
  | { ok: false; error: string };

export function checkCoupon(
  coupons: Coupon[],
  course: Pick<Course, "id" | "teacherId">,
  code: string,
  now = Date.now(),
): CouponCheck {
  const matching = coupons.filter((c) => c.code.toLowerCase() === code.trim().toLowerCase());
  if (!matching.length) return { ok: false, error: "This coupon code doesn't exist." };
  // Codes are unique per teacher, so another teacher may use the same code
  const coupon = matching.find((c) => c.teacherId === course.teacherId);
  if (!coupon || (coupon.courseId && coupon.courseId !== course.id))
    return { ok: false, error: "This coupon isn't valid for this course." };
  if (!coupon.active) return { ok: false, error: "This coupon is no longer active." };
  if (new Date(coupon.expiresAt).getTime() < now)
    return { ok: false, error: "This coupon has expired." };
  if (coupon.usedCount >= coupon.usageLimit)
    return { ok: false, error: "This coupon has reached its usage limit." };
  return { ok: true, coupon };
}
