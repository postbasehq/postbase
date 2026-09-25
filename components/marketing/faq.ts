// Homepage FAQ. Plain data (not a client module) so the page and its FAQPage
// structured data read the exact same questions and answers.
export const FAQ: [string, string][] = [
  [
    "Is Postbase open source?",
    "Yes. The code is on GitHub, and you can run it yourself for free with your own platform API keys. The hosted cloud is the paid, managed option.",
  ],
  [
    "Is there a free trial?",
    "Yes. Every plan starts with 7 days free. A card is required, and you can cancel any time before the trial ends.",
  ],
  [
    "Can AI agents post through Postbase?",
    "Yes. Add Postbase to Claude as a custom connector, or run @postbasehq/mcp in Cursor or any MCP client. Agents can list your channels, create and schedule posts or threads, check the queue and cancel posts.",
  ],
  ["Which networks does Postbase support?", "X, LinkedIn, Instagram, TikTok, YouTube, Bluesky and Mastodon."],
  [
    "Is there a public API?",
    "Yes. The REST API uses bearer keys you create on the Developers page. You can list channels, list and create posts, and cancel scheduled posts. Keys are stored as hashes and can be revoked any time.",
  ],
  [
    "Can I edit a post for just one network?",
    "Yes. Each network gets its own version of the post, so you can change the LinkedIn wording or turn the X version into a thread without touching the others.",
  ],
  [
    "What happens if a post fails to publish?",
    "Postbase retries temporary failures automatically. If a post needs you, for example because an account has to be reconnected, you'll see it in your notifications.",
  ],
  [
    "Can I manage several brands or clients?",
    "Yes. Each workspace has its own channels and team, and you can switch between them from the sidebar.",
  ],
];
