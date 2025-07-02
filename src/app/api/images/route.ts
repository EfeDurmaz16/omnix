import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cloudStorageService } from '@/lib/storage/CloudStorageService';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('🔍 Getting images for userId:', userId);
    const images = await cloudStorageService.getUserImages(userId, limit, offset);
    console.log('📸 Found images:', images.length);

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error('Failed to get images:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'store-generated': {
        const { prompt, model, imageUrl, metadata } = params;
        
        if (!prompt || !model || !imageUrl) {
          return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
          );
        }

        // Download the generated image
        const response = await fetch(imageUrl);
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        
        // Upload to cloud storage
        const result = await cloudStorageService.uploadGeneratedImage(imageBuffer, {
          userId,
          prompt,
          model,
          ...metadata
        });

        if (result.success) {
          return NextResponse.json({ 
            success: true, 
            image: {
              url: result.url,
              thumbnailUrl: result.thumbnailUrl,
              metadata: result.metadata
            }
          });
        } else {
          return NextResponse.json(
            { error: result.error },
            { status: 500 }
          );
        }
      }

      case 'edit': {
        const { imageUrl, operations } = params;
        
        if (!imageUrl || !operations) {
          return NextResponse.json(
            { error: 'Missing imageUrl or operations' },
            { status: 400 }
          );
        }

        const result = await cloudStorageService.editImage(imageUrl, operations, userId);

        if (result.success) {
          return NextResponse.json({ 
            success: true, 
            editedUrl: result.url,
            metadata: result.metadata
          });
        } else {
          return NextResponse.json(
            { error: result.error },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Images API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}