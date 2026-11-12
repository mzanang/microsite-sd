import type { Metadata } from "next";
import { CommunityLanding } from "@/components/community/community-landing";
import { getPublicCommunityData } from "@/lib/community-data";

export const metadata: Metadata = {
  title: "Komunitas Belajar Guru",
  description: "Profil sekolah dan informasi publik Komunitas Belajar Guru SD Negeri Dukuhwaru 01.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommunityPage() {
  const data = await getPublicCommunityData();
  return <CommunityLanding data={data} />;
}
