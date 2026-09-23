import Anthropic from "@anthropic-ai/sdk";
import type { ReachContent, ReachCta, ReachPage } from "@/lib/reach/queries";

/**
 * The Reach follower agent. Given a question plus the retrieved corpus and the
 * creator's approved CTAs, it answers ONLY from that content, cites the pieces
 * it used, and optionally routes to a single relevant CTA. When the corpus can't
 * support an answer it must refuse — that refusal is logged as demand signal,
 * not hidden. Runs one non-streaming call for clean logging on the public page.
 */

export type ReachAnswer = {
  answer: string;
  answered: boolean;
  citedContentIds: string[];
  ctaId: string | null;
};

const MODEL = process.env.REACH_MODEL || "claude-sonnet-5";

function buildSystem(page: ReachPage): string {
  const name = page.display_name || page.handle;
  return [
    `You are the assistant on ${name}'s link-in-bio page. Followers ask what to`,
    `watch, read, or buy next. You speak for ${name} in a warm, concise voice.`,
    ``,
    `HARD RULES:`,
    `- Answer ONLY using the numbered CONTENT and CTAS provided below. Never use`,
    `  outside knowledge, never invent videos, products, prices, or claims.`,
    `- Recommend at most ONE CTA, and only when it genuinely fits the ask.`,
    `- Keep answers to 2-4 sentences. Point to specific content by its number.`,
    ``,
    `SETTING answered:`,
    `- true  = you gave a real next step: you cited relevant CONTENT, and/or a`,
    `          CTA that directly fulfils the request (e.g. "can I work with you"`,
    `          -> the consult CTA).`,
    `- false = you had nothing genuinely relevant and are deflecting. You may`,
    `          still offer the newsletter as a soft fallback, but this is an`,
    `          unmet request — do NOT pretend otherwise, and do NOT guess.`,
    ``,
    `Respond by calling the "reply" tool exactly once.`,
  ].join("\n");
}

function buildContext(content: ReachContent[], ctas: ReachCta[]): string {
  const c = content.length
    ? content
        .map(
          (x, i) =>
            `[C${i + 1}] id=${x.id}\nTitle: ${x.title ?? "(untitled)"}\nURL: ${x.url}\n${(x.body ?? "").slice(0, 800)}`,
        )
        .join("\n\n")
    : "(no matching content)";
  const t = ctas.length
    ? ctas
        .map(
          (x) =>
            `[CTA id=${x.id}] ${x.kind}: ${x.label} -> ${x.url}${x.description ? ` (use when: ${x.description})` : ""}`,
        )
        .join("\n")
    : "(no CTAs configured)";
  return `CONTENT:\n${c}\n\nCTAS:\n${t}`;
}

const REPLY_TOOL: Anthropic.Tool = {
  name: "reply",
  description: "Return the answer to the follower along with what it was based on.",
  input_schema: {
    type: "object",
    properties: {
      answer: { type: "string", description: "The reply shown to the follower." },
      answered: {
        type: "boolean",
        description: "true if the provided content supported a real answer; false if you had to refuse/deflect.",
      },
      cited_content_ids: {
        type: "array",
        items: { type: "string" },
        description: "The id= values of the CONTENT items you actually used (may be empty).",
      },
      cta_id: {
        type: ["string", "null"],
        description: "The id of the ONE CTA to surface, or null.",
      },
    },
    required: ["answer", "answered", "cited_content_ids", "cta_id"],
  },
};

export async function answerFollower(args: {
  page: ReachPage;
  question: string;
  content: ReachContent[];
  ctas: ReachCta[];
}): Promise<ReachAnswer> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const anthropic = new Anthropic({ apiKey });
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: buildSystem(args.page),
    tools: [REPLY_TOOL],
    tool_choice: { type: "tool", name: "reply" },
    messages: [
      {
        role: "user",
        content: `${buildContext(args.content, args.ctas)}\n\nFOLLOWER QUESTION:\n${args.question}`,
      },
    ],
  });

  const block = res.content.find((b) => b.type === "tool_use") as
    | Anthropic.ToolUseBlock
    | undefined;
  const out = (block?.input ?? {}) as {
    answer?: string;
    answered?: boolean;
    cited_content_ids?: string[];
    cta_id?: string | null;
  };

  // Only trust ids the model was actually given (guard against hallucinated ids).
  const validContent = new Set(args.content.map((c) => c.id));
  const validCta = new Set(args.ctas.map((c) => c.id));
  const cited = (out.cited_content_ids ?? []).filter((id) => validContent.has(id));
  const ctaId = out.cta_id && validCta.has(out.cta_id) ? out.cta_id : null;

  return {
    answer: out.answer?.trim() || "I don't have something on that yet.",
    // Trust the model's judgement of whether it met the request, but require it
    // to be backed by real content or a real CTA (guards hallucinated wins).
    answered: out.answered === true && (cited.length > 0 || ctaId !== null),
    citedContentIds: cited,
    ctaId,
  };
}
