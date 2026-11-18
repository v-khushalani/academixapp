export const SITE_URL = "https://academix.website";

function pageUrl(path: string) {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  return `${SITE_URL}${clean}`;
}

/**
 * Canonical address for a public page. Spread into head():
 *   head: () => ({ ...siteMeta("/pricing"), meta: [...] })
 * The app is also reachable on the lovable.app host, so every public page
 * declares academix.website as the preferred address.
 */
export function siteMeta(path: string) {
  return { links: [{ rel: "canonical", href: pageUrl(path) }] };
}

/**
 * Social-share URL for a public page. Spread into the head meta array:
 *   meta: [...ogUrl("/pricing"), { title: "..." }]
 */
export function ogUrl(path: string) {
  return [{ property: "og:url", content: pageUrl(path) }];
}

/** Pages that must never show up in search results. */
export const NOINDEX = [{ name: "robots", content: "noindex" }];
