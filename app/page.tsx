import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { headline, hasGuest, guestDescription } = await request.json();

    if (!headline || headline.trim().length === 0) {
      return NextResponse.json({ error: 'Headline is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const prompt = `Create a professional YouTube thumbnail for a crypto/fintech podcast called "Tokenized".

Style requirements:
- Bright blue gradient background (like a professional tech/finance podcast)
- Bold, impactful text with the headline: "${headline.toUpperCase()}"
- The text should have BLACK rectangular boxes behind each line of text
- Text color should be bright cyan/turquoise (#00d4ff)
- Text should be stacked vertically, one or two words per line
- Clean, modern, professional look
${hasGuest ? `- Include a professional-looking person (${guestDescription || 'business professional'}) on the left side of the image` : ''}
- 16:9 aspect ratio suitable for YouTube thumbnails
- High contrast, eye-catching design
- No watermarks or logos other than the text

The overall style should look like a premium finance/crypto podcast thumbnail with bold typography.`;

    // Try Gemini 2.0 Flash with image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
          generationConfig: { responseModalities: ['image', 'text'] }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => 
      p.inlineData?.mimeType?.startsWith('image/')
    );

    if (imagePart?.inlineData) {
      const base64Image = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      return NextResponse.json({ image: base64Image });
    }

    return NextResponse.json({ error: 'No image generated' }, { status: 500 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}
