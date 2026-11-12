import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CommunityPublicPage } from "@/components/community/community-public-page";

const pages = {
  "sk-komunitas-belajar": { title: "SK Komunitas Belajar", description: "Dokumen dan informasi keputusan pembentukan Komunitas Belajar Guru.", kind: "document" as const },
  "materi-kegiatan": { title: "Materi Kegiatan", description: "Materi pembelajaran dan bahan kegiatan Komunitas Belajar Guru.", kind: "document" as const },
  "daftar-hadir": { title: "Daftar Hadir dan Notulen", description: "Daftar hadir serta catatan kegiatan Komunitas Belajar Guru.", kind: "document" as const },
  "upload-tugas-kombel": { title: "Tugas Kombel", description: "Daftar tugas dan karya yang dipublikasikan untuk Komunitas Belajar Guru." },
  "dokumentasi-kegiatan": { title: "Dokumentasi Kegiatan", description: "Dokumentasi kegiatan Komunitas Belajar Guru SD Negeri Dukuhwaru 01.", kind: "document" as const },
  "praktik-baik-guru": { title: "Praktik Baik Guru", description: "Ruang berbagi strategi dan pengalaman pembelajaran dari komunitas guru.", kind: "document" as const },
  "forum-diskusi-guru": { title: "Forum Diskusi Guru", description: "Ruang bertukar pengalaman dan gagasan untuk mendukung pembelajaran di sekolah.", kind: "document" as const },
} as const;

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ bulan?: string; tahun?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug as keyof typeof pages];
  return { title: page?.title ?? "Komunitas Belajar Guru" };
}

export default async function CommunityPublicSubpage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const filters = await searchParams;
  if (slug === "daftar-hadir-notulen") redirect("/komunitas-belajar/daftar-hadir");
  const page = pages[slug as keyof typeof pages];
  if (!page) notFound();
  return <CommunityPublicPage slug={slug} title={page.title} description={page.description} month={filters.bulan} year={filters.tahun} />;
}
