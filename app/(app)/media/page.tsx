import { createClient } from "@/lib/supabase/server";
import { scopeOrgId } from "@/lib/org";
import { deleteMediaAsset, renameMediaAsset, type MediaFolder } from "../media-actions";
import { MediaLibrary, type MediaItem } from "@/components/MediaLibrary";

export default async function MediaPage() {
  const supabase = await createClient();
  const orgId = await scopeOrgId();
  const [{ data }, { data: folderRows }] = await Promise.all([
    supabase
      .from("media_library")
      .select("id, url, name, type, size_bytes, created_at, folder_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase.from("media_folders").select("id, name").eq("org_id", orgId).order("name", { ascending: true }),
  ]);
  const items = (data ?? []) as MediaItem[];
  const folders = (folderRows ?? []) as MediaFolder[];

  // The top bar already says "Media": the library starts straight away.
  return (
    <MediaLibrary
      initialItems={items}
      initialFolders={folders}
      deleteAction={deleteMediaAsset}
      renameAction={renameMediaAsset}
    />
  );
}
