import { NextRequest, NextResponse } from 'next/server';
import { VideoStorage } from '@/lib/video-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const videoId = searchParams.get('id');
    const test = searchParams.get('test'); // Add test parameter

    console.log('📹 Videos API called with params:', { userId, videoId, test });

    // Test endpoint to create a test video
    if (test === 'create') {
      console.log('🧪 Creating test video...');
      const testVideo = await VideoStorage.createTestVideo(`Test video created at ${new Date().toLocaleTimeString()}`);
      
      return NextResponse.json({
        success: true,
        message: 'Test video created',
        data: testVideo
      });
    }

    // If requesting a specific video
    if (videoId) {
      console.log(`🔍 Retrieving specific video: ${videoId}`);
      const video = await VideoStorage.get(videoId);
      
      if (!video) {
        return NextResponse.json(
          { success: false, error: 'Video not found' },
          { status: 404 }
        );
      }

      console.log('✅ Video found:', video.id);
      return NextResponse.json({
        success: true,
        data: video
      });
    }

    // If requesting list of videos
    console.log('📋 Retrieving video list...');
    const videos = await VideoStorage.list(userId || undefined);
    
    console.log(`✅ Retrieved ${videos.length} videos`);
    videos.forEach(v => console.log(`  - ${v.id}: ${v.prompt.substring(0, 50)}...`));

    return NextResponse.json({
      success: true,
      data: videos,
      count: videos.length
    });

  } catch (error) {
    console.error('❌ Failed to retrieve videos:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve videos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'clear') {
      console.log('🧹 Clearing all videos...');
      await VideoStorage.clear();
      
      return NextResponse.json({
        success: true,
        message: 'All videos cleared'
      });
    }

    if (action === 'test') {
      console.log('🧪 Creating test video via POST...');
      const testVideo = await VideoStorage.createTestVideo(body.prompt || `Test video ${Date.now()}`);
      
      return NextResponse.json({
        success: true,
        message: 'Test video created',
        data: testVideo
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Failed to process video request:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Video ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting video: ${videoId}`);
    const success = await VideoStorage.delete(videoId);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    console.log('✅ Video deleted successfully');
    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('❌ Failed to delete video:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 