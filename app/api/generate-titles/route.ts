import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildTitlePrompt } from '@/lib/prompts';
import { getPerformanceData } from '@/lib/dashboard-data';
import { getGoogleTrends } from '@/lib/google-trends';
import { getYouTubeCompetitors } from '@/lib/youtube-competitors';
import { getRSSHeadlines } from '@/lib/rss-feeds';
import { deriveChannelVelocity } from '@/lib/channel-velocity';
import type { EnrichmentData } from '@/lib/prompts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { transcript, guest, episodeType } = await request.json();

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Fetch all data sources in parallel — each fails independently
    const [episodesResult, trendsResult, competitorsResult, rssResult] =
      await Promise.allSettled([
        getPerformanceData(),
        getGoogleTrends(),
        getYouTubeCompetitors(),
        getRSSHeadlines(),
      ]);

    const episodes =
      episodesResult.status === 'fulfilled' ? episodesResult.value : [];
    const googleTrends =
      trendsResult.status === 'fulfilled' ? trendsResult.value : null;
    const youtubeCompetitors =
      competitorsResult.status === 'fulfilled' ? competitorsResult.value : null;
    const rssHeadlines =
      rssResult.status === 'fulfilled' ? rssResult.value : null;

    // Derive velocity metrics from the episode data (no extra fetch)
    const channelVelocity =
      episodes.length > 0 ? deriveChannelVelocity(episodes) : null;

    const enrichment: EnrichmentData = {
      googleTrends,
      youtubeCompetitors,
      rssHeadlines,
      channelVelocity,
    };

    // Log which sources succeeded
    const sources = [
      `episodes: ${episodes.length}`,
      `trends: ${googleTrends ? googleTrends.queries.length + ' queries' : 'unavailable'}`,
      `competitors: ${youtubeCompetitors ? youtubeCompetitors.videos.length + ' videos' : 'unavailable'}`,
      `rss: ${rssHeadlines ? rssHeadlines.headlines.length + ' headlines' : 'unavailable'}`,
      `velocity: ${channelVelocity ? channelVelocity.recentEpisodes.length + ' episodes' : 'unavailable'}`,
    ];
    console.log(`[TitleGen] Data sources: ${sources.join(', ')}`);

    const prompt = buildTitlePrompt(
      transcript,
      guest || '',
      episodeType || 'interview',
      episodes,
      enrichment,
    );

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the text content from the response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      console.error('Could not find JSON in response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse titles from AI response' },
        { status: 500 }
      );
    }

    const titles = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ titles });
  } catch (error) {
    console.error('Error generating titles:', error);
    return NextResponse.json(
      { error: 'Failed to generate titles' },
      { status: 500 }
    );
  }
}
