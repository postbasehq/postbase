"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { WAITLIST_PLATFORMS } from "@/lib/platforms/availability";

/** Join or leave the "tell me when it opens" list for a platform in review. */
export async function toggleWaitlist(platform: string, join: boolean) {
  if (!(WAITLIST_PLATFORMS as readonly string[]).includes(platform)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (join) {
    await supabase
      .from("platform_waitlist")
      .upsert({ user_id: user.id, platform, email: user.email ?? null }, { onConflict: "user_id,platform", ignoreDuplicates: true });
  } else {
    await supabase.from("platform_waitlist").delete().eq("user_id", user.id).eq("platform", platform);
  }
  revalidatePath("/channels");
}
