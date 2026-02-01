const DASHBOARD_API_URL =
  process.env.DASHBOARD_API_URL ||
  'https://tokenized-dashboard.vercel.app/api/downloads';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface EpisodeData {
  title: string;
  number: number | null;
  published_at: string;
  simplecast_downloads: number;
  youtube_views: number;
  x_views: number;
  total_reach: number;
}

interface CacheEntry {
  data: EpisodeData[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

function detectPatterns(title: string): string[] {
  const patterns: string[] = [];

  if (/\bFt\.?\b|Featuring/i.test(title)) patterns.push('guest');
  if (/\?$/.test(title.trim())) patterns.push('question');
  if (/\$[\d,.]+|[\d,]+\s*(Trillion|Billion|Million|bn|tn|M\b|B\b|T\b)/i.test(title) || /\d{2,}/.test(title)) patterns.push('number');
  if (/^(Stablecoin Stories|Stablecoin Stats|Agentic Commerce):/i.test(title)) patterns.push('series');

  const companies = ['BlackRock', 'Stripe', 'Circle', 'Visa', 'Robinhood', 'PayPal', 'DTCC', 'NYSE', 'JPMorgan', 'JP Morgan', 'Fiserv', 'Meta', 'Shopify', 'Klarna', 'Ripple', 'MoneyGram', 'Cash App', 'Worldpay', 'Chainlink', 'LayerZero', 'Bridge', 'Mesh', 'zerohash', 'Hidden Road', 'Privy', 'Conduit', 'dLocal', 'BVNK'];
  if (companies.some(c => title.toLowerCase().includes(c.toLowerCase()))) patterns.push('company');

  if (patterns.length === 0) patterns.push('hook');
  return patterns;
}

export function analyzePerformanceData(episodes: EpisodeData[]) {
  const sorted = [...episodes]
    .filter(ep => ep.total_reach > 0)
    .sort((a, b) => b.total_reach - a.total_reach);

  const top20 = sorted.slice(0, 20).map(ep => ({
    title: cleanTitle(ep.title),
    total_reach: ep.total_reach,
    simplecast: ep.simplecast_downloads,
    youtube: ep.youtube_views,
    x: ep.x_views,
    patterns: detectPatterns(ep.title),
  }));

  // Bottom performers (only from episodes with some reach to avoid noise)
  const withReach = sorted.filter(ep => ep.total_reach >= 100);
  const bottom5 = withReach.slice(-5).map(ep => ({
    title: cleanTitle(ep.title),
    total_reach: ep.total_reach,
  }));

  // Top by platform
  const topYouTube = [...episodes]
    .filter(ep => ep.youtube_views > 0)
    .sort((a, b) => b.youtube_views - a.youtube_views)
    .slice(0, 5)
    .map(ep => ({ title: cleanTitle(ep.title), views: ep.youtube_views }));

  const topX = [...episodes]
    .filter(ep => ep.x_views > 0)
    .sort((a, b) => b.x_views - a.x_views)
    .slice(0, 5)
    .map(ep => ({ title: cleanTitle(ep.title), views: ep.x_views }));

  return { top20, bottom5, topYouTube, topX };
}

function cleanTitle(title: string): string {
  // Remove episode number prefixes like "44." or "Ep. 53:"
  return title
    .replace(/^\d+\.\s*/, '')
    .replace(/^Ep\.?\s*\d+:?\s*/i, '')
    .trim();
}

export async function getPerformanceData(): Promise<EpisodeData[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const res = await fetch(DASHBOARD_API_URL, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Dashboard API returned ${res.status}`);

    const json = await res.json();
    const episodes: EpisodeData[] = (json.combined_episodes || []).map((ep: Record<string, unknown>) => ({
      title: ep.title as string,
      number: ep.number as number | null,
      published_at: ep.published_at as string,
      simplecast_downloads: (ep.simplecast_downloads as number) || 0,
      youtube_views: (ep.youtube_views as number) || 0,
      x_views: (ep.x_views as number) || 0,
      total_reach: (ep.total_reach as number) || 0,
    }));

    console.log(`[Dashboard] Fetched ${episodes.length} episodes for title generation`);
    cache = { data: episodes, fetchedAt: Date.now() };
    return episodes;
  } catch (err) {
    console.error('[Dashboard] Failed to fetch, using fallback data:', err);
    return FALLBACK_DATA;
  }
}

// Hardcoded snapshot of top performers so title gen works even if the dashboard is down
const FALLBACK_DATA: EpisodeData[] = [
  { title: "Ripple USD, Stablecoins & Custody", number: 20, published_at: "2025-03-03", simplecast_downloads: 1474, youtube_views: 1830, x_views: 103000, total_reach: 106304 },
  { title: "Stablecoin Chains - The Future of Payments? Ft. Chainlink CEO Sergey Nazarov", number: 44, published_at: "2025-08-18", simplecast_downloads: 1222, youtube_views: 2731, x_views: 13774, total_reach: 17727 },
  { title: "The $300 Trillion Dollar Whoopsie", number: 53, published_at: "2025-10-20", simplecast_downloads: 1469, youtube_views: 302, x_views: 5941, total_reach: 7712 },
  { title: "Every Bank Should Tokenize Deposits", number: 46, published_at: "2025-09-01", simplecast_downloads: 2058, youtube_views: 985, x_views: 3580, total_reach: 6623 },
  { title: "BlackRock Want to Tokenize Everything", number: 49, published_at: "2025-09-22", simplecast_downloads: 2171, youtube_views: 505, x_views: 3121, total_reach: 5797 },
  { title: "Why Does Meta Want a Stablecoin?", number: 31, published_at: "2025-05-19", simplecast_downloads: 1140, youtube_views: 0, x_views: 6748, total_reach: 7888 },
  { title: "The Agentic Stablecoin Bank", number: 32, published_at: "2025-05-26", simplecast_downloads: 827, youtube_views: 0, x_views: 5835, total_reach: 6662 },
  { title: "The Stablecoin Playbook for TradFi", number: 45, published_at: "2025-08-25", simplecast_downloads: 1263, youtube_views: 1100, x_views: 2118, total_reach: 4481 },
  { title: "Stablecoins vs. Tokenized Deposits — What Do Banks Want?", number: null, published_at: "2025-10-01", simplecast_downloads: 0, youtube_views: 0, x_views: 3596, total_reach: 3596 },
  { title: "13,000 Banks Get Stablecoin Access", number: 42, published_at: "2025-07-21", simplecast_downloads: 1371, youtube_views: 1204, x_views: 821, total_reach: 3396 },
  { title: "Circle's IPO Filing - The Best Stablecoin Data Drop Ever", number: 25, published_at: "2025-04-14", simplecast_downloads: 1375, youtube_views: 0, x_views: 3245, total_reach: 4620 },
  { title: "Should Banks Fear Stripe Stablecoin Accounts?", number: 30, published_at: "2025-05-12", simplecast_downloads: 1392, youtube_views: 0, x_views: 1495, total_reach: 2887 },
  { title: "2026 Predictions: Stablecoins, Tokenization and RWAs", number: 64, published_at: "2025-12-16", simplecast_downloads: 700, youtube_views: 300, x_views: 2874, total_reach: 3874 },
  { title: "Why Klarna's Stablecoin Is More Than PR", number: null, published_at: "2025-11-01", simplecast_downloads: 0, youtube_views: 0, x_views: 2130, total_reach: 2130 },
  { title: "Banks Are Waking Up to the Stablecoin Threat", number: 65, published_at: "2025-12-23", simplecast_downloads: 600, youtube_views: 200, x_views: 2068, total_reach: 2868 },
  { title: "DTCC Readies $100Tn of Stocks to Go Onchain", number: null, published_at: "2025-11-15", simplecast_downloads: 0, youtube_views: 0, x_views: 2048, total_reach: 2048 },
  { title: "NYSE Tokenizes Markets to Go 24/7", number: 67, published_at: "2026-01-06", simplecast_downloads: 500, youtube_views: 150, x_views: 1256, total_reach: 1906 },
  { title: "Banks Are All in on Tokenized Deposits", number: null, published_at: "2025-11-10", simplecast_downloads: 0, youtube_views: 0, x_views: 1784, total_reach: 1784 },
  { title: "Visa's $1.7 Trillion Network Adds Stablecoin Infrastructure", number: 66, published_at: "2025-12-30", simplecast_downloads: 550, youtube_views: 180, x_views: 1500, total_reach: 2230 },
  { title: "The $2 Trillion Stablecoin Opportunity", number: 27, published_at: "2025-04-28", simplecast_downloads: 1377, youtube_views: 0, x_views: 1377, total_reach: 2754 },
];
