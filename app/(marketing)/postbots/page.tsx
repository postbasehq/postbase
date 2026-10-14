import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CtaBand, FaqList, wrap } from "@/components/marketing/ui";
import { SectionHead, SeoHero, Steps, section } from "@/components/marketing/seo/sections";
import { PostbotsShot } from "@/components/marketing/PostbotsShot";
import { HeroPostbots } from "@/components/marketing/Decor";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";

/*
 * The public page for Postbots. The app itself lives at /bots (or the bots
 * host) behind sign-in, so this is what search engines and AI tools read.
 */

const TITLE = "Postbots: AI bots for social listening, built by chatting";
const DESCRIPTION =
  "Build AI bots by chatting. Postbots watch Reddit, Hacker News, Bluesky and Google News for conversations about what you make, and draft posts for you to schedule.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Postbots" }];

const FAQS: [string, string][] = [
  [
    "What is Postbots?",
    "Postbots is a chat app inside Postbase for building AI bots. You make a blank bot, tell it its job in plain words, and it names itself and sets up what it needs. Bots can listen for mentions on a schedule, search the web when you ask, and draft posts from your Postbase channels.",
  ],
  [
    "Where do Postbots listen?",
    "Reddit, Hacker News, Bluesky and Google News. You choose the keywords, the phrases to ignore (like a namesake product), and up to six check times a day. When something worth your attention turns up, the bot tells you in the chat and by email.",
  ],
  [
    "Can a Postbot post on its own?",
    "No. A bot drafts posts that you save to Postbase or schedule yourself. Nothing goes out without you.",
  ],
  [
    "Do I have to set up each bot from scratch?",
    "No. All your bots share what they know about you and your business, so a new bot starts with the same context as the others.",
  ],
  [
    "Which plans include Postbots?",
    "Postbots comes with every Postbase plan, including the 7-day free trial.",
  ],
];

export const metadata: Metadata = { title: { absolute: TITLE }, description: DESCRIPTION, ...pageMeta("/postbots") };

export default function PostbotsPage() {
  return (
    <>
      <SeoJsonLd path="/postbots" name={TITLE} description={DESCRIPTION} trail={TRAIL} faqs={FAQS} />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          h1={["Bots you build", "by chatting"]}
          sub="Tell a Postbot what to watch for. It checks Reddit, Hacker News, Bluesky and Google News on a schedule, tells you when someone is talking about what you make, and drafts the posts for you to schedule."
          cta={{ label: "Start your 7-day free trial", href: "/login?next=/bots" }}
          frame="A Postbot reporting what it found today"
          decor={<HeroPostbots linked={false} />}
        >
          {/* The app's own layout, so it scrolls sideways on a phone rather than squashing. */}
          <div className="overflow-x-auto">
            <div className="h-[560px] min-w-[860px]">
              <PostbotsShot />
            </div>
          </div>
        </SeoHero>

        <section className={section}>
          <SectionHead title="How it works" />
          <Steps
            items={[
              {
                title: "Make a bot",
                body: "Press + and say what you want, like \"tell me when anyone asks for a Buffer alternative\". It names itself and asks what it needs to know.",
              },
              {
                title: "It listens on a schedule",
                body: "Pick the keywords, the sources and the times. The bot checks each one and only reports what's worth your attention.",
              },
              {
                title: "You decide what to post",
                body: "Ask it to draft a reply or a post from what it found. You save it to Postbase or schedule it; the bot never posts by itself.",
              },
            ]}
          />
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={FAQS} />
        </section>

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand body="Build your first bot in a minute. It listens while you work and drafts the posts worth making." />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
