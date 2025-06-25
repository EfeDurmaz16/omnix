import { NextRequest, NextResponse } from 'next/server';
import { getModelRouter } from '@/lib/model-router';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model = 'dall-e-3', size = '1024x1024', quality = 'standard' } = body;

    console.log('🎨 Image generation request:', { prompt: prompt?.substring(0, 50) + '...', model, size });

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
    const availableModel = availableModels.find(m => m.id === model && m.type === 'image');
    
    if (!availableModel) {
      console.warn(`❌ Model ${model} not available, falling back to dall-e-3`);
      // Auto-fallback to working model
      const fallbackModel = 'dall-e-3';
      const result = await router.generateImage({
        prompt,
        model: fallbackModel,
        size,
        quality
      });
      
      return NextResponse.json({
        success: true,
        data: {
          id: result.id,
          url: result.url,
          prompt: result.prompt,
          model: fallbackModel, // Show the actual model used
          size: result.size,
          createdAt: result.createdAt,
          fallback: true,
          originalModel: model
        }
      });
    }

    console.log(`🚀 Using ${availableModel.provider} provider for ${model}`);
    
    // Generate image
    const result = await router.generateImage({
      prompt,
      model,
      size,
      quality
    });

    console.log('✅ Image generation successful:', result.id);

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        url: result.url,
        prompt: result.prompt,
        model: result.model,
        size: result.size,
        createdAt: result.createdAt,
        provider: availableModel.provider
      }
    });

  } catch (error) {
    console.error('❌ Image generation failed:', error);
    
    // Provide user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Image generation failed',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 