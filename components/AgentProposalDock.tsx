"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { agentStore, useAgentProposal } from "@/lib/agent/ui-store";
import { AgentProposalPanel } from "@/components/AgentProposalPanel";

/**
 * The proposed-post panel, docked inside the floating content card so it splits
 * the page (chat narrows left, panel on the right, its header aligned with the
 * global header). Renders only on /agent when a proposal is open, sliding in as
 * a width-animated column (lg+) or a slide-over drawer (< lg).
 */
const PANEL_W = 440;

export function AgentProposalDock() {
  const pathname = usePathname() ?? "";
  const onAgent = pathname === "/agent" || pathname.startsWith("/agent/");
  const { proposal, channels, key, open } = useAgentProposal();
  const show = onAgent && !!proposal && open;
  const close = () => agentStore.closeProposal();

  return (
    <>
      {/* desktop: a width-animated column inside the card */}
      <AnimatePresence initial={false}>
        {show ? (
          <motion.div
            key="dock"
            initial={{ width: 0 }}
            animate={{ width: PANEL_W }}
            exit={{ width: 0 }}
            transition={{ type: "spring", stiffness: 460, damping: 42 }}
            className="hidden shrink-0 overflow-hidden border-l border-line lg:block"
          >
            <div className="h-full" style={{ width: PANEL_W }}>
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
