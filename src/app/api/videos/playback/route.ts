
// src/app/api/videos/playback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPlaybackUrl } from '@/lib/gcp-storage';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const playbackUrl = await getPlaybackUrl(userId, videoId);

    return NextResponse.json({ success: true, playbackUrl });
  } catch (error) {
    console.error('Error generating playback URL:', error);
    const errorMessage = (error as Error).message;
    const status = errorMessage === 'Unauthorized access' ? 403 : errorMessage === 'Video not found' ? 404 : 500;
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
}
