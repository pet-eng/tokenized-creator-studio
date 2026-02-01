import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildIterationPrompt } from '@/lib/prompts';
import { getPerformanceData } from '@/lib/dashboard-data';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { selectedTitle, transcript, guest } = await request.json();

    if (!selectedTitle || selectedTitle.trim().length === 0) {
      return NextResponse.json(
        { error: 'Selected title is required' },
        { status: 400 },
      );
    }

    const episodes = await getPerformanceData();

    const prompt = buildIterationPrompt(
      selectedTitle,
      transcript || '',
      guest || '',
      episodes,
    );

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      console.error('Could not find JSON in iteration response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse iterations from AI response' },
        { status: 500 },
      );
    }

    const iterations = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ iterations });
  } catch (error) {
    console.error('Error iterating title:', error);
    return NextResponse.json(
      { error: 'Failed to iterate title' },
      { status: 500 },
    );
  }
}
