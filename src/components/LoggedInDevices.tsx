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
import { btn } from "@/lib/ui";

// "Logged-in devices" on /profile (every role): where the account is signed
// in, with a log-out button per device and one for every device at once.
export default function LoggedInDevices() {
  const { logout } = useApp();
  const router = useRouter();
  const state = useApi<DeviceList>("/me/sessions");
  // The device being logged out, or "all"
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

  const logOutAll = async () => {
    const ok = await confirmAction({
      title: "Log out from all devices?",
      text: "Every device, this one included, will need to log in again.",
      confirmText: "Log out everywhere",
      danger: true,
    });
    if (!ok) return;
    setBusy("all");
    try {
      await api("/me/sessions", { method: "DELETE" });
      toast.success("Logged out from all devices");
      endHere();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(null);
    }
  };

  return (
    // Sits in the profile's narrow left column, so everything stacks
    <section className="rounded-lg border border-border bg-card p-4 md:p-5">
      <h3 className="flex items-center gap-2 font-bold text-foreground">
        <MonitorSmartphone size={18} className="text-primary" /> Logged-in devices
      </h3>
      <p className="mt-1 mb-4 text-xs text-muted-foreground">
        {ready(state) && state.data.limit
          ? `Your account can be logged in on up to ${state.data.limit} devices at a time. Log out any device you don't recognise.`
          : "Devices where your account is logged in. Log out any device you don't recognise."}
      </p>

      {!ready(state) ? (
        <ApiStatus state={state} className="min-h-32" />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {state.data.devices.map((device) => (
            <li key={device.id} className="flex flex-col gap-2 p-3">
              <DeviceSummary device={device} />
              <button
                onClick={() => logOutDevice(device)}
                disabled={busy !== null}
                className={`${btn.small} ml-13 self-start`}
              >
                {busy === device.id ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                Log out
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={logOutAll}
        disabled={!ready(state) || busy !== null}
        className={`${btn.danger} mt-4 w-full`}
      >
        {busy === "all" ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
        Log out from all devices
      </button>
    </section>
  );
}
