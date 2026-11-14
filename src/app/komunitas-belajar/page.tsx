import type { Metadata } from "next";
import { CommunityLanding } from "@/components/community/community-landing";
import { getPublicCommunityData } from "@/lib/community-data";
import { getCommunityLandingConfig } from "@/lib/community-landing-config-server";

export const metadata: Metadata = {
  title: "Komunitas Belajar Guru",
  description: "Profil sekolah dan informasi publik Komunitas Belajar Guru SD Negeri Dukuhwaru 01.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommunityPage() {
  const [data, landingConfig] = await Promise.all([
    getPublicCommunityData(),
    getCommunityLandingConfig(),
  ]);

  return <CommunityLanding data={data} initialConfig={landingConfig} />;
}
