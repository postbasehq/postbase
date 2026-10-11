/** The apps Postbots can connect to (shared by the server and the Connect apps dialog). */

export type AppCategory = "Docs & files" | "Calendar & email" | "Team chat" | "CRM" | "Engineering";

export type AppInfo = {
  /** Composio toolkit slug; also the BrandTile key. */
  slug: string;
  name: string;
  /** What a bot can do with it, in a line. */
  line: string;
  category: AppCategory;
};

export const APP_CATEGORIES: AppCategory[] = ["Docs & files", "Calendar & email", "Team chat", "CRM", "Engineering"];

export const APPS: AppInfo[] = [
  { slug: "notion", name: "Notion", line: "Read briefs and content plans, write drafts into pages", category: "Docs & files" },
  { slug: "googledocs", name: "Google Docs", line: "Read docs and write drafts into new ones", category: "Docs & files" },
  { slug: "googledrive", name: "Google Drive", line: "Find files and folders in your Drive", category: "Docs & files" },
  { slug: "googlecalendar", name: "Google Calendar", line: "See launches and events to plan posts around", category: "Calendar & email" },
  { slug: "outlook", name: "Outlook", line: "Mail and calendar: read events, draft emails", category: "Calendar & email" },
  { slug: "slack", name: "Slack", line: "Send findings and drafts to a channel, read team chatter", category: "Team chat" },
  { slug: "discord", name: "Discord", line: "Read your servers and channels", category: "Team chat" },
  { slug: "hubspot", name: "HubSpot", line: "Turn leads your bots find into contacts", category: "CRM" },
  { slug: "linear", name: "Linear", line: "Turn shipped issues into launch posts", category: "Engineering" },
  { slug: "github", name: "GitHub", line: "Turn releases and merged PRs into posts", category: "Engineering" },
  { slug: "gitlab", name: "GitLab", line: "Turn releases and merge requests into posts", category: "Engineering" },
];

const APP_SLUGS = new Set(APPS.map((a) => a.slug));
export const isAppSlug = (s: unknown): s is string => typeof s === "string" && APP_SLUGS.has(s);
export const appName = (slug: string) => APPS.find((a) => a.slug === slug)?.name ?? slug;
