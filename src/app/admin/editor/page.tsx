import { EditorWorkspace } from "@/components/admin/editor-workspace";
import { getAdminConfig } from "@/lib/data";

export default async function EditorPage() { return <EditorWorkspace initialConfig={await getAdminConfig()} />; }
