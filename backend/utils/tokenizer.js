// backend/utils/tokenizer.js
// Lightweight token estimation utilities for budgeting prompts
// Note: This is an approximation suitable for budgeting and logging.

/**
 * Estimate tokens for a given string.
 * Heuristic: ~4 characters per token in English on average.
 * Falls back to word-based estimate for non-Latin scripts.
 */
export function estimateTokens(text = "") {
  if (!text) return 0;
  // Normalize whitespace
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (!normalized) return 0;
  // If contains many non-latin characters, use word-ish estimate
  const nonLatinRatio = (normalized.match(/[^\x00-\x7F]/g) || []).length / normalized.length;
  if (nonLatinRatio > 0.3) {
    const words = normalized.split(/\s+/g).length;
    return Math.max(1, Math.round(words * 1.3));
  }
  // Char-based heuristic
  return Math.max(1, Math.round(normalized.length / 4));
}

/**
 * Truncate a text to fit within a token limit, returning the truncated text.
 */
export function truncateTextToTokens(text = "", maxTokens = 1000) {
  if (estimateTokens(text) <= maxTokens) return text;
  // Binary search approximate cutoff by chars
  let low = 0;
  let high = text.length;
  let best = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const slice = text.slice(0, mid);
    const tokens = estimateTokens(slice);
    if (tokens <= maxTokens) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const clipped = text.slice(0, best);
  // Append ellipsis to indicate truncation
  return clipped.endsWith("…") ? clipped : clipped + " …";
}

/**
 * Truncate an array of strings from the oldest to newest to fit a token budget.
 * Returns { items, usedTokens } with the newest items preserved as much as possible.
 */
export function truncateArrayToBudget(items = [], maxTokens = 1000) {
  // Keep most recent items: iterate from end backwards
  const kept = [];
  let used = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i] ?? "";
    const t = estimateTokens(item);
    if (used + t > maxTokens) break;
    kept.push(item);
    used += t;
  }
  kept.reverse();
  return { items: kept, usedTokens: used };
}
