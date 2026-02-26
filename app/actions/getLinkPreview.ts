"use server";

import * as cheerio from "cheerio";

export interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  url: string;
  siteName?: string;
}

export async function getLinkPreview(url: string): Promise<LinkPreviewData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      next: { revalidate: 3600 }, // Cache the preview for 1 hour
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text();

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content");

    const image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content");

    const siteName = $('meta[property="og:site_name"]').attr("content");

    // Don't return empty previews
    if (!title && !description && !image) return null;

    return { title, description, image, url, siteName };
  } catch (error) {
    console.error("Error fetching link preview for", url, error);
    return null;
  }
}
