import { createClient } from "@/lib/supabase/server";
import { listBoard } from "@/lib/feedback";
import { RoadmapBoard } from "@/components/RoadmapBoard";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const items = user ? await listBoard(user.id) : [];

  return (
    <div className="mx-auto max-w-[860px]">
      <RoadmapBoard items={items} />
    </div>
  );
}
