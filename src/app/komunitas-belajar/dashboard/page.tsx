import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentKbProfile, getKbDashboardPath } from "@/lib/kb/auth";

export const metadata: Metadata = { title: "Dashboard Komunitas Belajar" };
export const dynamic = "force-dynamic";

export default async function CommunityDashboardPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  redirect(getKbDashboardPath(profile));
}
