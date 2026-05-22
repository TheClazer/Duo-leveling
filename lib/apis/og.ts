export type OGMeta = {
  title: string | null;
  description: string | null;
  image: string | null;
};

const META_REGEX = /<meta\s+([^>]+)>/gi;
const ATTR_REGEX = /(\w+(?::\w+)?)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const TITLE_REGEX = /<title[^>]*>([^<]*)<\/title>/i;

/** Fetches a URL's HTML and extracts OpenGraph/Twitter metadata. */
export async function fetchOG(url: string): Promise<OGMeta> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DuoLevelingBot/1.0) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      // small timeout so a slow page doesn't hang the request
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { title: null, description: null, image: null };
  }
  if (!res.ok) return { title: null, description: null, image: null };
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
    return { title: null, description: null, image: null };
  }
  // Read up to ~512KB; OG tags are always in the head
  const reader = res.body?.getReader();
  if (!reader) return { title: null, description: null, image: null };
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
