"use client";

// The cart (user's request, 2026-11-20): course ids, each with the coupon code
// the buyer typed, kept in localStorage so a guest can fill it before logging
// in. Prices are never stored here: /cart asks the API (POST /checkout/cart/quote).
import { useSyncExternalStore } from "react";

export interface CartItem {
  courseId: string;
  couponCode?: string;
}

const KEY = "rootover_cart";
const EVENT = "rootover:cart";
// Mirrors the API's limit (MAX_CART_ITEMS)
export const MAX_CART_ITEMS = 20;

const EMPTY: CartItem[] = [];
let cachedRaw: string | null = null;
let cached: CartItem[] = EMPTY;

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  // Same string, same array: useSyncExternalStore needs a stable snapshot
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed)
      ? parsed.filter((i): i is CartItem => typeof i?.courseId === "string").slice(0, MAX_CART_ITEMS)
      : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function write(items: CartItem[]) {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable (private mode): the cart just won't persist
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  // Other tabs (storage) and this tab (our own event)
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

export const cart = {
  items: read,
  has: (courseId: string) => read().some((i) => i.courseId === courseId),
  add(courseId: string) {
    const items = read();
    if (items.some((i) => i.courseId === courseId)) return true;
    if (items.length >= MAX_CART_ITEMS) return false;
    write([...items, { courseId }]);
    return true;
  },
  remove(courseIds: string | string[]) {
    const drop = new Set(Array.isArray(courseIds) ? courseIds : [courseIds]);
    write(read().filter((i) => !drop.has(i.courseId)));
  },
  setCoupon(courseId: string, couponCode: string | undefined) {
    write(read().map((i) => (i.courseId === courseId ? { ...i, couponCode: couponCode || undefined } : i)));
  },
};

// The cart's items; re-renders when they change (in any tab). Empty on the server.
export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
