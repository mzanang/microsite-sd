"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, MessageCircle, Send, UserRound } from "lucide-react";
import type { PublicCommunityEntry, PublicCommunityForumReply } from "@/lib/community-data";

type ForumDiscussionProps = { entry: PublicCommunityEntry; canReply: boolean };

export function ForumDiscussion({ entry, canReply }: ForumDiscussionProps) {
  const [replies, setReplies] = useState(entry.replies);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/komunitas-belajar/forum-replies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entry_id: entry.id, body }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Balasan belum dapat disimpan.");
    else {
      setReplies((current) => [...current, result.reply as PublicCommunityForumReply]);
      setBody("");
      setMessage("Balasan berhasil ditambahkan.");
    }
    setBusy(false);
  }

  return <section className="mt-5 rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-[0_8px_24px_rgba(23,83,158,.06)] sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link href="/komunitas-belajar/forum-diskusi-guru" aria-label="Kembali ke forum diskusi guru" className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#bfd2e8] text-[#1264c5] hover:bg-[#edf4ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]"><ArrowLeft size={17} aria-hidden="true" /></Link>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Diskusi guru</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-.03em] text-[#173f70] sm:text-4xl">{entry.title}</h1>
        <p className="mt-3 text-sm text-[#6683a6]">Dibuat oleh <strong className="text-[#173f70]">{entry.author_name}</strong>{entry.category ? ` · ${entry.category}` : ""}</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-lg bg-[#edf4ff] px-3 py-2 text-xs font-bold text-[#1264c5]"><MessageCircle size={15} aria-hidden="true" />{replies.length} balasan</span>
    </div>
    <div className="mt-7 rounded-xl bg-[#f8fbff] p-5 text-sm leading-7 text-[#536f92]">{entry.body || "Topik ini belum memiliki isi pembuka."}</div>
    <div className="mt-8">
      <h2 className="text-xl font-extrabold text-[#173f70]">Balasan diskusi</h2>
      {replies.length ? <div className="mt-4 space-y-3">{replies.map((reply) => <article key={reply.id} className="rounded-xl border border-[#e1eaf4] p-4"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf4ff] text-[#1264c5]"><UserRound size={17} aria-hidden="true" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-bold text-[#173f70]">{reply.author_name}</p><span className="text-xs text-[#6683a6]">{reply.author_role === "kepala_sekolah" ? "Kepala Sekolah" : reply.author_role === "pengawas_dabin" ? "Pengawas Dabin" : "Guru"}</span><time className="text-xs text-[#8aa1bd]">{new Date(reply.created_at).toLocaleString("id-ID")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#536f92]">{reply.body}</p></div></div></article>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-[#bfd2e8] px-4 py-6 text-sm text-[#6683a6]">Belum ada balasan. Jadilah orang pertama yang menanggapi.</p>}
    </div>
    {canReply && <form onSubmit={submit} className="mt-8 rounded-xl border border-[#dbe7f5] bg-[#fbfdff] p-4 sm:p-5"><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Tulis balasan</span><textarea value={body} onChange={(event) => setBody(event.target.value)} required maxLength={3000} rows={4} className="w-full rounded-xl border border-[#bfd2e8] px-3 py-3 text-sm text-[#173f70] outline-none focus:border-[#1264c5]" placeholder="Bagikan pengalaman atau tanggapan Anda." /></label>{error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}{message && <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p>}<div className="mt-3 flex justify-end"><button type="submit" disabled={busy || !body.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1264c5] px-4 text-xs font-bold text-white hover:bg-[#0d4e9b] disabled:cursor-not-allowed disabled:opacity-60"><Send size={15} aria-hidden="true" />{busy ? "Mengirim..." : "Kirim balasan"}</button></div></form>}
  </section>;
}
