import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { ForumDiscussion } from "@/components/community/forum-discussion";
import { CommunitySectionShell } from "@/components/community/community-section-shell";
import { getPublicCommunityContent, getPublicCommunityData } from "@/lib/community-data";
import { getCurrentKbProfile } from "@/lib/kb/auth";

type PageProps = { searchParams: Promise<{ entry_id?: string }> };

export const metadata: Metadata = { title: "Diskusi Guru | Komunitas Belajar" };
export const dynamic = "force-dynamic";

export default async function ForumGuruPage({ searchParams }: PageProps) {
  const [{ entry_id: entryId }, data, content, profile] = await Promise.all([searchParams, getPublicCommunityData(), getPublicCommunityContent(), getCurrentKbProfile()]);
  const entry = content.entries.find((item) => item.menu_key === "forum" && item.id === entryId);
  if (!entry) notFound();

  return <CommunitySectionShell schoolName={data.school.name} logoUrl={data.school.logo_url}>
    <nav aria-label="Jejak halaman" className="flex flex-wrap items-center gap-2 text-sm text-[#64748b]"><Link href="/komunitas-belajar" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold hover:bg-white hover:text-[#005bbf]"><Home size={16} aria-hidden="true" />Komunitas Belajar</Link><ChevronRight size={16} aria-hidden="true" /><Link href="/komunitas-belajar/forum-diskusi-guru" className="inline-flex min-h-11 items-center rounded-lg px-2 font-semibold hover:bg-white hover:text-[#005bbf]">Forum Diskusi Guru</Link><ChevronRight size={16} aria-hidden="true" /><span aria-current="page" className="font-semibold text-[#173f70]">{entry.title}</span></nav>
    <ForumDiscussion entry={entry} canReply={Boolean(profile)} />
  </CommunitySectionShell>;
}
