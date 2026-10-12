export type AdminToastTone = "success" | "error";

export function notifyAdmin(message: string, tone: AdminToastTone = "success") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("admin-toast", { detail: { message, tone } }));
  }
}
