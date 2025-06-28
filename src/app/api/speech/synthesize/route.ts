import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'alloy', speed = 1.0 } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text provided for synthesis' },
        { status: 400 }
      );
    }

    console.log('🔊 Synthesizing speech:', text.substring(0, 100) + '...');
    console.log('🎵 Voice:', voice, 'Speed:', speed);

    // Call OpenAI TTS API
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1-hd', // Higher quality model
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      speed: speed, // 0.25 to 4.0
    });

    // Convert response to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log('✅ Speech synthesis completed, audio size:', buffer.length, 'bytes');

    // Return audio as MP3
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error: any) {
    console.error('❌ Text-to-speech error:', error);
    return NextResponse.json(
      { error: 'Text-to-speech synthesis failed', details: error.message },
      { status: 500 }
    );
  }
} 