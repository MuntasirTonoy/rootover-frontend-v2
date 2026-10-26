import Image from "next/image";
import Link from "next/link";
import { Globe, Link as LinkIcon, MapPin, Phone, Radical, Smartphone } from "lucide-react";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "./BrandIcons";
import PaymentModeNotice from "./ui/PaymentModeNotice";
import { contact, socialLinks } from "@/lib/site-config";
import { LEVELS } from "@/lib/types";

const VERSION = "v3A.10.26";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "All Courses", href: "/courses" },
      { label: "Teachers", href: "/teachers" },
      { label: "Free Previews", href: "/free-trial" },
      { label: "About Us", href: "/about" },
    ],
  },
  {
    title: "Browse by level",
    links: LEVELS.map((level) => ({ label: `${level} Courses`, href: `/courses?level=${level}` })),
  },
  {
    title: "Teach on Root Over",
    links: [
      { label: "Become a Teacher", href: "/teacher/apply" },
      { label: "Teacher Dashboard", href: "/teacher/dashboard" },
      { label: "Login", href: "/login" },
      { label: "Create an Account", href: "/register" },
    ],
  },
];

const socialIcons = [
  { match: "facebook", icon: Facebook },
  { match: "youtube", icon: Youtube },
  { match: "instagram", icon: Instagram },
  { match: "linkedin", icon: Linkedin },
  { match: "twitter", icon: Twitter },
];

const paymentMethods = [{ label: "bKash", icon: Smartphone, color: "text-pink-600" }];

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-10 transition-colors duration-300">
      <div className="container-custom py-10 md:py-14 grid grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-10">
        {/* Brand, contact and social */}
        <div className="col-span-2 lg:col-span-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Radical size={20} />
            </div>
            <span className="text-lg font-bold text-foreground">Root Over Education</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Complete SSC, HSC, BSc, BBA and BA courses from verified teachers. Buy a subject once and learn it
            chapter by chapter, at your own pace.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            {contact.phone && (
              <li className="flex items-center gap-2">
                <Phone size={15} className="text-primary shrink-0" />
                <span className="select-all">{contact.phone}</span>
              </li>
            )}
            {contact.address && (
              <li className="flex items-center gap-2">
                <MapPin size={15} className="text-primary shrink-0" />
                {contact.address}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Globe size={15} className="text-primary shrink-0" />
              <a href="https://rootover.site" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                rootover.site
              </a>
            </li>
          </ul>

          {socialLinks.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socialLinks.map((link) => {
                const Icon = socialIcons.find((s) => link.url.includes(s.match))?.icon ?? LinkIcon;
                return (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    title={link.label}
                    className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                  >
                    <Icon size={16} />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Link columns */}
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="lg:col-span-2">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-foreground">{column.title}</h3>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* Payments */}
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-foreground">We accept</h3>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((m) => (
              <span
                key={m.label}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground"
              >
                <m.icon size={14} className={m.color} />
                {m.label}
              </span>
            ))}
          </div>
          <PaymentModeNotice inline />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="container-custom py-4 flex flex-col-reverse md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            &copy; 2026 Root Over Education. All rights reserved.
            <span className="font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              {VERSION}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            Clauding by
            <span className="group relative inline-flex items-center gap-1.5 font-bold cursor-default">
              <Image
                src="/apex-codes-logo.svg"
                alt=""
                width={20}
                height={20}
                unoptimized
                className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
              />
              {/* Slow gradient sweep across the text; static for reduced-motion users */}
              <span className="bg-linear-to-r from-foreground via-primary to-foreground bg-size-[200%_auto] bg-clip-text text-transparent motion-safe:animate-shimmer">
                Apex Codes
              </span>
              <span className="absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
