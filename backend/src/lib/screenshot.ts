import type { IScreenshot } from "@/models/Site";

/**
 * Uses thum.io's free screenshot service (no API key required for low volume).
 * For production-scale or higher-fidelity captures, swap this for a self-hosted
 * Playwright service — see README "Upgrading screenshots" section.
 */
const THUMIO_BASE = "https://image.thum.io/get";

async function fetchScreenshotAsDataUrl(
  url: string,
  viewport: "desktop" | "mobile"
): Promise<string | null> {
  const widthParam = viewport === "mobile" ? "width/480" : "width/1440";
  const thumioUrl = `${THUMIO_BASE}/${widthParam}/noanimate/${url}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const res = await fetch(thumioUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.warn(`[screenshot] Failed to capture ${viewport} screenshot for ${url}:`, err);
    return null;
  }
}

export async function captureScreenshots(url: string): Promise<IScreenshot[]> {
  const [desktopDataUrl, mobileDataUrl] = await Promise.all([
    fetchScreenshotAsDataUrl(url, "desktop"),
    fetchScreenshotAsDataUrl(url, "mobile"),
  ]);

  const screenshots: IScreenshot[] = [];
  if (desktopDataUrl) {
    screenshots.push({
      label: "homepage-desktop",
      dataUrl: desktopDataUrl,
      viewport: "desktop",
    });
  }
  if (mobileDataUrl) {
    screenshots.push({
      label: "homepage-mobile",
      dataUrl: mobileDataUrl,
      viewport: "mobile",
    });
  }
  return screenshots;
}
