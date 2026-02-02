import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildClipFinderPrompt } from '@/lib/prompts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { transcript, hasTimestamps, guest, episodeType } = await request.json();

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    const prompt = buildClipFinderPrompt(
      transcript,
      hasTimestamps ?? false,
      guest || '',
      episodeType || 'interview',
    );

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      console.error('Could not find JSON in response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse clips from AI response' },
        { status: 500 }
      );
    }

    const clips = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ clips });
  } catch (error) {
    console.error('Error finding clips:', error);
    return NextResponse.json(
      { error: 'Failed to find clips' },
      { status: 500 }
    );
  }
}
