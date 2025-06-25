
// src/app/api/videos/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl } from '@/lib/gcp-storage';
import { getAuth } from '@clerk/nextjs/server'; // Assuming you use Clerk for auth
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, contentType } = await request.json();
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    const videoId = `vid_${randomUUID()}`;
    const uploadUrl = await generateUploadUrl(userId, videoId, fileName, contentType);

    return NextResponse.json({ success: true, uploadUrl, videoId });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
