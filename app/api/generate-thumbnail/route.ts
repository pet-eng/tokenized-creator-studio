import { NextRequest, NextResponse } from 'next/server';
import { buildThumbnailPrompt } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  try {
    const { headline, subtext, company, hasGuest } = await request.json();

    if (!headline || headline.trim().length === 0) {
      return NextResponse.json(
        { error: 'Headline is required' },
        { status: 400 }
      );
    }

    const prompt = buildThumbnailPrompt(headline, subtext || '', company, hasGuest);

    // Use Imagen 3 via REST API directly
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Call Imagen 3 API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            outputOptions: {
              mimeType: 'image/png',
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Imagen API error:', errorData);

      // Check for specific error types
      if (response.status === 400) {
        return NextResponse.json(
          { error: 'Invalid request to image generation API', details: JSON.stringify(errorData) },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Image generation API error', details: JSON.stringify(errorData) },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract image from response
    if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
      const imageData = data.predictions[0].bytesBase64Encoded;
      const mimeType = data.predictions[0].mimeType || 'image/png';

      return NextResponse.json({
        image: `data:${mimeType};base64,${imageData}`,
        success: true,
      });
    }

    // Try alternative response structure
    if (data.images && data.images[0]) {
      return NextResponse.json({
        image: `data:image/png;base64,${data.images[0]}`,
        success: true,
      });
    }

    console.error('Unexpected response structure:', JSON.stringify(data));
    return NextResponse.json(
      { error: 'No image in response', details: 'Unexpected API response structure' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error generating thumbnail:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to generate thumbnail',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
