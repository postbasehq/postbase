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

  return (
    <div>
      <header className="flex items-end justify-between gap-4 pb-5 [border-bottom:0.5px_solid_var(--line)]">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">
            Media library
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Upload images and video up to 1&nbsp;GB. Reuse them across posts — big files
            upload in resumable chunks, so a dropped connection won’t cost you the whole file.
          </p>
        </div>
        {items.length > 0 ? (
          <div className="hidden shrink-0 text-right sm:block">
            <div className="font-display text-2xl font-semibold leading-none tabular-nums">
              {items.length}
            </div>
            <div className="mt-1 text-xs text-muted">{items.length === 1 ? "file" : "files"}</div>
          </div>
        ) : null}
      </header>

      <div className="mt-6">
        <MediaLibrary
          initialItems={items}
          initialFolders={folders}
          deleteAction={deleteMediaAsset}
          renameAction={renameMediaAsset}
        />
      </div>
    </div>
  );
}
