import { NextRequest, NextResponse } from 'next/server';
import { getModelRouter } from '@/lib/model-router';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Running API test...');
    
    // Test basic router initialization
    const router = getModelRouter();
    console.log('✅ Router created');
    
    // Test getting available models
    const models = await router.getAvailableModels();
    console.log('✅ Models loaded:', models.length);
    
    // Test provider health
    const health = await router.getProviderHealth();
    console.log('✅ Provider health:', health);
    
    // Find image and video models
    const imageModels = models.filter(m => m.type === 'image');
    const videoModels = models.filter(m => m.type === 'video');
    
    console.log('📊 Image models:', imageModels.length);
    console.log('📊 Video models:', videoModels.length);
    
    return NextResponse.json({
      success: true,
      data: {
        totalModels: models.length,
        imageModels: imageModels.length,
        videoModels: videoModels.length,
        providerHealth: health,
        sampleModels: {
          image: imageModels.slice(0, 3),
          video: videoModels.slice(0, 3)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'image', model = 'dall-e-3', prompt = 'A beautiful sunset' } = body;
    
    console.log('🧪 Testing generation with:', { type, model, prompt });
    
    const router = getModelRouter();
    
    if (type === 'image') {
      const result = await router.generateImage({
        prompt,
        model,
        size: '1024x1024'
      });
      
      return NextResponse.json({
        success: true,
        type: 'image',
        result
      });
    } else if (type === 'video') {
      const result = await router.generateVideo({
        prompt,
        model,
        duration: 5
      });
      
      return NextResponse.json({
        success: true,
        type: 'video',
        result
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid type, use "image" or "video"'
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Generation test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 