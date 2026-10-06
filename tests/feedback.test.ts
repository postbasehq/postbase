import { describe, expect, it } from "vitest";
import { buildFeedbackEmail, FEEDBACK_TO } from "@/lib/email/feedback";

const XSS = `<img src=x onerror=alert(1)><script>alert(2)</script>`;
const base = {
  kind: "bug" as const,
  message: "Calendar won't load\nIt spins forever on Safari.",
  page: "https://www.postbase.so/calendar",
  userAgent: "Mozilla/5.0 Safari",
  sender: { id: "u1", email: "maker@example.com" },
  workspace: { id: "o1", name: "Acme" },
  screenshot: null,
};

describe("feedback email", () => {
  it("goes to the team inbox, Reply-To the sender, with context", () => {
    const e = buildFeedbackEmail(base);
    expect(e.to).toEqual([FEEDBACK_TO]);
    expect(e.replyTo).toBe("maker@example.com");
    expect(e.subject).toBe("[Bug report] Calendar won't load");
    expect(e.text).toContain("Page: https://www.postbase.so/calendar");
    expect(e.text).toContain("Workspace: Acme (o1)");
    expect(e.attachments).toBeUndefined();
  });

  it("escapes user-controlled text and attaches a screenshot", () => {
    const e = buildFeedbackEmail({
      ...base,
      kind: "idea",
      message: XSS,
      workspace: { id: "o1", name: XSS },
      screenshot: { filename: "screenshot.jpg", base64: "AAAA" },
    });
    expect(e.subject.startsWith("[Idea] ")).toBe(true);
    expect(e.html).not.toContain("<script>");
    expect(e.html).not.toContain("<img src=x");
    expect(e.attachments).toEqual([{ filename: "screenshot.jpg", content: "AAAA" }]);
  });

  it("truncates long first lines in the subject", () => {
    const e = buildFeedbackEmail({ ...base, message: "x".repeat(200) });
    expect(Array.from(e.subject).length).toBeLessThan(90);
    expect(e.subject.endsWith("…")).toBe(true);
  });
});
