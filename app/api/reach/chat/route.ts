import { NextResponse } from "next/server";
import { answerFollower } from "@/lib/reach/agent";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  getActiveCtas,
  getConversation,
  getPublishedPage,
  logMessage,
  searchCorpus,
  startConversation,
} from "@/lib/reach/queries";

/**
 * Public follower chat endpoint for a Postbase Reach page. Anonymous: identified
 * only by handle + a client-generated session id. Retrieves the corpus, answers
 * with the Reach agent (cited / refusing), and logs both turns as intent data.
 *
 * Every question is a paid model call from an anonymous caller, so it's capped
 * per IP (burst + daily), per page (daily budget) and per conversation.
 */
const LIMITS = {
  ipPerMinute: 8,
  ipPerDay: 100,
  pagePerDay: 1000,
  turnsPerConversation: 30,
};

function limited(reason: string) {
  return NextResponse.json({ error: "rate_limited", reason }, { status: 429 });
}

export async function POST(req: Request) {
  let body: { handle?: string; question?: string; sessionId?: string; conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const handle = (body.handle ?? "").trim();
  const question = (body.question ?? "").trim();
  if (!handle || !question) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const page = await getPublishedPage(handle);
  if (!page) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const sessionId = (body.sessionId ?? "").slice(0, 64) || "anon";
  const existing = body.conversationId
    ? await getConversation(page.id, body.conversationId, sessionId)
    : null;
  if (existing && existing.userTurns >= LIMITS.turnsPerConversation) return limited("conversation");

  const ip = clientKey(req);
  if (!(await rateLimit(`reach:ip:${ip}:m`, 60, LIMITS.ipPerMinute))) return limited("burst");
  if (!(await rateLimit(`reach:ip:${ip}:d`, 86_400, LIMITS.ipPerDay))) return limited("daily");
  if (!(await rateLimit(`reach:page:${page.id}:d`, 86_400, LIMITS.pagePerDay))) return limited("page");

  const [content, ctas] = await Promise.all([
    searchCorpus(page.id, question),
    getActiveCtas(page.id),
  ]);

  const conversationId = existing?.id ?? (await startConversation(page.id, sessionId));

  await logMessage({ conversationId, role: "user", content: question });

  let result;
  try {
    result = await answerFollower({ page, question, content, ctas });
  } catch {
    return NextResponse.json({ error: "agent_error" }, { status: 502 });
  }

  await logMessage({
    conversationId,
    role: "assistant",
    content: result.answer,
    answered: result.answered,
    citedContentIds: result.citedContentIds,
    ctaId: result.ctaId,
  });

  // Hydrate cited content + chosen CTA for the client to render as links.
  const cited = content.filter((c) => result.citedContentIds.includes(c.id));
  const cta = ctas.find((c) => c.id === result.ctaId) ?? null;

  return NextResponse.json({
    conversationId,
    answer: result.answer,
    answered: result.answered,
    cited: cited.map((c) => ({ title: c.title, url: c.url, thumbnail: c.thumbnail_url })),
    cta: cta ? { label: cta.label, url: cta.url, kind: cta.kind } : null,
  });
}
