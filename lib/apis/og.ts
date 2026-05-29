export type OGMeta = {
  title: string | null;
  description: string | null;
  image: string | null;
};

const META_REGEX = /<meta\s+([^>]+)>/gi;
const ATTR_REGEX = /(\w+(?::\w+)?)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const TITLE_REGEX = /<title[^>]*>([^<]*)<\/title>/i;

const EMPTY: OGMeta = { title: null, description: null, image: null };

// Block loopback / private / link-local / cloud-metadata hosts to prevent SSRF
// (someone pasting http://169.254.169.254/... or http://localhost:8000 to probe
// internal services). We follow redirects manually and re-check every hop.
const BLOCKED_HOST =
  /^(localhost$|0\.0\.0\.0$|127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i;

function isSafeUrl(u: URL): boolean {
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOST.test(host)) return false;
  if (host === "metadata.google.internal") return false;
  return true;
}

/** fetch() with SSRF guards + manual redirect following (max 4 hops), so a
 *  public URL can't 302-bounce us into an internal address. */
async function safeFetch(rawUrl: string): Promise<Response | null> {
  let current = rawUrl;
  for (let hop = 0; hop < 4; hop++) {
    let u: URL;
    try { u = new URL(current); } catch { return null; }
    if (!isSafeUrl(u)) return null;
    let res: Response;
    try {
      res = await fetch(current, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DuoLevelingBot/1.0) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, current).toString(); // resolve relative redirects
      continue;
    }
    return res;
  }
  return null; // too many redirects
}

/** Fetches a URL's HTML and extracts OpenGraph/Twitter metadata. */
export async function fetchOG(url: string): Promise<OGMeta> {
  const res = await safeFetch(url);
  if (!res || !res.ok) return EMPTY;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return EMPTY;
  if (Number(res.headers.get("content-length") ?? 0) > 2_000_000) return EMPTY;

  // Read up to ~512KB; OG tags are always in the <head>.
  const reader = res.body?.getReader();
  if (!reader) return EMPTY;
  let html = "";
  const decoder = new TextDecoder();
  let bytes = 0;
  while (bytes < 512 * 1024) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value?.length ?? 0;
    html += decoder.decode(value, { stream: true });
    if (html.includes("</head>")) break;
  }
  try { reader.cancel(); } catch {}

  const tags: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = META_REGEX.exec(html))) {
    const attrs: Record<string, string> = {};
    let a: RegExpExecArray | null;
    const inner = m[1];
    ATTR_REGEX.lastIndex = 0;
    while ((a = ATTR_REGEX.exec(inner))) {
      attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? "";
    }
    const key = (attrs.property || attrs.name)?.toLowerCase();
    const content = attrs.content;
    if (key && content) tags[key] = content;
  }

  const titleMatch = TITLE_REGEX.exec(html);
  const fallbackTitle = titleMatch?.[1]?.trim() ?? null;

  return {
    title: tags["og:title"] ?? tags["twitter:title"] ?? fallbackTitle,
    description: tags["og:description"] ?? tags["twitter:description"] ?? tags["description"] ?? null,
    image: tags["og:image"] ?? tags["twitter:image"] ?? null,
  };
}
