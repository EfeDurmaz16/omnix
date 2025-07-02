import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cloudStorageService } from '@/lib/storage/CloudStorageService';

interface RouteContext {
  params: {
    imageId: string;
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageId } = await context.params;

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Get all versions of this image
    const versions = await cloudStorageService.getImageVersions(imageId, userId);

    return NextResponse.json({ 
      versions,
      count: versions.length 
    });

  } catch (error: any) {
    console.error('Failed to get image versions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}