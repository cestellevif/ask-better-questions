import { describe, it, expect } from "vitest";
import {
  looksLikeArchivePath,
  looksLikeSectionPath,
  looksLikeHubText,
  guessStoryLinks,
  decideIsMulti,
} from "@/lib/extractor";

// ── looksLikeArchivePath ──────────────────────────────────────────────────────

describe("looksLikeArchivePath", () => {
  it("matches /tag/ paths", () => {
    expect(looksLikeArchivePath("https://example.com/tag/politics")).toBe(true);
  });

  it("matches /category/ paths", () => {
    expect(looksLikeArchivePath("https://example.com/category/news")).toBe(true);
  });

  it("matches /archive paths", () => {
    expect(looksLikeArchivePath("https://example.com/archive/2024")).toBe(true);
  });

  it("matches /topics/ paths", () => {
    expect(looksLikeArchivePath("https://example.com/topics/climate")).toBe(true);
  });

  it("does not match article paths", () => {
    expect(looksLikeArchivePath("https://cnn.com/2024/01/01/politics/story")).toBe(false);
  });

  it("does not match single-segment section paths", () => {
    expect(looksLikeArchivePath("https://cnn.com/politics")).toBe(false);
  });

  it("returns false for invalid URL", () => {
    expect(looksLikeArchivePath("not-a-url")).toBe(false);
  });
});

// ── looksLikeSectionPath ──────────────────────────────────────────────────────

describe("looksLikeSectionPath", () => {
  it("matches single-segment section paths like /politics", () => {
    expect(looksLikeSectionPath("https://cnn.com/politics")).toBe(true);
  });

  it("matches /world, /business, /entertainment", () => {
    expect(looksLikeSectionPath("https://bbc.com/world")).toBe(true);
    expect(looksLikeSectionPath("https://nytimes.com/business")).toBe(true);
  });

  it("does not match paths with digits (e.g. year segments)", () => {
    expect(looksLikeSectionPath("https://example.com/2024")).toBe(false);
  });

  it("does not match paths with file extensions", () => {
    expect(looksLikeSectionPath("https://example.com/index.html")).toBe(false);
  });

  it("does not match multi-segment paths", () => {
    expect(looksLikeSectionPath("https://cnn.com/politics/story-slug")).toBe(false);
  });

  it("matches bare domain homepage (no path segments)", () => {
    expect(looksLikeSectionPath("https://cnn.com/")).toBe(true);
    expect(looksLikeSectionPath("https://cnn.com")).toBe(true);
  });

  it("returns false for invalid URL", () => {
    expect(looksLikeSectionPath("not-a-url")).toBe(false);
  });
});

// ── looksLikeHubText ──────────────────────────────────────────────────────────

describe("looksLikeHubText", () => {
  it("returns true for many short lines", () => {
    const lines = Array.from({ length: 25 }, (_, i) => `Headline number ${i + 1} is a short line`);
    expect(looksLikeHubText(lines.join("\n"))).toBe(true);
  });

  it("returns false for fewer than 20 lines", () => {
    const lines = Array.from({ length: 15 }, (_, i) => `Short line ${i}`);
    expect(looksLikeHubText(lines.join("\n"))).toBe(false);
  });

  it("returns false for single-line text (Readability output)", () => {
    const text = "This is a long article text all on one line. ".repeat(50);
    expect(looksLikeHubText(text)).toBe(false);
  });

  it("returns false when most lines are long prose", () => {
    const lines = Array.from(
      { length: 25 },
      () => "This is a very long line of prose that exceeds the ninety character threshold for hub detection and keeps going."
    );
    expect(looksLikeHubText(lines.join("\n"))).toBe(false);
  });
});

// ── guessStoryLinks ───────────────────────────────────────────────────────────

describe("guessStoryLinks", () => {
  const BASE = "https://example.com";

  function html(links: { href: string; text: string }[]) {
    return `<html><body><main>${links.map(
      l => `<a href="${l.href}">${l.text}</a>`
    ).join("")}</main></body></html>`;
  }

  it("returns scored candidates for story-like links", () => {
    const h = html([
      { href: "/news/2024/01/01/some-story", text: "This is a long enough article headline text" },
    ]);
    const links = guessStoryLinks(h, BASE);
    expect(links.length).toBe(1);
    expect(links[0].score).toBeGreaterThan(80);
  });

  it("excludes links to other domains", () => {
    const h = html([
      { href: "https://other.com/news/story-slug-here-long", text: "Article about something important today" },
    ]);
    expect(guessStoryLinks(h, BASE)).toHaveLength(0);
  });

  it("includes www-prefixed links when base has no www (redirect case)", () => {
    // foxnews.com redirects to www.foxnews.com — HTML links use www host, base does not
    const h = `<html><body><main>
      <a href="https://www.example.com/politics/2024/story-slug">Long enough headline about breaking news today</a>
    </main></body></html>`;
    expect(guessStoryLinks(h, BASE)).toHaveLength(1);
  });

  it("excludes links with nav keywords", () => {
    const h = html([
      { href: "/subscribe/plan", text: "Subscribe to get full access to our articles" },
      { href: "/signin/page", text: "Sign in to your account to read this article" },
    ]);
    expect(guessStoryLinks(h, BASE)).toHaveLength(0);
  });

  it("excludes links with text shorter than 18 chars", () => {
    const h = html([
      { href: "/news/story", text: "Too short" },
    ]);
    expect(guessStoryLinks(h, BASE)).toHaveLength(0);
  });

  it("returns at most 8 results", () => {
    const links = Array.from({ length: 15 }, (_, i) => ({
      href: `/news/2024/story-number-${i}`,
      text: `Article headline number ${i} about something that happened recently`,
    }));
    const result = guessStoryLinks(html(links), BASE);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("sorts by score descending", () => {
    const h = html([
      { href: "/about", text: "A short but valid text link about us" },
      { href: "/news/2024/01/story", text: "Breaking news article with a long enough headline today" },
    ]);
    const links = guessStoryLinks(h, BASE);
    expect(links[0].score).toBeGreaterThanOrEqual(links[links.length - 1].score);
  });
});

// ── decideIsMulti ─────────────────────────────────────────────────────────────

describe("decideIsMulti", () => {
  const LONG_TEXT = "x".repeat(2000);
  const SHORT_TEXT = "x".repeat(400);

  function strongLinks(n = 6) {
    return Array.from({ length: n }, (_, i) => ({
      title: `Article headline ${i}`,
      url: `https://cnn.com/politics/2024/story-${i}`,
      score: 95,
      snippet: `Article headline ${i}`,
    }));
  }

  it("returns true for archive path with enough links", () => {
    expect(decideIsMulti("https://example.com/tag/news", LONG_TEXT, strongLinks())).toBe(true);
  });

  it("returns false for long article text with no hub signals", () => {
    expect(decideIsMulti("https://example.com/2024/01/01/story", LONG_TEXT, [])).toBe(false);
  });

  it("returns true for section path with strong links, even with long text (CNN/politics case)", () => {
    expect(decideIsMulti("https://cnn.com/politics", LONG_TEXT, strongLinks())).toBe(true);
  });

  it("returns false for section path with insufficient link signal", () => {
    expect(decideIsMulti("https://cnn.com/politics", LONG_TEXT, strongLinks(3))).toBe(false);
  });

  it("returns true for short text with strong link signal", () => {
    expect(decideIsMulti("https://example.com/some-page", SHORT_TEXT, strongLinks())).toBe(true);
  });

  it("returns false for short text without strong link signal", () => {
    expect(decideIsMulti("https://example.com/some-page", SHORT_TEXT, [])).toBe(false);
  });

  it("returns false for long text non-section path even with strong links (links not gathered in practice)", () => {
    expect(decideIsMulti("https://example.com/2024/long/article/path", LONG_TEXT, strongLinks())).toBe(false);
  });
});
