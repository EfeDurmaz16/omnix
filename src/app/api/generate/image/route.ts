import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getModelRouter } from '@/lib/model-router';
import { cloudStorageService } from '@/lib/storage/CloudStorageService';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { prompt, model = 'dall-e-3', size = '1024x1024', quality = 'standard', saveToGallery = true } = body;

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

      // Save fallback image to gallery if requested
      let savedImage = null;
      if (saveToGallery) {
        try {
          const imageResponse = await fetch(result.url);
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          const saveResult = await cloudStorageService.uploadGeneratedImage(imageBuffer, {
            userId,
            prompt: result.prompt,
            model: fallbackModel,
            width: parseInt(size.split('x')[0]),
            height: parseInt(size.split('x')[1]),
            format: 'png'
          });

          if (saveResult.success) {
            savedImage = {
              id: saveResult.metadata?.id || result.id,
              url: saveResult.url,
              thumbnailUrl: saveResult.thumbnailUrl
            };
          }
        } catch (saveError) {
          console.warn('⚠️ Failed to save fallback image to gallery:', saveError);
        }
      }
      
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
          originalModel: model,
          savedToGallery: !!savedImage,
          galleryImage: savedImage
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

    // Optionally save to gallery
    let savedImage = null;
    if (saveToGallery) {
      try {
        // Download the image and save it to user's gallery
        const imageResponse = await fetch(result.url);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        const saveResult = await cloudStorageService.uploadGeneratedImage(imageBuffer, {
          userId,
          prompt: result.prompt,
          model: result.model,
          width: parseInt(size.split('x')[0]),
          height: parseInt(size.split('x')[1]),
          format: 'png'
        });

        if (saveResult.success) {
          savedImage = {
            id: saveResult.metadata?.id || result.id,
            url: saveResult.url,
            thumbnailUrl: saveResult.thumbnailUrl
          };
          console.log('✅ Image saved to gallery:', savedImage.id);
        }
      } catch (saveError) {
        console.warn('⚠️ Failed to save image to gallery:', saveError);
        // Continue without failing the generation
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        url: result.url,
        prompt: result.prompt,
        model: result.model,
        size: result.size,
        createdAt: result.createdAt,
        provider: availableModel.provider,
        savedToGallery: !!savedImage,
        galleryImage: savedImage
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