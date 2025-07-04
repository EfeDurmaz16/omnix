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

    console.log('🎤 Transcribing audio file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Validate file format
    const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
    const fileExtension = audioFile.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      console.error('❌ Unsupported file format:', fileExtension, 'File:', audioFile.name);
      return NextResponse.json(
        { 
          error: `Invalid file format. Supported formats: ${supportedFormats.join(', ')}`,
          details: `Received file: ${audioFile.name} with extension: ${fileExtension}`
        },
        { status: 400 }
      );
    }

    // Additional MIME type validation
    const supportedMimeTypes = [
      'audio/flac', 'audio/x-flac',
      'audio/m4a', 'audio/mp4', 'audio/x-m4a',
      'audio/mp3', 'audio/mpeg',
      'audio/mpga',
      'audio/oga', 'audio/ogg',
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/webm'
    ];

    if (audioFile.type && !supportedMimeTypes.includes(audioFile.type)) {
      console.warn('⚠️ Unusual MIME type, but proceeding based on file extension:', audioFile.type);
    }

    // Get preferred language from query params (optional)
    const url = new URL(request.url);
    const preferredLanguage = url.searchParams.get('language'); // e.g., 'en', 'tr', 'fr'

    console.log('📤 Sending to OpenAI Whisper:', {
      filename: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      language: preferredLanguage || 'auto-detect'
    });

    // Call OpenAI Whisper API with auto-detection or preferred language
    // OpenAI API accepts the File object directly from FormData
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
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
    
    // Handle specific OpenAI API errors
    let errorMessage = 'Transcription failed';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific OpenAI error types
      if (error.message.includes('Invalid file format')) {
        statusCode = 400;
        errorMessage = 'Invalid audio file format. Please try again.';
      } else if (error.message.includes('File too large')) {
        statusCode = 413;
        errorMessage = 'Audio file too large. Please record a shorter message.';
      } else if (error.message.includes('Rate limit')) {
        statusCode = 429;
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: statusCode }
    );
  }
} 