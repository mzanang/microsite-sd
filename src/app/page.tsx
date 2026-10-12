import { PublicMicrosite } from "@/components/microsite/public-microsite";
import { getPublishedConfig } from "@/lib/data";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function HomePage() { return <PublicMicrosite config={await getPublishedConfig()} />; }
