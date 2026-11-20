import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { LoginDevice } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";

const ICONS = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

// Icon, "Chrome on Windows" and when it was last used. Shared by the profile's
// device list and the device-limit dialog.
export default function DeviceSummary({ device }: { device: LoginDevice }) {
  const Icon = ICONS[device.deviceType] ?? Monitor;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-bold text-foreground">
          {device.browser} on {device.os}
          {device.current && (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
              This device
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {device.current ? "Active now" : `Last active ${formatDateTime(device.lastSeenAt)}`}
          {device.ip ? ` · IP ${device.ip}` : ""}
        </p>
        <p className="text-[11px] text-muted-foreground">Logged in {formatDateTime(device.createdAt)}</p>
      </div>
    </div>
  );
}
