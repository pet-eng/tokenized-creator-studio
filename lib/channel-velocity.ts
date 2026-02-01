import { EpisodeData } from './dashboard-data';

export interface VelocityEpisode {
  title: string;
  youtubeViews: number;
  daysLive: number;
  viewsPerDay: number;
  performanceLabel: 'hot' | 'average' | 'underperforming';
}

export interface ChannelVelocityData {
  recentEpisodes: VelocityEpisode[];
  averageVelocity: number;
  hotEpisodes: VelocityEpisode[];
  coldEpisodes: VelocityEpisode[];
}

function cleanTitle(title: string): string {
  return title
    .replace(/^\d+\.\s*/, '')
    .replace(/^Ep\.?\s*\d+:?\s*/i, '')
    .trim();
}

export function deriveChannelVelocity(episodes: EpisodeData[]): ChannelVelocityData | null {
  const now = Date.now();

  const withYouTube: VelocityEpisode[] = episodes
    .filter((ep) => ep.youtube_views > 0 && ep.published_at)
    .map((ep) => {
      const publishedMs = new Date(ep.published_at).getTime();
      const daysLive = Math.max(1, Math.floor((now - publishedMs) / (1000 * 60 * 60 * 24)));
      const viewsPerDay = Math.round((ep.youtube_views / daysLive) * 10) / 10;
      return {
        title: cleanTitle(ep.title),
        youtubeViews: ep.youtube_views,
        daysLive,
        viewsPerDay,
        performanceLabel: 'average' as VelocityEpisode['performanceLabel'],
      };
    });

  // Take the 10 most recent episodes (smallest daysLive)
  const recent = withYouTube
    .sort((a, b) => a.daysLive - b.daysLive)
    .slice(0, 10);

  if (recent.length === 0) return null;

  const avgVelocity =
    Math.round((recent.reduce((sum, ep) => sum + ep.viewsPerDay, 0) / recent.length) * 10) / 10;

  // Label each episode relative to average
  recent.forEach((ep) => {
    if (ep.viewsPerDay > avgVelocity * 1.3) {
      ep.performanceLabel = 'hot';
    } else if (ep.viewsPerDay < avgVelocity * 0.7) {
      ep.performanceLabel = 'underperforming';
    }
  });

  // Sort by velocity descending
  const sorted = recent.sort((a, b) => b.viewsPerDay - a.viewsPerDay);

  return {
    recentEpisodes: sorted,
    averageVelocity: avgVelocity,
    hotEpisodes: sorted.filter((ep) => ep.performanceLabel === 'hot'),
    coldEpisodes: sorted.filter((ep) => ep.performanceLabel === 'underperforming'),
  };
}
