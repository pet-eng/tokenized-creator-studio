/* eslint-disable @typescript-eslint/no-require-imports */
const googleTrends = require('google-trends-api');

export interface TrendingQuery {
  query: string;
  value: number;
  type: 'top' | 'rising';
}

export interface GoogleTrendsData {
  queries: TrendingQuery[];
  fetchedAt: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  data: GoogleTrendsData;
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

const KEYWORDS = ['stablecoins', 'tokenization', 'crypto payments', 'USDC'];

export async function getGoogleTrends(): Promise<GoogleTrendsData | null> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const raw = await googleTrends.relatedQueries({
      keyword: KEYWORDS,
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      geo: 'US',
    });

    const parsed = JSON.parse(raw);
    const queries: TrendingQuery[] = [];

    if (parsed?.default?.rankedList) {
      parsed.default.rankedList.forEach(
        (list: { rankedKeyword?: { query: string; value: number }[] }, index: number) => {
          const type: 'top' | 'rising' = index % 2 === 0 ? 'top' : 'rising';
          const items = list.rankedKeyword || [];
          items.slice(0, 5).forEach((item) => {
            queries.push({ query: item.query, value: item.value, type });
          });
        },
      );
    }

    // Deduplicate
    const seen = new Set<string>();
    const deduped = queries.filter((q) => {
      const key = q.query.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const result: GoogleTrendsData = {
      queries: deduped.slice(0, 15),
      fetchedAt: new Date().toISOString(),
    };

    cache = { data: result, fetchedAt: Date.now() };
    console.log(`[GoogleTrends] Fetched ${result.queries.length} trending queries`);
    return result;
  } catch (err) {
    console.error('[GoogleTrends] Failed to fetch:', err);
    return null;
  }
}
