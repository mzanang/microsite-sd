import { getAdminConfig } from "@/lib/data";
import { AppearanceWorkspace } from "@/components/admin/appearance-workspace";

export default async function AppearancePage() { return <AppearanceWorkspace initialConfig={await getAdminConfig()} />; }
