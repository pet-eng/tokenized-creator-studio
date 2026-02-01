import { EpisodeData, analyzePerformanceData } from './dashboard-data';
import { GoogleTrendsData } from './google-trends';
import { YouTubeCompetitorData } from './youtube-competitors';
import { RSSFeedData } from './rss-feeds';
import { ChannelVelocityData } from './channel-velocity';

// ---------------------------------------------------------------------------
// Enrichment data — all fields nullable (sources fail independently)
// ---------------------------------------------------------------------------

export interface EnrichmentData {
  googleTrends: GoogleTrendsData | null;
  youtubeCompetitors: YouTubeCompetitorData | null;
  rssHeadlines: RSSFeedData | null;
  channelVelocity: ChannelVelocityData | null;
}

// ---------------------------------------------------------------------------
// Title generation prompt — built dynamically from real performance data
// ---------------------------------------------------------------------------

function buildPerformanceSection(episodes: EpisodeData[]): string {
  const { top20, bottom5, topYouTube, topX } = analyzePerformanceData(episodes);

  const topLines = top20.map((ep, i) => {
    const patternStr = ep.patterns.join(', ');
    return `${i + 1}. "${ep.title}" — ${ep.total_reach.toLocaleString()} total reach (Podcast: ${ep.simplecast.toLocaleString()}, YouTube: ${ep.youtube.toLocaleString()}, X: ${ep.x.toLocaleString()}) [${patternStr}]`;
  }).join('\n');

  const bottomLines = bottom5.map(ep =>
    `- "${ep.title}" — only ${ep.total_reach.toLocaleString()} total reach`
  ).join('\n');

  const ytLines = topYouTube.map((ep, i) =>
    `${i + 1}. "${ep.title}" — ${ep.views.toLocaleString()} views`
  ).join('\n');

  const xLines = topX.map((ep, i) =>
    `${i + 1}. "${ep.title}" — ${ep.views.toLocaleString()} views`
  ).join('\n');

  return `## TOP 20 TITLES BY TOTAL REACH (real data from all platforms)
${topLines}

## WHAT TO AVOID (lowest performers)
These titles underperformed. Study them so you DON'T repeat their patterns:
${bottomLines}

## TOP TITLES BY PLATFORM
Titles that go viral on X are often different from what works on YouTube.

**Best on YouTube (long-form viewers):**
${ytLines}

**Best on X / Twitter (short attention, scroll-stopping):**
${xLines}`;
}

// ---------------------------------------------------------------------------
// Enrichment section builders
// ---------------------------------------------------------------------------

function buildGoogleTrendsSection(data: GoogleTrendsData): string {
  const topQueries = data.queries.filter(q => q.type === 'top');
  const risingQueries = data.queries.filter(q => q.type === 'rising');

  let section = `\n\n## SUPPLEMENTARY: What People Are Searching Right Now (Google Trends, ${data.fetchedAt.split('T')[0]})
Use these as secondary inspiration to align titles with current search demand — but only if they fit the episode content.\n`;

  if (topQueries.length > 0) {
    section += `\n**Top Related Searches:**\n`;
    section += topQueries.map(q => `- "${q.query}" (interest: ${q.value})`).join('\n');
  }
  if (risingQueries.length > 0) {
    section += `\n\n**Rising/Breakout Searches:**\n`;
    section += risingQueries.map(q => `- "${q.query}" (+${q.value}%)`).join('\n');
  }

  return section;
}

function buildCompetitorSection(data: YouTubeCompetitorData): string {
  let section = `\n\n## SUPPLEMENTARY: Competitor Titles Performing Now (YouTube, last 30 days)
For awareness only — see what framing is working in the broader space, but prioritize YOUR proven title patterns above.\n\n`;

  section += data.videos.map((v, i) =>
    `${i + 1}. "${v.title}" — ${v.viewCount.toLocaleString()} views (${v.channelTitle})`
  ).join('\n');

  return section;
}

function buildRSSSection(data: RSSFeedData): string {
  let section = `\n\n## SUPPLEMENTARY: Today's Crypto/Fintech Headlines
Reference these ONLY if they directly align with the episode content — a timely news hook can boost a title, but don't force it.\n\n`;

  section += data.headlines.map(h =>
    `- "${h.title}" (${h.source})`
  ).join('\n');

  return section;
}

function buildVelocitySection(data: ChannelVelocityData): string {
  let section = `\n\n## YOUR CHANNEL'S RECENT TITLE VELOCITY (views/day on YouTube)
Average: ${data.averageVelocity} views/day across recent episodes.\n`;

  if (data.hotEpisodes.length > 0) {
    section += `\n**Gaining traction fastest (model these):**\n`;
    section += data.hotEpisodes.map(ep =>
      `- "${ep.title}" — ${ep.viewsPerDay} views/day (${ep.youtubeViews.toLocaleString()} total, ${ep.daysLive}d live)`
    ).join('\n');
  }

  if (data.coldEpisodes.length > 0) {
    section += `\n\n**Underperforming (avoid these patterns):**\n`;
    section += data.coldEpisodes.map(ep =>
      `- "${ep.title}" — ${ep.viewsPerDay} views/day (${ep.youtubeViews.toLocaleString()} total, ${ep.daysLive}d live)`
    ).join('\n');
  }

  return section;
}

// ---------------------------------------------------------------------------
// Prompt constants
// ---------------------------------------------------------------------------

const BASE_PROMPT = `You are a YouTube title expert for "Tokenized" - a podcast about stablecoins, tokenization, and the future of payments. Your job is to generate compelling, click-worthy titles.

## CONTEXT
Tokenized is hosted by Simon Taylor (Head of Market Dev at Tempo, author of Fintech Brainfood) and co-hosted by Cuy Sheffield (former Head of Crypto at Visa). The audience is finance professionals, crypto enthusiasts, and fintech leaders interested in:
- Stablecoins (USDC, USDT, Tether, Circle, etc.)
- Tokenization of real-world assets (RWAs)
- Payments infrastructure
- DeFi meeting TradFi
- Regulatory developments (GENIUS Act, MiCA, etc.)

## PERFORMANCE DATA (PRIMARY — weight this most heavily)
Below is real performance data from the Tokenized podcast. These are actual view/download numbers across Podcast (Simplecast), YouTube, and X (Twitter). This is your PRIMARY reference — the title patterns that have proven to work with THIS specific audience matter most. External data (trends, competitors, headlines) is supplementary context only.

`;

const RULES = `
## RULES (derived from what the data shows works)
1. Keep titles under 60 characters when possible (YouTube truncates longer titles)
2. Use specific numbers — "$300 Trillion" and "13,000 Banks" massively outperform vague titles
3. Use power words: "Every", "All", "Must", "Secret", "War", "Fear", "Threat"
4. Questions that imply threat or major change perform well ("Should Banks Fear…?")
5. Guest names ONLY if recognizable (CEOs, founders of major companies)
6. Company names drive clicks — always include them when relevant (Stripe, Circle, BlackRock, Visa, etc.)
7. Avoid generic words: "interesting", "great", "amazing", "discusses", "explores"
8. Bold, declarative statements outperform neutral descriptions
9. Titles that create FOMO or imply viewers will miss critical industry shifts perform best
10. On X, shorter punchy titles with big claims perform best. On YouTube, specificity and authority win.

## SERIES FORMATS
If the episode is part of a series, use these exact formats:
- **Stablecoin Stories**: "Stablecoin Stories: [Company/Person Journey]"
- **Stablecoin Stats**: "Stablecoin Stats: [Data Insight]"
- **Agentic Commerce**: "Agentic Commerce: [AI + Payments Topic]"

## OUTPUT FORMAT
Generate 8-10 titles. For each title, provide:
1. The title text
2. Category tags (from: guest, company, number, question, hook, threat, series, future, news)
3. Brief reasoning (1 sentence explaining why this will perform, referencing a similar top-performing title from the data above when possible)

Format as JSON array:
[
  {
    "text": "Title here",
    "tags": ["tag1", "tag2"],
    "reasoning": "Why this works"
  }
]`;

// ---------------------------------------------------------------------------
// Main prompt builder
// ---------------------------------------------------------------------------

export function buildTitlePrompt(
  transcript: string,
  guest: string,
  episodeType: string,
  episodes: EpisodeData[],
  enrichment?: EnrichmentData,
): string {
  const performanceSection = buildPerformanceSection(episodes);

  // Build enrichment sections (only if data available)
  let enrichmentSections = '';
  if (enrichment?.googleTrends) {
    enrichmentSections += buildGoogleTrendsSection(enrichment.googleTrends);
  }
  if (enrichment?.youtubeCompetitors) {
    enrichmentSections += buildCompetitorSection(enrichment.youtubeCompetitors);
  }
  if (enrichment?.rssHeadlines) {
    enrichmentSections += buildRSSSection(enrichment.rssHeadlines);
  }
  if (enrichment?.channelVelocity) {
    enrichmentSections += buildVelocitySection(enrichment.channelVelocity);
  }

  let contextualInstructions = '';

  if (episodeType === 'stablecoin-stories') {
    contextualInstructions = `\n\nThis is a STABLECOIN STORIES episode - a series featuring company journeys and founder stories. At least 3 titles should use the "Stablecoin Stories:" prefix format.`;
  } else if (episodeType === 'stablecoin-stats') {
    contextualInstructions = `\n\nThis is a STABLECOIN STATS episode - a data-driven series. At least 3 titles should use the "Stablecoin Stats:" prefix format and reference specific metrics.`;
  } else if (episodeType === 'agentic-commerce') {
    contextualInstructions = `\n\nThis is an AGENTIC COMMERCE episode - a series about AI agents and payments. At least 3 titles should use the "Agentic Commerce:" prefix format.`;
  } else if (episodeType === 'predictions') {
    contextualInstructions = `\n\nThis is a PREDICTIONS episode. Include at least 2 titles with year predictions format (e.g., "2026 Predictions: ...")`;
  }

  const guestInstruction = guest
    ? `\n\nGUEST: ${guest}\nInclude the guest name in at least 2 titles, especially if they have a notable title (CEO, Founder, etc.)`
    : '\n\nNo guest for this episode - focus on topic-driven titles.';

  return `${BASE_PROMPT}${performanceSection}${enrichmentSections}${RULES}${contextualInstructions}${guestInstruction}

## EPISODE CONTENT
${transcript}

Generate titles now:`;
}

// ---------------------------------------------------------------------------
// Thumbnail prompt — unchanged
// ---------------------------------------------------------------------------

export const THUMBNAIL_GENERATION_PROMPT = `Create a YouTube thumbnail for the Tokenized podcast with these specifications:

BRAND STYLE:
- Dark blue gradient background (#0a1628 to #1e3a5f)
- "TOKENIZED" logo/text in top right corner (white text)
- Clean, professional fintech aesthetic
- High contrast text for readability

LAYOUT:
- 16:9 aspect ratio (1280x720 or 1920x1080)
- Main headline in bold white text, centered or left-aligned
- If featuring a company: include their logo prominently
- If featuring a guest: space for their photo on right side
- Sponsor bar at bottom (optional): "SPONSORED BY [Visa logo] | PRESENTED BY [BVNK logo]"
- Date badge in top left corner (format: "DD MMM")

TEXT STYLE:
- Headlines: Bold, uppercase, white
- Subtitles: Smaller, cyan (#00c8ff)
- Maximum 4-6 words for main headline
- Text should be readable at small sizes (mobile thumbnails)

VISUAL ELEMENTS:
- Subtle gradient overlay
- Occasional accent glow effects (cyan)
- Professional, not flashy or "crypto bro" aesthetic
- Think Bloomberg/Financial Times meets modern tech`;

export function buildThumbnailPrompt(headline: string, subtext: string, company?: string, hasGuest?: boolean): string {
  let specific = THUMBNAIL_GENERATION_PROMPT;

  specific += `\n\nSPECIFIC REQUIREMENTS FOR THIS THUMBNAIL:`;
  specific += `\n- Main headline: "${headline}"`;

  if (subtext) {
    specific += `\n- Subtext: "${subtext}"`;
  }

  if (company) {
    specific += `\n- Feature the ${company} logo prominently`;
  }

  if (hasGuest) {
    specific += `\n- Leave space on the right side for a guest photo cutout`;
  }

  specific += `\n\nCreate a professional, eye-catching thumbnail that matches the Tokenized brand.`;

  return specific;
}
