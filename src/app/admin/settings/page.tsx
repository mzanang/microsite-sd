import { SettingsWorkspace } from "@/components/admin/settings-workspace";
import { getAdminConfig } from "@/lib/data";

export default async function SettingsPage() { return <SettingsWorkspace initialConfig={await getAdminConfig()} />; }
