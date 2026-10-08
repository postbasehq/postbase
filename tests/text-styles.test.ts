import { describe, expect, it } from "vitest";
import { applyStyle, hasStyle, toList, toPlain } from "@/lib/text-styles";

describe("unicode text styles", () => {
  it("bolds letters and digits, leaving punctuation and emoji alone", () => {
    expect(applyStyle("Hi 2026! ☕", "bold")).toBe("𝗛𝗶 𝟮𝟬𝟮𝟲! ☕");
  });
  it("italic has no digits, so they stay plain", () => {
    expect(applyStyle("Go 4", "italic")).toBe("𝘎𝘰 4");
  });
  it("styles replace each other instead of stacking, and round-trip to plain", () => {
    const mono = applyStyle(applyStyle("Ship it", "bold"), "mono");
    expect(mono).toBe("𝚂𝚑𝚒𝚙 𝚒𝚝");
    expect(toPlain(mono)).toBe("Ship it");
    expect(toPlain(applyStyle("a b", "strike"))).toBe("a b");
  });
  it("strikethrough marks characters but not spaces", () => {
    expect(applyStyle("a b", "strike")).toBe("a̶ b̶");
  });
  it("knows when a selection already has a style", () => {
    expect(hasStyle(applyStyle("Hello", "bold"), "bold")).toBe(true);
    expect(hasStyle("Hello", "bold")).toBe(false);
    expect(hasStyle(applyStyle("Hello", "italic"), "bold")).toBe(false);
  });
  it("makes and unmakes lists", () => {
    expect(toList("one\n\ntwo", "number")).toBe("1. one\n\n2. two");
    expect(toList("1. one\n2. two", "bullet")).toBe("• one\n• two");
    expect(toList("• one\n• two", "bullet")).toBe("one\ntwo");
  });
});
