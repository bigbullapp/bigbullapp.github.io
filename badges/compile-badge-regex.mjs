/**
 * Compiles a Nuvio badge pattern into a JavaScript RegExp.
 * Supports ES2025 inline modifiers `(?i:...)` as well as legacy leading `(?i)`
 * patterns for older JS runtimes (e.g., Hermes / pre-ES2025 engines).
 *
 * @param {string} pattern
 * @returns {RegExp}
 */
/** Rewrites `(?i:...)` / `(?i)` inline modifiers into ES2018-compatible RegExp source. */
function rewriteInlineFlags(pattern) {
  let out = pattern.startsWith("(?i)") ? pattern.slice(4) : pattern;
  let i = 0;
  let res = "";
  let inClass = false;
  while (i < out.length) {
    const ch = out[i];
    if (ch === "\\" && i + 1 < out.length) {
      res += out.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (ch === "[") inClass = true;
    else if (ch === "]" && inClass) inClass = false;
    if (!inClass && out.startsWith("(?i:", i)) {
      res += "(?:";
      i += 4;
      continue;
    }
    res += ch;
    i += 1;
  }
  return res;
}

export function compileBadgePattern(pattern) {
  if (typeof pattern !== "string" || !pattern) {
    throw new TypeError("Badge pattern must be a non-empty string");
  }
  try {
    return new RegExp(pattern, "u");
  } catch {
    return new RegExp(rewriteInlineFlags(pattern), "iu");
  }
}
