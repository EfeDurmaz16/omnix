import { NextRequest, NextResponse } from 'next/server';
import { listGeneratedVideos, getGeneratedVideo, deleteGeneratedVideo, storeGeneratedVideo, clearAllGeneratedVideos } from '@/lib/gcp-storage';

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
      const testVideo = await storeGeneratedVideo({
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        prompt: `Test video created at ${new Date().toLocaleTimeString()}`,
        model: 'test-model',
        duration: 5,
        userId: 'current-user',
        size: 25,
        format: 'mp4'
      });
      
      return NextResponse.json({
        success: true,
        message: 'Test video created',
        data: testVideo
      });
    }

    // If requesting a specific video
    if (videoId) {
      console.log(`🔍 Retrieving specific video: ${videoId}`);
      const video = await getGeneratedVideo(videoId);
      
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
    const videos = await listGeneratedVideos(userId || undefined);
    
    console.log(`✅ Retrieved ${videos.length} videos`);
    videos.forEach((v: any) => console.log(`  - ${v.id}: ${v.prompt.substring(0, 50)}...`));

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
      
      const { userId } = body;
      const deletedCount = await clearAllGeneratedVideos(userId || 'current-user');
      
      return NextResponse.json({
        success: true,
        message: `Successfully cleared ${deletedCount} videos from both GCS and Firestore`,
        deletedCount
      });
    }

    if (action === 'test') {
      console.log('🧪 Creating test video via POST...');
      const testVideo = await storeGeneratedVideo({
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        prompt: body.prompt || `Test video ${Date.now()}`,
        model: 'test-model',
        duration: 5,
        userId: 'current-user',
        size: 25,
        format: 'mp4'
      });
      
      return NextResponse.json({
        success: true,
        message: 'Test video created',
        data: testVideo
      });
    }

    if (action === 'add-missing') {
      console.log('🔧 Adding missing video to Firestore...');
      
      // Import Firestore directly for this operation
      const { Firestore } = require('@google-cloud/firestore');
      let firestore;
      try {
        firestore = new Firestore({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
          databaseId: 'omni',
        });
      } catch (error) {
        firestore = new Firestore({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
        });
      }

      const videoId = 'vid_29393d165af0'; // Latest missing video
      const gcsPath = `generated-videos/current-user/${videoId}/${videoId}.mp4`;

      const videoMetadata = {
        videoId: videoId,
        userId: 'current-user',
        prompt: 'Generated video (recovered from GCS)',
        model: 'unknown-model',
        duration: 5,
        gcsPath: gcsPath,
        originalUrl: `gs://omnix-video-storage/${gcsPath}`,
        status: 'completed',
        fileName: `${videoId}.mp4`,
        size: 0,
        format: 'mp4',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await firestore.collection('generated-videos').doc(videoId).set(videoMetadata);
      console.log(`✅ Added missing video to Firestore: ${videoId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Missing video added to Firestore',
        data: { id: videoId, ...videoMetadata }
      });
    }

    if (action === 'migrate-local') {
      console.log('🔄 Migrating all local videos to Firestore...');
      
      try {
        // Load all videos from local storage
        const fs = require('fs');
        const path = require('path');
        const localStoragePath = path.join(process.cwd(), 'video-storage.json');
        
        let localData = [];
        if (fs.existsSync(localStoragePath)) {
          const fileContent = fs.readFileSync(localStoragePath, 'utf8');
          localData = JSON.parse(fileContent);
        }
        
        console.log(`📋 Found ${localData.length} videos in local storage`);
        
        let migrated = 0;
        let skipped = 0;
        
        for (const video of localData) {
          try {
            // Check if video already exists in Firestore
            const existingVideo = await storeGeneratedVideo({
              url: video.url,
              prompt: video.prompt,
              model: video.model,
              duration: video.duration,
              userId: video.userId || 'current-user',
              size: video.size || 0,
              format: video.format || 'mp4'
            });
            
            console.log(`✅ Migrated video to Firestore: ${existingVideo.id}`);
            migrated++;
            
          } catch (error) {
            console.warn(`⚠️ Failed to migrate video ${video.id}:`, error);
            skipped++;
          }
        }
        
        // After successful migration, clear local storage
        if (migrated > 0) {
          fs.writeFileSync(localStoragePath, '[]', 'utf8');
          console.log('🧹 Cleared local storage after migration');
        }
        
        return NextResponse.json({
          success: true,
          message: `Migration complete: ${migrated} videos migrated, ${skipped} skipped`,
          migrated,
          skipped
        });
        
      } catch (error) {
        console.error('❌ Migration failed:', error);
        return NextResponse.json({
          success: false,
          error: 'Migration failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
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
    const success = await deleteGeneratedVideo(videoId);
    
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