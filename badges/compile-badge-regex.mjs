/**
 * Compiles a Nuvio badge pattern into a JavaScript RegExp.
 * Supports ES2025 inline modifiers `(?i:...)` as well as legacy leading `(?i)`
 * patterns for older JS runtimes (e.g., Hermes / pre-ES2025 engines).
 *
 * @param {string} pattern
 * @returns {RegExp}
 */
export function compileBadgePattern(pattern) {
  if (typeof pattern !== "string" || !pattern) {
    throw new TypeError("Badge pattern must be a non-empty string");
  }
  try {
    return new RegExp(pattern, "u");
  } catch {
    if (pattern.startsWith("(?i)")) {
      return new RegExp(pattern.slice(4), "iu");
    }
    const scopedMatch = /^\(\?i:([\s\S]+)\)$/.exec(pattern);
    if (scopedMatch) {
      return new RegExp(scopedMatch[1], "iu");
    }
    throw new SyntaxError(`Unsupported badge pattern for JS RegExp: ${pattern}`);
  }
}
