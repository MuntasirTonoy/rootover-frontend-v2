import type { ReactNode } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { LoginDevice } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";

const ICONS = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

// Icon, "Chrome on Windows" and when it was last used. Shared by the profile's
// device list and the device-limit dialog. `action` (e.g. a Log out button)
// sits at the end of the name line, so narrow columns don't need another row.
export default function DeviceSummary({ device, action }: { device: LoginDevice; action?: ReactNode }) {
  const Icon = ICONS[device.deviceType] ?? Monitor;
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-bold leading-6 text-foreground">
            {device.browser} on {device.os}
          </p>
          {action}
        </div>
        {device.current && (
          <span className="inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
            This device
          </span>
        )}
        <p className="text-xs leading-5 text-muted-foreground">
          {device.current ? "Active now" : `Last active ${formatDateTime(device.lastSeenAt)}`}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          Logged in {formatDateTime(device.createdAt)}
          {device.ip && <span className="block break-all">IP {device.ip}</span>}
        </p>
      </div>
    </div>
  );
}
