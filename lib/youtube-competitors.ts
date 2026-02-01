export interface CompetitorVideo {
  title: string;
  channelTitle: string;
  viewCount: number;
  publishedAt: string;
  videoId: string;
}

export interface YouTubeCompetitorData {
  videos: CompetitorVideo[];
  fetchedAt: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: YouTubeCompetitorData;
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

const SEARCH_QUERIES = [
  'stablecoins explained',
  'tokenization finance',
  'crypto payments 2026',
  'USDC USDT stablecoin',
  'real world assets tokenization',
];

const OWN_CHANNEL_ID = 'UC8SaXHFAqVHUjE2OLUFakjw';

export async function getYouTubeCompetitors(): Promise<YouTubeCompetitorData | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[YouTubeCompetitors] YOUTUBE_API_KEY not set, skipping');
    return null;
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    // Pick 2 random queries to stay within quota
    const selectedQueries = [...SEARCH_QUERIES]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    const allVideos: CompetitorVideo[] = [];

    for (const query of selectedQueries) {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'viewCount',
        maxResults: '10',
        publishedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        relevanceLanguage: 'en',
        key: apiKey,
      });

      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
      );
      if (!searchRes.ok) throw new Error(`YouTube search returned ${searchRes.status}`);
      const searchData = await searchRes.json();

      const items = (searchData.items || []) as {
        id?: { videoId?: string };
        snippet?: { title?: string; channelTitle?: string; publishedAt?: string; channelId?: string };
      }[];

      // Filter out own channel
      const otherChannelItems = items.filter(
        (item) => item.snippet?.channelId !== OWN_CHANNEL_ID,
      );

      const videoIds = otherChannelItems
        .map((item) => item.id?.videoId)
        .filter(Boolean) as string[];

      if (videoIds.length === 0) continue;

      // Get actual view counts
      const statsParams = new URLSearchParams({
        part: 'statistics',
        id: videoIds.join(','),
        key: apiKey,
      });

      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${statsParams}`,
      );
      if (!statsRes.ok) throw new Error(`YouTube videos returned ${statsRes.status}`);
      const statsData = await statsRes.json();

      const viewMap = new Map<string, number>();
      ((statsData.items || []) as { id: string; statistics?: { viewCount?: string } }[]).forEach(
        (item) => {
          viewMap.set(item.id, parseInt(item.statistics?.viewCount || '0', 10));
        },
      );

      otherChannelItems.forEach((item) => {
        const videoId = item.id?.videoId;
        if (!videoId) return;
        allVideos.push({
          title: item.snippet?.title || '',
          channelTitle: item.snippet?.channelTitle || '',
          viewCount: viewMap.get(videoId) || 0,
          publishedAt: item.snippet?.publishedAt || '',
          videoId,
        });
      });
    }

    const sorted = allVideos
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10);

    const result: YouTubeCompetitorData = {
      videos: sorted,
      fetchedAt: new Date().toISOString(),
    };

    cache = { data: result, fetchedAt: Date.now() };
    console.log(`[YouTubeCompetitors] Fetched ${result.videos.length} competitor videos`);
    return result;
  } catch (err) {
    console.error('[YouTubeCompetitors] Failed to fetch:', err);
    return null;
  }
}
