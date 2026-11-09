import type { Metadata } from "next";
import { CommunityLanding } from "@/components/community/community-landing";
import { getPublicCommunityData } from "@/lib/community-data";

export const metadata: Metadata = {
  title: "Komunitas Belajar Guru",
  description: "Profil sekolah dan informasi publik Komunitas Belajar Guru SD Negeri Dukuhwaru 01.",
};

export const revalidate = 60;

export default async function CommunityPage() {
  return <CommunityLanding data={await getPublicCommunityData()} />;
}
