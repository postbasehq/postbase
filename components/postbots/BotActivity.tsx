"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Activity = { botId: string; state: "thinking" | "working" } | null;

const Ctx = createContext<{ activity: Activity; setActivity: (a: Activity) => void }>({
  activity: null,
  setActivity: () => undefined,
});

/** What the open bot is doing right now, shared by its chat and the sidebar. */
export function BotActivityProvider({ children }: { children: React.ReactNode }) {
  const [activity, setActivity] = useState<Activity>(null);
  return <Ctx.Provider value={{ activity, setActivity }}>{children}</Ctx.Provider>;
}

/** The state a bot's avatar should show in the sidebar. */
export function useBotActivity(botId: string): "thinking" | "working" | "resting" {
  const { activity } = useContext(Ctx);
  return activity?.botId === botId ? activity.state : "resting";
}

/** Called by the chat: publishes its bot's state, and clears it on leaving. */
export function usePublishActivity(botId: string, state: "thinking" | "working" | null) {
  const { setActivity } = useContext(Ctx);
  useEffect(() => {
    setActivity(state ? { botId, state } : null);
  }, [botId, state, setActivity]);
  useEffect(() => () => setActivity(null), [botId, setActivity]);
}
