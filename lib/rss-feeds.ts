import Parser from 'rss-parser';

export interface RSSHeadline {
  title: string;
  source: string;
  pubDate: string;
  link: string;
}

export interface RSSFeedData {
  headlines: RSSHeadline[];
  fetchedAt: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  data: RSSFeedData;
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

const FEEDS = [
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://cointelegraph.com/rss', source: 'Cointelegraph' },
  { url: 'https://blockworks.co/feed/', source: 'Blockworks' },
  { url: 'https://decrypt.co/feed', source: 'Decrypt' },
];

const RELEVANCE_KEYWORDS = [
  'stablecoin', 'usdc', 'usdt', 'tether', 'circle', 'tokeniz', 'rwa',
  'payment', 'defi', 'tradfi', 'bank', 'visa', 'stripe', 'blackrock',
  'crypto', 'blockchain', 'cbdc', 'deposit', 'settlement', 'clearance',
  'regulation', 'genius act', 'mica', 'ripple', 'paypal', 'mastercard',
];

const parser = new Parser({ timeout: 10000 });

export async function getRSSHeadlines(): Promise<RSSFeedData | null> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const feedResults = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).slice(0, 20).map((item) => ({
          title: item.title || '',
          source: feed.source,
          pubDate: item.pubDate || item.isoDate || '',
          link: item.link || '',
        }));
      }),
    );

    const allHeadlines: RSSHeadline[] = [];
    feedResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allHeadlines.push(...result.value);
      } else {
        console.warn(`[RSS] Failed to fetch ${FEEDS[index].source}:`, result.reason);
      }
    });

    if (allHeadlines.length === 0) {
      console.warn('[RSS] No headlines from any feed');
      return null;
    }

    // Filter for relevance
    const relevant = allHeadlines.filter((h) => {
      const lower = h.title.toLowerCase();
      return RELEVANCE_KEYWORDS.some((kw) => lower.includes(kw));
    });

    // Sort by date (newest first) and cap at 15
    const sorted = relevant
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 15);

    const result: RSSFeedData = {
      headlines: sorted,
      fetchedAt: new Date().toISOString(),
    };

    cache = { data: result, fetchedAt: Date.now() };
    console.log(`[RSS] Fetched ${result.headlines.length} relevant headlines from ${FEEDS.length} feeds`);
    return result;
  } catch (err) {
    console.error('[RSS] Failed to fetch feeds:', err);
    return null;
  }
}
