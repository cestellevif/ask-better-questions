/**
 * Unit tests for detectNonArticle from side_panel.js.
 *
 * Because side_panel.js is an IIFE script (not a module), detectNonArticle
 * cannot be imported directly. This file re-declares it verbatim and tests
 * its specification. Any divergence from production code is a signal to
 * update both here and in side_panel.js.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Mirrored from side_panel.js
// ---------------------------------------------------------------------------

function detectNonArticle(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host   = u.hostname.replace(/^www\./, "");
  const path   = u.pathname;
  const search = u.search;

  const social = ["twitter.com","x.com","instagram.com","reddit.com",
                  "facebook.com","tiktok.com","linkedin.com"];
  if (social.includes(host)) return "a social feed";

  if (/[?&](q|search|query)=/.test(search) || /\/search(\/|$)/.test(path))
    return "a search results page";

  if (/\/recipes?\//.test(path) || host === "cooking.nytimes.com") return "a recipe page";

  if (!path.replace(/\/$/, "")) return "a homepage";

  return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("detectNonArticle — social feeds", () => {
  it("returns 'a social feed' for twitter.com", () => {
    expect(detectNonArticle("https://twitter.com/user/status/123")).toBe("a social feed");
  });
  it("returns 'a social feed' for x.com", () => {
    expect(detectNonArticle("https://x.com/user/status/123")).toBe("a social feed");
  });
  it("returns 'a social feed' for www.instagram.com", () => {
    expect(detectNonArticle("https://www.instagram.com/p/abc123")).toBe("a social feed");
  });
  it("returns 'a social feed' for reddit.com", () => {
    expect(detectNonArticle("https://reddit.com/r/news/comments/abc")).toBe("a social feed");
  });
  it("returns 'a social feed' for facebook.com", () => {
    expect(detectNonArticle("https://www.facebook.com/post/123")).toBe("a social feed");
  });
  it("returns 'a social feed' for tiktok.com", () => {
    expect(detectNonArticle("https://tiktok.com/@user/video/123")).toBe("a social feed");
  });
  it("returns 'a social feed' for linkedin.com", () => {
    expect(detectNonArticle("https://www.linkedin.com/feed")).toBe("a social feed");
  });
});

describe("detectNonArticle — search results", () => {
  it("returns 'a search results page' for ?q= param", () => {
    expect(detectNonArticle("https://google.com/search?q=news")).toBe("a search results page");
  });
  it("returns 'a search results page' for ?search= param", () => {
    expect(detectNonArticle("https://bing.com/?search=latest")).toBe("a search results page");
  });
  it("returns 'a search results page' for ?query= param", () => {
    expect(detectNonArticle("https://example.com/results?query=test")).toBe("a search results page");
  });
  it("returns 'a search results page' for /search/ path", () => {
    expect(detectNonArticle("https://nytimes.com/search/results")).toBe("a search results page");
  });
  it("returns 'a search results page' for /search end of path", () => {
    expect(detectNonArticle("https://example.com/search")).toBe("a search results page");
  });
});

describe("detectNonArticle — recipe pages", () => {
  it("returns 'a recipe page' for /recipe/ path", () => {
    expect(detectNonArticle("https://allrecipes.com/recipe/apple-pie")).toBe("a recipe page");
  });
  it("returns 'a recipe page' for /recipes/ path", () => {
    expect(detectNonArticle("https://seriouseats.com/recipes/pasta")).toBe("a recipe page");
  });
  it("returns 'a recipe page' for cooking.nytimes.com regardless of path", () => {
    expect(detectNonArticle("https://cooking.nytimes.com/guides/1-how-to-cook-pasta")).toBe("a recipe page");
  });
});

describe("detectNonArticle — homepages", () => {
  it("returns 'a homepage' for bare domain with trailing slash", () => {
    expect(detectNonArticle("https://cnn.com/")).toBe("a homepage");
  });
  it("returns 'a homepage' for bare domain without trailing slash", () => {
    expect(detectNonArticle("https://bbc.com")).toBe("a homepage");
  });
});

describe("detectNonArticle — regular articles", () => {
  it("returns null for a news article URL", () => {
    expect(detectNonArticle("https://nytimes.com/2024/01/01/us/politics/story.html")).toBeNull();
  });
  it("returns null for an article with a slug", () => {
    expect(detectNonArticle("https://bbc.com/news/world-us-canada-12345")).toBeNull();
  });
  it("returns null for a malformed URL", () => {
    expect(detectNonArticle("not-a-url")).toBeNull();
  });
});
