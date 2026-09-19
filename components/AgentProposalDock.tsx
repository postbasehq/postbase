"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { agentStore, useAgentProposal } from "@/lib/agent/ui-store";
import { AgentProposalPanel } from "@/components/AgentProposalPanel";

/**
 * The proposed-post panel, docked inside the floating content card so it splits
 * the page. Only on /agent when a proposal is open: a width-animated column on
 * lg+ (resizable by dragging its left edge, persisted), a drawer on < lg.
 */
const DEFAULT_W = 440;
const clampW = (w: number) => Math.max(340, Math.min(680, w));

export function AgentProposalDock() {
  const pathname = usePathname() ?? "";
  const onAgent = pathname === "/agent" || pathname.startsWith("/agent/");
  const { proposal, channels, key, open } = useAgentProposal();
  const show = onAgent && !!proposal && open;
  const close = () => agentStore.closeProposal();

  const [width, setWidth] = useState(DEFAULT_W);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; w: number } | null>(null);

  useEffect(() => {
    try {
      const s = Number(localStorage.getItem("pb_agent_panel_w"));
      if (s) setWidth(clampW(s));
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("pb_agent_panel_w", String(width));
    } catch {
      // ignore
    }
  }, [width]);
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      if (drag.current) setWidth(clampW(drag.current.w + (drag.current.x - e.clientX)));
    };
    const up = () => setDragging(false);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      drag.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging]);

  return (
    <>
      {/* desktop: a resizable, width-animated column inside the card */}
      <AnimatePresence initial={false}>
        {show ? (
          <motion.div
            key="dock"
            initial={{ width: 0 }}
            animate={{ width }}
            exit={{ width: 0 }}
            transition={dragging ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 42 }}
            className="relative hidden shrink-0 overflow-hidden border-l border-line lg:block"
          >
            {/* resize handle on the left edge */}
            <div
              onPointerDown={(e) => {
                e.preventDefault();
                drag.current = { x: e.clientX, w: width };
                setDragging(true);
              }}
              className="group absolute inset-y-0 left-0 z-10 w-2 cursor-col-resize touch-none"
              aria-hidden
            >
              <span
                className={`absolute inset-y-0 left-0 w-px transition-colors group-hover:bg-blue ${
                  dragging ? "bg-blue" : "bg-transparent"
                }`}
              />
            </div>
            <div className="h-full" style={{ width }}>
              <AgentProposalPanel key={key} proposal={proposal!} channels={channels} onClose={close} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* mobile: slide-over drawer */}
      <AnimatePresence>
        {show ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <motion.div
              className="absolute inset-0 bg-black/40"
              onClick={close}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 460, damping: 42 }}
            >
              <AgentProposalPanel key={key} proposal={proposal!} channels={channels} onClose={close} />
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
