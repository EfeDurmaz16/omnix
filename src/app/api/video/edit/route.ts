import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { VideoEditorProvider, VideoEditingOptions } from '@/lib/providers/video-editor';
import { analyticsTracker } from '@/lib/analytics/AnalyticsTracker';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      videoUrl,
      editType,
      prompt,
      startTime,
      endTime,
      targetStyle,
      quality = 'standard',
      outputFormat = 'mp4',
      aspectRatio,
      frameRate
    }: VideoEditingOptions = body;

    console.log('🎞️ Video editing request:', { 
      editType, 
      prompt: prompt?.substring(0, 50) + '...', 
      quality 
    });

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Video URL is required' },
        { status: 400 }
      );
    }

    if (!editType) {
      return NextResponse.json(
        { success: false, error: 'Edit type is required' },
        { status: 400 }
      );
    }

    const startRequestTime = performance.now();

    // Initialize video editor
    const videoEditor = new VideoEditorProvider();

    try {
      // Perform video editing
      const result = await videoEditor.editVideo({
        videoUrl,
        editType,
        prompt,
        startTime,
        endTime,
        targetStyle,
        quality,
        outputFormat,
        aspectRatio,
        frameRate
      });

      // Track analytics for video editing
      analyticsTracker.trackVideoGeneration({
        userId,
        modelId: `video-editor-${editType}`,
        provider: 'video-editor',
        prompt: prompt || `${editType} video editing`,
        videoUrl: result.editedUrl,
        startTime: startRequestTime,
        success: true,
        duration: result.duration,
        quality,
        cost: 0.5, // Estimated cost for video editing
        metadata: {
          editType,
          originalUrl: videoUrl,
          targetStyle,
          outputFormat,
          ...result.metadata
        }
      }).catch(error => console.warn('Analytics tracking failed:', error));

      console.log('✅ Video editing successful:', result.id);

      return NextResponse.json({
        success: true,
        data: {
          id: result.id,
          originalUrl: result.originalUrl,
          editedUrl: result.editedUrl,
          editType: result.editType,
          prompt: result.prompt,
          duration: result.duration,
          createdAt: result.createdAt,
          metadata: result.metadata
        }
      });

    } catch (editError) {
      console.error('❌ Video editing failed:', editError);

      // Track failed editing attempt
      analyticsTracker.trackVideoGeneration({
        userId,
        modelId: `video-editor-${editType}`,
        provider: 'video-editor',
        prompt: prompt || `${editType} video editing`,
        startTime: startRequestTime,
        success: false,
        error: editError instanceof Error ? editError.message : 'Unknown editing error',
        duration: 0,
        quality,
        cost: 0,
        metadata: {
          editType,
          originalUrl: videoUrl,
          targetStyle,
          outputFormat
        }
      }).catch(analyticsError => console.warn('Analytics tracking failed:', analyticsError));

      // Provide user-friendly error message
      const errorMessage = editError instanceof Error ? editError.message : 'Unknown error occurred';
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Video editing failed',
          details: errorMessage,
          editType,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Video editing API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Get available editing options
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const videoEditor = new VideoEditorProvider();
    const models = videoEditor.getModels();

    const editingOptions = {
      editTypes: [
        {
          id: 'enhance',
          name: 'AI Enhancement',
          description: 'Improve video quality, lighting, and clarity with AI',
          requiresPrompt: false,
          estimatedTime: '30-60 seconds'
        },
        {
          id: 'style-transfer',
          name: 'Style Transfer',
          description: 'Apply artistic styles or cinematic looks',
          requiresPrompt: true,
          estimatedTime: '60-120 seconds'
        },
        {
          id: 'upscale',
          name: 'Upscale Video',
          description: 'Increase resolution with AI super-resolution',
          requiresPrompt: false,
          estimatedTime: '2-5 minutes'
        },
        {
          id: 'stabilize',
          name: 'Stabilization',
          description: 'Remove camera shake and smooth motion',
          requiresPrompt: false,
          estimatedTime: '30-90 seconds'
        },
        {
          id: 'color-correct',
          name: 'Color Correction',
          description: 'Improve color balance and saturation',
          requiresPrompt: false,
          estimatedTime: '30-60 seconds'
        },
        {
          id: 'cut',
          name: 'Smart Cut',
          description: 'Extract specific segments with AI assistance',
          requiresPrompt: false,
          estimatedTime: '10-30 seconds'
        },
        {
          id: 'add-effects',
          name: 'Visual Effects',
          description: 'Add cinematic effects based on description',
          requiresPrompt: true,
          estimatedTime: '60-180 seconds'
        }
      ],
      qualityOptions: ['draft', 'standard', 'high', 'ultra'],
      outputFormats: ['mp4', 'webm', 'mov', 'avi'],
      models: models.map(model => ({
        id: model.id,
        name: model.name,
        capabilities: model.capabilities
      }))
    };

    return NextResponse.json({
      success: true,
      data: editingOptions
    });

  } catch (error) {
    console.error('❌ Get editing options error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get editing options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}