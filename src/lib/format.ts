// undefined (a value still loading, e.g. from GET /config) shows "৳…"
export function formatBDT(amount: number | undefined): string {
  if (amount === undefined) return "৳…";
  const sign = amount < 0 ? "-" : "";
  return `${sign}৳${Math.round(Math.abs(amount)).toLocaleString("en-US")}`;
}

// A rate such as 0.125 as "12.5%" (no float noise like 7.000000000000001%)
export function formatPercent(rate: number): string {
  return `${Math.round(rate * 10_000) / 100}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Keeps the first 3 and last `visible` characters, e.g. 017•••••123
export function maskNumber(value: string, visible = 3): string {
  const clean = value.replace(/\s|-/g, "");
  if (clean.length <= visible + 3) return clean;
  return `${clean.slice(0, 3)}${"•".repeat(clean.length - visible - 3)}${clean.slice(-visible)}`;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function initials(name: string): string {
  return name
    .replace(/^(Dr\.|Md\.|Mr\.|Ms\.)\s*/i, "")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
