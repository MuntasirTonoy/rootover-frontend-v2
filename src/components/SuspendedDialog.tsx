"use client";

import { Ban, Phone } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { contact } from "@/lib/site-config";
import { btn } from "@/lib/ui";

// Shown whenever the API says the account is suspended: opening the site with
// a banned account's saved session (which also signs it out), or logging in.
export default function SuspendedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your account has been suspended"
      size="md"
      footer={
        <button onClick={onClose} className={btn.primary}>
          OK
        </button>
      }
    >
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600">
          <Ban size={22} />
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            An administrator has suspended this account, so you&apos;ve been signed out and can&apos;t log in for now.
          </p>
          <p>If you think this is a mistake, please contact us{contact.phone || contact.email ? ":" : "."}</p>
          {(contact.phone || contact.email) && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold text-foreground">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                  <Phone size={14} /> {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="hover:text-primary">
                  {contact.email}
                </a>
              )}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
