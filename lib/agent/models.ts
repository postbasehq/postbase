/**
 * The models the agent can run. Each maps to a provider; the chat route picks
 * the matching runner and API key. Edit ids/labels here in one place — the UI
 * selector and the route both read this list. GPT options need OPENAI_API_KEY;
 * Claude options need ANTHROPIC_API_KEY.
 */
export type AgentProvider = "anthropic" | "openai";

export type AgentModelDef = {
  id: string;
  provider: AgentProvider;
  label: string;
  description: string;
};

export const AGENT_MODELS: AgentModelDef[] = [
  { id: "claude-sonnet-5", provider: "anthropic", label: "Sonnet 5", description: "Balanced — great tool use" },
  { id: "gpt-5", provider: "openai", label: "GPT-5", description: "OpenAI's most capable" },
  { id: "gpt-5-mini", provider: "openai", label: "GPT-5 mini", description: "Fast and low-cost" },
  { id: "gpt-4.1", provider: "openai", label: "GPT-4.1", description: "Reliable workhorse" },
];

export const DEFAULT_MODEL_ID = process.env.AGENT_MODEL || "claude-sonnet-5";

export function getModel(id: string | undefined | null): AgentModelDef | null {
  return AGENT_MODELS.find((m) => m.id === id) ?? null;
}

/**
 * USD per million tokens, for logging an estimated cost per agent message.
 * Update when providers change prices. Sources: Anthropic and OpenAI pricing pages.
 */
const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  "gpt-5": { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 },
  "gpt-5-mini": { input: 0.25, output: 2, cacheRead: 0.025, cacheWrite: 0 },
  "gpt-4.1": { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 0 },
};

export function estimateCostUsd(
  modelId: string,
  u: { input: number; output: number; cacheRead: number; cacheWrite: number },
): number | null {
  const p = PRICES[modelId];
  if (!p) return null;
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1e6;
}
