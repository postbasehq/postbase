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
