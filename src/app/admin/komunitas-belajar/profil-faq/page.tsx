import type { Metadata } from "next";
import { CommunityLandingManager } from "@/components/community/community-landing-manager";

export const metadata: Metadata = {
  title: "Profil & FAQ Komunitas Belajar",
};

export default function AdminCommunityProfilFaqPage() {
  return (
    <div className="space-y-8">
      <CommunityLandingManager />
    </div>
  );
}

