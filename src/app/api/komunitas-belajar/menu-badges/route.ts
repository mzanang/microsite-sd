import { NextResponse } from "next/server";
import { getCurrentKbProfile } from "@/lib/kb/auth";
import { getRoleMenuBadges, type DashboardView } from "@/lib/kb/dashboard-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  if (profile.role === "super_admin") return NextResponse.json({ badges: {} });
  const view = profile.role === "guru" ? (profile.community_position === "ketua" ? "ketua" : "anggota") : profile.role === "kepala_sekolah" ? "ks" : "pengawas";
  return NextResponse.json({ badges: await getRoleMenuBadges(profile, view as DashboardView) });
}
