"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useState } from "react";
import type { MicrositeConfig } from "@/types/microsite";
import { notifyAdmin } from "@/lib/admin-notify";

export function QuickPublishButton({ config }: { config: MicrositeConfig }) {
  const [busy, setBusy] = useState(false);
  async function publish() {
    setBusy(true);
    try {
      const draft = await fetch("/api/admin/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(config) });
      if (!draft.ok) throw new Error("Draf gagal disimpan.");
      const response = await fetch("/api/admin/publish", { method: "POST" });
      if (!response.ok) throw new Error("Publikasi gagal.");
      notifyAdmin("Perubahan berhasil dipublikasikan.", "success");
    } catch (error) {
      notifyAdmin(error instanceof Error ? error.message : "Publikasi gagal.", "error");
    } finally { setBusy(false); }
  }
  return <button onClick={publish} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-moss px-4 text-sm font-bold text-moss transition hover:bg-moss/5 disabled:cursor-wait disabled:opacity-60">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />} {busy ? "Menerbitkan..." : "Simpan & publikasikan"}</button>;
}
