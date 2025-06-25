import { NextRequest, NextResponse } from 'next/server';
import { getModelRouter } from '@/lib/model-router';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model = 'veo-2.0-generate-001', duration = 5, quality = 'standard', imageUrl } = body;

    console.log('🎬 Video generation request:', { prompt: prompt?.substring(0, 50) + '...', model, duration });

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get model router
    const router = getModelRouter();
    
    // Check if model is available
    const availableModels = await router.getAvailableModels();
    const availableModel = availableModels.find(m => m.id === model && m.type === 'video');
    
    if (!availableModel) {
      console.warn(`❌ Video model ${model} not available, falling back to veo-2.0-generate-001`);
      // Auto-fallback to working model
      const fallbackModel = 'veo-2.0-generate-001';
      const result = await router.generateVideo({
        prompt,
        model: fallbackModel,
        duration,
        quality
      });
      
      return NextResponse.json({
        success: true,
        data: {
          id: result.id,
          url: result.url,
          prompt: result.prompt,
          model: fallbackModel, // Show the actual model used
          duration: result.duration,
          createdAt: result.createdAt,
          fallback: true,
          originalModel: model
        }
      });
    }

    console.log(`🚀 Using ${availableModel.provider} provider for ${model}`);
    
    // Generate video
          const result = await router.generateVideo({
        prompt,
        model,
        duration,
        quality,
        imageUrl
      });

    console.log('✅ Video generation successful:', result.id);

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        url: result.url,
        prompt: result.prompt,
        model: result.model,
        duration: result.duration,
        createdAt: result.createdAt,
        provider: availableModel.provider
      }
    });

  } catch (error) {
    console.error('❌ Video generation failed:', error);
    
    // Provide user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Video generation failed',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 