"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut, MonitorSmartphone } from "lucide-react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DeviceSummary from "@/components/DeviceSummary";
import { useApp } from "@/context/AppStore";
import { api, errorMessage } from "@/lib/api";
import type { DeviceList, LoginDevice } from "@/lib/api-types";
import { confirmAction } from "@/lib/confirm";
import { useApi } from "@/lib/use-api";

// "Logged-in devices" on /profile (every role): where the account is signed
// in, with a log-out button per device.
export default function LoggedInDevices() {
  const { logout } = useApp();
  const router = useRouter();
  const state = useApi<DeviceList>("/me/sessions");
  // The device being logged out
  const [busy, setBusy] = useState<string | null>(null);

  // This device's own session ended: drop the local token and go to the login page
  const endHere = () => {
    logout();
    router.push("/login");
  };

  const logOutDevice = async (device: LoginDevice) => {
    const ok = await confirmAction({
      title: device.current ? "Log out of this device?" : `Log out ${device.browser} on ${device.os}?`,
      text: device.current ? "You'll need to log in again here." : "That device will need to log in again.",
      confirmText: "Log out",
      danger: true,
    });
    if (!ok) return;
    if (device.current) return endHere();

    setBusy(device.id);
    try {
      await api(`/me/sessions/${device.id}`, { method: "DELETE" });
      toast.success("Device logged out");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
      state.reload();
    }
  };

  return (
    // Sits in the profile's narrow left column
    <section className="rounded-lg border border-border bg-card p-4 md:p-5">
      <h3 className="flex items-center gap-2 font-bold text-foreground">
        <MonitorSmartphone size={18} className="text-primary" /> Logged-in devices
      </h3>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
        {ready(state) && state.data.limit
          ? `You can be logged in on up to ${state.data.limit} devices at a time.`
          : "Devices where your account is logged in."}
      </p>

      <div className="mt-4">
        {!ready(state) ? (
          <ApiStatus state={state} className="min-h-24" />
        ) : (
          <ul className="space-y-2">
            {state.data.devices.map((device) => (
              <li key={device.id} className="rounded-md border border-border bg-background p-3">
                <DeviceSummary
                  device={device}
                  action={
                    <button
                      onClick={() => logOutDevice(device)}
                      disabled={busy !== null}
                      aria-label={`Log out ${device.browser} on ${device.os}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                    >
                      {busy === device.id ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
                      Log out
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
