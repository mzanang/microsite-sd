import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewManager } from "@/components/community/review-manager";
import { getCurrentKbProfile, getKbDashboardPath } from "@/lib/kb/auth";

export const metadata: Metadata = { title: "Pemeriksaan Administrasi" };
export const dynamic = "force-dynamic";

export default async function CommunityMonitoringPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  if (!["kepala_sekolah", "pengawas_dabin"].includes(profile.role)) redirect(getKbDashboardPath(profile));
  return <main className="min-h-screen bg-[#f4f8ff] px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><Link href="/komunitas-belajar/dashboard" className="text-sm font-bold text-[#1264c5]">Kembali ke dashboard</Link><div className="mt-8"><ReviewManager canReview={profile.role === "kepala_sekolah"} /></div></div></main>;
}
