import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('🎤 Transcribing audio file:', audioFile.name, audioFile.size, 'bytes');

    // Convert File to format expected by OpenAI
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBlob = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    // Get preferred language from query params (optional)
    const url = new URL(request.url);
    const preferredLanguage = url.searchParams.get('language'); // e.g., 'en', 'tr', 'fr'

    // Call OpenAI Whisper API with auto-detection or preferred language
    const transcription = await openai.audio.transcriptions.create({
      file: audioBlob,
      model: 'whisper-1',
      language: preferredLanguage || undefined, // Auto-detect if not specified
      response_format: 'verbose_json', // Get more details including language detection
      temperature: 0.2, // Lower temperature for more consistent transcription
    });

    console.log('✅ Transcription completed:', transcription.text.substring(0, 100) + '...');

    // Extract detected language from verbose response
    const detectedLanguage = (transcription as any).language || preferredLanguage || 'en';
    
    return NextResponse.json({
      success: true,
      text: transcription.text,
      language: detectedLanguage,
      duration: (transcription as any).duration || 0,
    });

  } catch (error) {
    console.error('❌ Speech transcription error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Transcription failed',
        details: 'Please try again or check your microphone permissions'
      },
      { status: 500 }
    );
  }
} 