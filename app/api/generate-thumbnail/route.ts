import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { headline } = await request.json();

    if (!headline || headline.trim().length === 0) {
      return NextResponse.json(
        { error: 'Headline is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Use client-side canvas rendering',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
