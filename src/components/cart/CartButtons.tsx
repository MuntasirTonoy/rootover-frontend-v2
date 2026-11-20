"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ShoppingCart } from "lucide-react";
import { useApp } from "@/context/AppStore";
import { cart, MAX_CART_ITEMS, useCart } from "@/lib/cart";
import { btn } from "@/lib/ui";

// Guests and students can buy courses; teachers and admins have no cart
export function useCanBuy() {
  const { user } = useApp();
  return !user || user.role === "student";
}

// Navbar icon with the number of courses in the cart
export function CartNavLink({ onClick }: { onClick?: () => void }) {
  const count = useCart().length;
  if (!useCanBuy()) return null;
  return (
    <Link
      href="/cart"
      onClick={onClick}
      aria-label={`Cart, ${count} ${count === 1 ? "course" : "courses"}`}
      className="relative w-10 h-10 flex items-center justify-center rounded-md hover:bg-surface transition-colors"
    >
      <ShoppingCart size={20} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-5 h-5 rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-center text-primary-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}

// Adds and confirms with a toast whose action opens the cart
const add = (courseId: string, title: string, openCart: () => void) => {
  if (cart.add(courseId))
    toast.success(`"${title}" added to your cart`, { action: { label: "View cart", onClick: openCart } });
  else toast.error(`Your cart can hold up to ${MAX_CART_ITEMS} courses.`);
};

// Full-width button for the course details page. Once added, it opens the cart.
export function AddToCartButton({ courseId, title }: { courseId: string; title: string }) {
  const inCart = useCart().some((i) => i.courseId === courseId);
  const router = useRouter();
  return inCart ? (
    <button onClick={() => router.push("/cart")} className={`${btn.secondary} w-full`}>
      <Check size={16} className="text-green-600" /> In your cart · View cart
    </button>
  ) : (
    <button onClick={() => add(courseId, title, () => router.push("/cart"))} className={`${btn.secondary} w-full`}>
      <ShoppingCart size={16} /> Add to cart
    </button>
  );
}

// Small round button laid over a course card's corner
export function CardCartButton({ courseId, title }: { courseId: string; title: string }) {
  const inCart = useCart().some((i) => i.courseId === courseId);
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (inCart ? cart.remove(courseId) : add(courseId, title, () => router.push("/cart")))}
      aria-label={inCart ? `Remove ${title} from cart` : `Add ${title} to cart`}
      aria-pressed={inCart}
      title={inCart ? "In your cart (click to remove)" : "Add to cart"}
      className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border shadow-sm transition-colors ${
        inCart
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {inCart ? <Check size={16} /> : <ShoppingCart size={15} />}
    </button>
  );
}
