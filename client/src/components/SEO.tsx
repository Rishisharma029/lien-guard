import { useEffect } from "react";

export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  noindex?: boolean;
}

const DEFAULT_IMAGE = "/og-image.png";
const SITE_NAME = "LienGuard";
const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://lienguard.org";

function setMetaTag(name: string, content: string, isProperty = false) {
  const attr = isProperty ? "property" : "name";
  let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attr, name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function setCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

export function SEO({
  title,
  description,
  canonical,
  ogType = "website",
  ogImage = DEFAULT_IMAGE,
  noindex = false,
}: SEOProps) {
  useEffect(() => {
    // 1. Title
    const formattedTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = formattedTitle;

    // 2. Standard Meta
    setMetaTag("description", description);
    setMetaTag("robots", noindex ? "noindex, nofollow" : "index, follow");

    // 3. Open Graph
    const currentUrl = canonical || (typeof window !== "undefined" ? window.location.href : BASE_URL);
    const fullImageUrl = ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`;

    setMetaTag("og:title", formattedTitle, true);
    setMetaTag("og:description", description, true);
    setMetaTag("og:type", ogType, true);
    setMetaTag("og:url", currentUrl, true);
    setMetaTag("og:image", fullImageUrl, true);
    setMetaTag("og:site_name", SITE_NAME, true);

    // 4. Twitter Card
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", formattedTitle);
    setMetaTag("twitter:description", description);
    setMetaTag("twitter:image", fullImageUrl);

    // 5. Canonical Link
    setCanonical(currentUrl);
  }, [title, description, canonical, ogType, ogImage, noindex]);

  return null;
}
