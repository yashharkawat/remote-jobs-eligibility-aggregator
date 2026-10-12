// Keyword filters applied before the eligibility check.

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Turns a user keyword into a matcher for lower-cased text.
 *
 * A keyword has to start and end on a word edge, so "java" no longer matches "javascript" and "go" no longer
 * matches "google" or "ongoing". Three endings are still accepted, because job titles write them every day:
 * a plural "s" ("developer" -> "developers") and the "js" / ".js" suffix ("react" -> "reactjs", "react.js").
 * Keywords that end in a symbol ("c++", "c#", ".net") only need the edge at the start.
 */
export function keywordMatcher(keyword) {
    const k = String(keyword || '').toLowerCase().trim();
    if (!k) return () => false;
    const start = /^[a-z0-9]/.test(k) ? '(^|[^a-z0-9])' : '';
    // "+" and "#" also end the match early, so "c" does not match "c++" or "c#".
    const end = /[a-z0-9]$/.test(k) ? '(?:\\.?js|s)?(?![a-z0-9+#])' : '';
    const re = new RegExp(`${start}${esc(k).replace(/\s+/g, '[\\s-]*')}${end}`);
    return (text) => re.test(text);
}

/** True when `text` (already lower-cased) contains at least one of the keywords as a whole word. */
export function matchesAny(text, matchers) {
    return matchers.some((m) => m(text));
}
