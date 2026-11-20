"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DeviceSummary from "@/components/DeviceSummary";
import type { LoginDevice } from "@/lib/api-types";
import { btn } from "@/lib/ui";

// Shown by the store when a login is refused with DEVICE_LIMIT: the user picks
// one of their signed-in devices to log out, and the login is repeated.
export default function DeviceLimitDialog({
  devices,
  limit,
  onChoose,
  onCancel,
}: {
  devices: LoginDevice[];
  limit: number;
  onChoose: (deviceId: string) => void;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <Modal
      open
      onClose={onCancel}
      size="md"
      title="Too many devices"
      footer={
        <>
          <button onClick={onCancel} className={btn.secondary}>
            Cancel
          </button>
          <button onClick={() => picked && onChoose(picked)} disabled={!picked} className={btn.danger}>
            <LogOut size={16} /> Log out and continue
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Your account can be logged in on {limit} devices at a time. Choose a device to log out so you can log in here.
      </p>
      <div role="radiogroup" aria-label="Devices" className="space-y-2">
        {devices.map((device) => (
          <label
            key={device.id}
            className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
              picked === device.id ? "border-primary bg-primary/5" : "border-border hover:bg-surface"
            }`}
          >
            <input
              type="radio"
              name="device"
              value={device.id}
              checked={picked === device.id}
              onChange={() => setPicked(device.id)}
              className="accent-primary"
            />
            <DeviceSummary device={device} />
          </label>
        ))}
      </div>
    </Modal>
  );
}
