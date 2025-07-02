import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cloudStorageService } from '@/lib/storage/CloudStorageService';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageId } = params;

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    const success = await cloudStorageService.deleteImage(imageId, userId);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Image delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageId } = params;
    const body = await request.json();
    const { updates } = body;

    if (!imageId || !updates) {
      return NextResponse.json(
        { error: 'Image ID and updates are required' },
        { status: 400 }
      );
    }

    // This would update image metadata in the database
    // For now, we'll return a placeholder response
    return NextResponse.json({ 
      success: true,
      message: 'Image updated successfully' 
    });
  } catch (error: any) {
    console.error('Image update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}