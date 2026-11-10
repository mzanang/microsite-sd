"use client";

import { useState } from "react";
import { CommunityNav } from "@/components/community/community-nav";

type CommunitySectionShellProps = {
  schoolName: string;
  logoUrl: string;
  children: React.ReactNode;
};

export function CommunitySectionShell({ schoolName, logoUrl, children }: CommunitySectionShellProps) {
  const [searchValue, setSearchValue] = useState("");

  return <main className="min-h-screen overflow-x-hidden bg-[#f7f9fb] font-[var(--font-plus-jakarta)] text-[#191c1e]">
    <CommunityNav schoolName={schoolName} logoUrl={logoUrl} searchValue={searchValue} onSearchChange={setSearchValue} />
    <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-[9rem] sm:px-6 sm:pt-[9rem] xl:pt-[5.5rem]">{children}</div>
  </main>;
}
