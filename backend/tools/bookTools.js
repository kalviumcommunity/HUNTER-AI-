// backend/tools/bookTools.js
import axios from "axios";

/**
 * Fetches book metadata from Google Books API
 * Input: { title: string, author?: string }
 * Output: { title, authors, description, categories, isbn10, isbn13, thumbnail }
 */
export async function searchBookMetadata({ title, author }) {
  if (!title) throw new Error("title required");
  const q = [
    `intitle:${title}`,
    author ? `inauthor:${author}` : null,
  ].filter(Boolean).join("+");
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5`;

  const { data } = await axios.get(url, { timeout: 8000 });
  if (!data.items?.length) return { matches: [] };

  const matches = data.items.map((it) => {
    const v = it.volumeInfo || {};
    const isbns = (v.industryIdentifiers || []).reduce((acc, id) => {
      if (id.type === "ISBN_10") acc.isbn10 = id.identifier;
      if (id.type === "ISBN_13") acc.isbn13 = id.identifier;
      return acc;
    }, {});
    return {
      title: v.title,
      authors: v.authors || [],
      description: v.description || "",
      categories: v.categories || [],
      thumbnail: v.imageLinks?.thumbnail || "",
      ...isbns,
    };
  });

  return { matches };
}

/**
 * Uses Serper.dev (Google Search API) to find buy links.
 * Input: { title: string, author?: string, marketplaces?: string[], maxResults?: number }
 * Output: [{marketplace, link, title, snippet}]
 */
export async function findBuyLinks({ title, author, marketplaces = ["amazon", "flipkart"], maxResults = 3 }) {
  if (!process.env.SERPER_API_KEY) {
    return { links: [], note: "SERPER_API_KEY missing; cannot search web." };
  }
  const siteQueries = {
    amazon: "site:amazon.in",
    flipkart: "site:flipkart.com",
  };

  const queries = marketplaces
    .filter((m) => siteQueries[m])
    .map((m) => ({
      marketplace: m,
      q: `${siteQueries[m]} "${title}" ${author ? `"${author}"` : ""} book`,
    }));

  const results = [];
  for (const { marketplace, q } of queries) {
    try {
      const { data } = await axios.post(
        "https://google.serper.dev/search",
        { q, gl: "in" },
        { headers: { "X-API-KEY": process.env.SERPER_API_KEY, "Content-Type": "application/json" }, timeout: 8000 }
      );
      const organic = data.organic || [];
      for (const item of organic.slice(0, maxResults)) {
        results.push({
          marketplace,
          link: item.link,
          title: item.title,
          snippet: item.snippet,
        });
      }
    } catch (e) {
      // swallow per-marketplace errors; continue
    }
  }
  return { links: results };
}

/**
 * (Demo) Save a book to a reading list (in-memory or file-based)
 * Input: { title, author, reason }
 */
const readingList = [];
export async function saveToReadingList({ title, author, reason }) {
  if (!title) throw new Error("title required");
  readingList.push({ title, author, reason, savedAt: new Date().toISOString() });
  return { ok: true, count: readingList.length };
}
