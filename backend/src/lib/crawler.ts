import * as cheerio from "cheerio";
import type {
  ICrawledPage,
  IContactInfo,
} from "@/models/Site";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
const MAX_PAGES = 6;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_CHARS_PER_PAGE = 6000;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d[\d\s().-]{7,}\d)/g;
const SOCIAL_DOMAINS = [
  "twitter.com",
  "x.com",
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "github.com",
  "tiktok.com",
];

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    console.log("[crawler] URL:", url);
    console.log("[crawler] Status:", res.status);

    if (!res.ok) {
      console.log("[crawler] Failed with status:", res.status);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";

    console.log("[crawler] Content-Type:", contentType);

    if (!contentType.includes("text/html")) {
      console.log("[crawler] Not HTML content");
      return null;
    }

    return await res.text();
  } catch (error) {
    console.error("[crawler] Error:", error);
    return null;
  }
}

function normalizeUrl(base: string, href: string): string | null {
  try {
    const u = new URL(href, base);
    u.hash = "";
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function isLikelyContentPage(path: string): boolean {
  const skip = [
    ".pdf",
    ".jpg",
    ".png",
    ".svg",
    ".zip",
    ".css",
    ".js",
    "/wp-admin",
    "/cdn-cgi",
  ];
  return !skip.some((s) => path.toLowerCase().includes(s));
}

function extractPage(url: string, html: string, isHomepage: boolean): {
  page: ICrawledPage;
  internalLinks: string[];
} {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();

  const title = $("title").first().text().trim() || url;
  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(text);
  });

  const bodyText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS_PER_PAGE);

  const internalLinks: string[] = [];
  const allLinks: string[] = [];
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    /* noop */
  }

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const normalized = normalizeUrl(url, href);
    if (!normalized) return;
    allLinks.push(normalized);
    try {
      const linkHost = new URL(normalized).host;
      if (linkHost === host && isLikelyContentPage(normalized)) {
        internalLinks.push(normalized);
      }
    } catch {
      /* noop */
    }
  });

  return {
    page: {
      url,
      title,
      headings: headings.slice(0, 20),
      textContent: bodyText,
      links: Array.from(new Set(allLinks)).slice(0, 50),
      isHomepage,
    },
    internalLinks: Array.from(new Set(internalLinks)),
  };
}

function extractContactInfo(pages: ICrawledPage[]): IContactInfo {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const socialLinks = new Set<string>();

  for (const page of pages) {
    const emailMatches = page.textContent.match(EMAIL_REGEX) || [];
    emailMatches.forEach((e) => emails.add(e.toLowerCase()));

    const phoneMatches = page.textContent.match(PHONE_REGEX) || [];
    phoneMatches
      .filter((p) => p.replace(/\D/g, "").length >= 8)
      .forEach((p) => phones.add(p.trim()));

    for (const link of page.links) {
      if (SOCIAL_DOMAINS.some((d) => link.includes(d))) {
        socialLinks.add(link);
      }
    }
  }

  return {
    emails: Array.from(emails).slice(0, 5),
    phones: Array.from(phones).slice(0, 5),
    socialLinks: Array.from(socialLinks).slice(0, 8),
  };
}

function findPricingPage(pages: ICrawledPage[]): string | null {
  const pricingPage = pages.find(
    (p) =>
      /pricing|plans|subscription/i.test(p.url) ||
      /pricing|plans|subscription/i.test(p.title)
  );
  if (!pricingPage) return null;
  return pricingPage.textContent.slice(0, 2000);
}

function findFaqs(pages: ICrawledPage[]): { question: string; answer: string }[] {
  const faqPage = pages.find(
    (p) => /faq|help|support/i.test(p.url) || /faq|frequently asked/i.test(p.title)
  );
  if (!faqPage) return [];

  // Heuristic: split on question-mark-ended headings if we have them
  const faqs: { question: string; answer: string }[] = [];
  for (const heading of faqPage.headings) {
    if (heading.includes("?")) {
      faqs.push({ question: heading, answer: "" });
    }
  }
  return faqs.slice(0, 10);
}

export interface CrawlResult {
  pages: ICrawledPage[];
  contactInfo: IContactInfo;
  pricingText: string | null;
  faqs: { question: string; answer: string }[];
  rawHomepageHtml: string | null;
}

export async function crawlWebsite(startUrl: string): Promise<CrawlResult> {
  let normalizedStart = startUrl.trim();
  if (!/^https?:\/\//i.test(normalizedStart)) {
    normalizedStart = `https://${normalizedStart}`;
  }

  const visited = new Set<string>();
  const queue: { url: string; isHomepage: boolean }[] = [
    { url: normalizedStart, isHomepage: true },
  ];
  const pages: ICrawledPage[] = [];
  let rawHomepageHtml: string | null = null;

  // Priority paths we want to make sure get visited if linked
  const priorityHints = ["pricing", "faq", "about", "contact"];

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    // Prefer priority pages first
    queue.sort((a, b) => {
      const aPriority = priorityHints.some((h) => a.url.toLowerCase().includes(h));
      const bPriority = priorityHints.some((h) => b.url.toLowerCase().includes(h));
      return aPriority === bPriority ? 0 : aPriority ? -1 : 1;
    });

    const next = queue.shift();
    if (!next) break;
    if (visited.has(next.url)) continue;
    visited.add(next.url);

    const html = await fetchHtml(next.url);
    if (!html) continue;
    if (next.isHomepage) rawHomepageHtml = html;

    const { page, internalLinks } = extractPage(next.url, html, next.isHomepage);
    pages.push(page);

    for (const link of internalLinks) {
      if (!visited.has(link) && queue.length + pages.length < MAX_PAGES * 3) {
        queue.push({ url: link, isHomepage: false });
      }
    }
  }

  if (pages.length === 0) {
  console.error("[crawler] No pages crawled from:", normalizedStart);

  throw new Error(`Crawler failed for ${normalizedStart}`);
}

  const contactInfo = extractContactInfo(pages);
  const pricingText = findPricingPage(pages);
  const faqs = findFaqs(pages);

  return { pages, contactInfo, pricingText, faqs, rawHomepageHtml };
}
