import { createClient } from "@/lib/supabase/server";
import { deleteMediaAsset } from "../media-actions";
import { MediaLibrary, type MediaItem } from "@/components/MediaLibrary";

export default async function MediaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_library")
    .select("id, url, name, type, size_bytes, created_at")
    .order("created_at", { ascending: false });
  const items = (data ?? []) as MediaItem[];

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
        <MediaLibrary initialItems={items} deleteAction={deleteMediaAsset} />
      </div>
    </div>
  );
}
