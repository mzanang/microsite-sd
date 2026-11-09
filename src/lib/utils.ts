import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) { return clsx(inputs); }

export function isSafeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol);
  } catch { return false; }
}

export function isSafeInternalRoute(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return false;
  if (/(^|\/)\.\.(\/|$)/.test(value)) return false;
  try {
    const url = new URL(value, "https://internal-route.invalid");
    if (!url.pathname || url.pathname === "/admin" || url.pathname.startsWith("/admin/") || url.pathname === "/api" || url.pathname.startsWith("/api/")) return false;
    return url.origin === "https://internal-route.invalid";
  } catch { return false; }
}

export function formatDate(value?: string | null) {
  if (!value) return "Belum pernah";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
