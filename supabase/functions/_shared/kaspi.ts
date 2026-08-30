const KASPI_SHORT_HOSTS = new Set(["l.kaspi.kz", "m.kaspi.kz"]);

export function isKaspiUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;

    const isMain = host === "kaspi.kz" || host === "www.kaspi.kz";
    const isShort = KASPI_SHORT_HOSTS.has(host);
    if (!isMain && !isShort) return null;
    if (isShort && !u.pathname.includes("/shop/")) return null;

    return u;
  } catch {
    return null;
  }
}

function isKaspiProductUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    return (
      (host === "kaspi.kz" ||
        host === "www.kaspi.kz" ||
        KASPI_SHORT_HOSTS.has(host)) &&
      u.pathname.includes("/shop/")
    );
  } catch {
    return false;
  }
}

function isMainKaspiProductUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    return (
      (host === "kaspi.kz" || host === "www.kaspi.kz") &&
      u.pathname.includes("/shop/")
    );
  } catch {
    return false;
  }
}

function linkCanonical(html: string): string | null {
  const m = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  );
  if (m?.[1]) return decodeHtml(m[1].trim());
  const m2 = html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i
  );
  return m2?.[1] ? decodeHtml(m2[1].trim()) : null;
}

export function canonicalKaspiUrl(
  html: string,
  finalUrl: string,
  fallback: string
): string {
  const stripQuery = (url: string) => url.split("?")[0];
  const candidates = [
    metaContent(html, "og:url"),
    linkCanonical(html),
    finalUrl,
    fallback,
  ];

  for (const raw of candidates) {
    if (raw && isMainKaspiProductUrl(raw)) {
      return stripQuery(raw);
    }
  }
  for (const raw of candidates) {
    if (raw && isKaspiProductUrl(raw)) {
      return stripQuery(raw);
    }
  }
  return stripQuery(fallback);
}

function metaContent(html: string, prop: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtml(m[1].trim());
  }
  return null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function cleanTitle(raw: string): string {
  let t = decodeHtml(raw.trim());
  t = t.replace(/^Купить\s+/i, "");
  t = t.replace(/\s+в\s+[А-ЯЁа-яёA-Za-z\-]+\s*[–—\-]\s*Магазин на Kaspi\.kz\s*$/i, "");
  t = t.replace(/\s*[|\-–—]\s*Kaspi\.?kz?\s*$/i, "").trim();
  t = t.replace(/\s*[–—\-]\s*Магазин на Kaspi\.kz\s*$/i, "").trim();
  return t || raw.trim();
}

function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!m?.[1]) return null;
  return cleanTitle(m[1]) || null;
}

async function fetchHtml(
  url: string,
  timeoutMs = 15000
): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      },
    });
    if (res.ok) {
      return { html: await res.text(), finalUrl: res.url };
    }
    throw new Error(`HTTP_${res.status}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchViaJina(kaspiUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`https://r.jina.ai/${kaspiUrl}`, {
      signal: controller.signal,
      headers: {
        Accept: "text/html",
        "X-Return-Format": "html",
      },
    });
    if (!res.ok) {
      throw new Error(`Jina ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadKaspiHtml(
  kaspiUrl: string
): Promise<{ html: string; finalUrl: string }> {
  try {
    return await fetchHtml(kaspiUrl);
  } catch (err) {
    console.warn("direct Kaspi fetch failed, trying Jina", err);
    const html = await fetchViaJina(kaspiUrl);
    return { html, finalUrl: kaspiUrl };
  }
}

function fromJsonLd(html: string): {
  title?: string;
  image?: string;
  price?: number;
} {
  const out: { title?: string; image?: string; price?: number } = {};
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const list = node?.["@graph"]
          ? Array.isArray(node["@graph"])
            ? node["@graph"]
            : [node["@graph"]]
          : [node];
        for (const item of list) {
          const type = item?.["@type"];
          const types = Array.isArray(type) ? type : [type];
          if (!types.some((t: string) => String(t).toLowerCase() === "product")) {
            continue;
          }
          if (!out.title && item.name) out.title = String(item.name).trim();
          if (!out.image && item.image) {
            const img = item.image;
            if (typeof img === "string") out.image = img;
            else if (Array.isArray(img) && img[0]) {
              out.image =
                typeof img[0] === "string" ? img[0] : img[0]?.url || undefined;
            } else if (img?.url) out.image = String(img.url);
          }
          if (!out.price && item.offers) {
            const price = priceFromOffers(item.offers);
            if (price) out.price = price;
          }
        }
      }
    } catch {
      // ignore bad JSON-LD blocks
    }
  }
  return out;
}

function parsePriceValue(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = parseInt(String(raw).replace(/\s/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function priceFromOffers(offers: unknown): number | null {
  if (!offers) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  for (const offer of list) {
    if (!offer || typeof offer !== "object") continue;
    const type = (offer as Record<string, unknown>)["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (!types.some((t) => String(t).toLowerCase() === "offer")) continue;
    const currency = (offer as Record<string, unknown>).priceCurrency;
    if (currency && String(currency).toUpperCase() !== "KZT") continue;
    const price = parsePriceValue((offer as Record<string, unknown>).price);
    if (price) return price;
  }
  return null;
}

export function parseProduct(html: string): {
  title: string;
  image_url: string;
  price: number | null;
} {
  const ld = fromJsonLd(html);
  const rawTitle =
    metaContent(html, "og:title") ||
    ld.title ||
    titleTag(html) ||
    "";
  const title = rawTitle ? cleanTitle(rawTitle) : "";
  const image_url =
    metaContent(html, "og:image") ||
    metaContent(html, "twitter:image") ||
    ld.image ||
    "";
  const price =
    ld.price ??
    parsePriceValue(metaContent(html, "product:price:amount")) ??
    null;

  if (!title && !image_url) {
    throw new Error("Не удалось распознать название и картинку");
  }
  return { title, image_url, price };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
