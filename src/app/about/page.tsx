"use client";

import type { ReactNode } from "react";
import { Mail, MapPin, Globe, Phone, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from "@/components/BrandIcons";
import { about as aboutConfig, contact as contactConfig, founders, socialLinks } from "@/lib/site-config";

const socialStyles: { match: string; icon: ReactNode; color: string }[] = [
  { match: "facebook", icon: <Facebook size={18} />, color: "text-blue-600 bg-blue-500/10" },
  { match: "instagram", icon: <Instagram size={18} />, color: "text-pink-600 bg-pink-500/10" },
  { match: "youtube", icon: <Youtube size={18} />, color: "text-red-600 bg-red-500/10" },
  { match: "linkedin", icon: <Linkedin size={18} />, color: "text-blue-700 bg-blue-700/10" },
  { match: "twitter", icon: <Twitter size={18} />, color: "text-sky-500 bg-sky-500/10" },
];

function getSocialStyle(url: string) {
  return (
    socialStyles.find((s) => url.includes(s.match)) ?? {
      icon: <LinkIcon size={18} />,
      color: "text-foreground bg-surface",
    }
  );
}

export default function AboutPage() {
  const title = aboutConfig.title || "About Root Over Education";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="bg-surface py-16 md:py-20 border-b border-border">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 1 }}
              className="text-4xl md:text-5xl font-extrabold mb-6 text-foreground tracking-tight"
            >
              {title.split("").map((char, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1, delay: index * 0.04 }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Empowering students to master science subjects with clarity and
              confidence.
            </p>
          </div>
        </div>
      </div>

      <div className="container-custom">
        <div className="grid grid-cols-1 mt-20 md:grid-cols-3 gap-8">
          {/* Main Content Card */}
          <div className="md:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-surface rounded-xl border border-border p-8"
            >
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
                <span className="w-10 h-1 rounded-full bg-primary"></span>
                Description
              </h2>
              <div className="space-y-6">
                {/* Description is admin-authored HTML */}
                <div
                  className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: aboutConfig.description }}
                />

                <div className="grid gap-4 py-4">
                  {aboutConfig.bulletPoints.map((point, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          {point.title}:
                        </strong>{" "}
                        {point.text}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-surface p-6 rounded-md border-l-4 border-primary italic text-muted-foreground font-medium">
                  &ldquo;Learn smart. Learn strong. Learn from the root — with
                  Root Over Education.&rdquo;
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-surface rounded-xl border border-border sticky top-24 p-6"
            >
              <h3 className="text-lg font-bold mb-4 text-foreground">
                More Info
              </h3>

              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg text-green-600 bg-green-500/10 flex items-center justify-center shrink-0">
                    <MapPin size={18} />
                  </div>
                  <span className="text-sm font-medium">
                    {contactConfig.address || "Bangladesh"}
                  </span>
                </li>

                <li className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-green-600 bg-green-500/10 shrink-0">
                    <Phone size={18} />
                  </div>
                  <span className="text-sm font-medium select-all">
                    {contactConfig.phone}
                  </span>
                </li>

                {contactConfig.email && (
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-8 h-8 rounded-lg text-green-600 bg-green-500/10 flex items-center justify-center shrink-0">
                      <Mail size={18} />
                    </div>
                    <a
                      href={`mailto:${contactConfig.email}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {contactConfig.email}
                    </a>
                  </li>
                )}

                <li className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg text-green-600 bg-green-500/10 flex items-center justify-center shrink-0">
                    <Globe size={18} />
                  </div>
                  <Link
                    href="https://rootover.site"
                    target="_blank"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    rootover.site
                  </Link>
                </li>
              </ul>

              {socialLinks.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  <h4 className="text-sm font-bold text-foreground">
                    Follow Us
                  </h4>
                  <ul className="space-y-3">
                    {socialLinks.map((link) => {
                      const style = getSocialStyle(link.url);
                      return (
                        <li
                          key={link.url}
                          className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.color}`}
                          >
                            {style.icon}
                          </div>
                          <Link
                            href={link.url}
                            target="_blank"
                            className="text-sm font-medium hover:underline decoration-primary/50 underline-offset-4"
                          >
                            {link.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Founders */}
      <section className="container-custom mt-16 md:mt-24">
        <div className="mb-8 md:mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">The people behind Root Over</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Founders</h2>
        </div>
        <div className="mx-auto grid max-w-3xl grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {founders.map((founder, i) => (
            <motion.figure
              key={founder.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="aspect-[4/5] overflow-hidden bg-card">
                <img
                  src={founder.photo}
                  alt={founder.name}
                  loading="lazy"
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <figcaption className="p-5 text-center">
                <p className="text-lg font-bold text-foreground">{founder.name}</p>
                <p className="mt-0.5 text-sm font-medium text-primary">{founder.role}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>
    </div>
  );
}
