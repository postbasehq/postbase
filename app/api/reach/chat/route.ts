import { NextResponse } from "next/server";
import { answerFollower } from "@/lib/reach/agent";
import {
  getActiveCtas,
  getPublishedPage,
  logMessage,
  searchCorpus,
  startConversation,
} from "@/lib/reach/queries";

/**
 * Public follower chat endpoint for a Postbase Reach page. Anonymous: identified
 * only by handle + a client-generated session id. Retrieves the corpus, answers
 * with the Reach agent (cited / refusing), and logs both turns as intent data.
 */
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

  const [content, ctas] = await Promise.all([
    searchCorpus(page.id, question),
    getActiveCtas(page.id),
  ]);

  const conversationId =
    body.conversationId ?? (await startConversation(page.id, body.sessionId ?? "anon"));

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
