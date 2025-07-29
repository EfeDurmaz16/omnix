import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getModelsForUser, getModelRouter } from '@/lib/model-router';
import { getAvailableModelsForPlan, getUserPlanLimits } from '@/lib/model-access';
import { enhancedModelRouter } from '@/lib/router/EnhancedModelRouter';

export async function GET() {
  try {
    console.log('Models API called');
    
    let userId: string | null = null;
    let isAuthenticated = false;
    
    try {
      const authResult = await auth();
      userId = authResult.userId;
      isAuthenticated = !!userId;
      console.log('User ID:', userId);
    } catch (authError) {
      console.warn('Auth failed, continuing without authentication:', authError);
    }

    let allModels: any[] = [];
    
    try {
      console.log('Initializing enhanced router...');
      const router = enhancedModelRouter;
      console.log('Enhanced router initialized:', !!router);
      
      // Get all available models using enhanced router
      console.log('Getting available models from enhanced router...');
      allModels = await router.getAvailableModels();
      console.log('All models from enhanced router:', allModels?.length || 0);
    } catch (routerError) {
      console.warn('Enhanced router failed, using fallback models:', routerError);
      allModels = [];
    }
    
    // If no models found or very few, add fallback models
    if (!allModels || allModels.length <= 1) {
      console.warn('⚠️ Limited models found from router, adding fallback models');
      const fallbackModels = [
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          type: 'text' as const,
          contextWindow: 16385,
          inputCostPer1kTokens: 0.0005,
          outputCostPer1kTokens: 0.0015,
          maxTokens: 4096,
          capabilities: [
            { type: 'text-generation' as const, supported: true },
            { type: 'function-calling' as const, supported: true }
          ]
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          provider: 'openai',
          type: 'multimodal' as const,
          contextWindow: 128000,
          inputCostPer1kTokens: 0.00015,
          outputCostPer1kTokens: 0.0006,
          maxTokens: 16384,
          capabilities: [
            { type: 'text-generation' as const, supported: true },
            { type: 'image-analysis' as const, supported: true },
            { type: 'function-calling' as const, supported: true }
          ]
        },
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          provider: 'openai',
          type: 'multimodal' as const,
          contextWindow: 128000,
          inputCostPer1kTokens: 0.0025,
          outputCostPer1kTokens: 0.01,
          maxTokens: 4096,
          capabilities: [
            { type: 'text-generation' as const, supported: true },
            { type: 'image-analysis' as const, supported: true },
            { type: 'function-calling' as const, supported: true }
          ]
        },
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'openai',
          type: 'multimodal' as const,
          contextWindow: 8192,
          inputCostPer1kTokens: 0.03,
          outputCostPer1kTokens: 0.06,
          maxTokens: 4096,
          capabilities: [
            { type: 'text-generation' as const, supported: true },
            { type: 'image-analysis' as const, supported: true },
            { type: 'function-calling' as const, supported: true }
          ]
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          provider: 'openai',
          type: 'multimodal' as const,
          contextWindow: 128000,
          inputCostPer1kTokens: 0.01,
          outputCostPer1kTokens: 0.03,
          maxTokens: 4096,
          capabilities: [
            { type: 'text-generation' as const, supported: true },
            { type: 'image-analysis' as const, supported: true },
            { type: 'function-calling' as const, supported: true }
          ]
        },
        {
          id: 'gemini-2.0-flash-001',
          name: 'Gemini 2.0 Flash',
          provider: 'vertex',
          type: 'multimodal' as const,
          contextWindow: 1048576,
          inputCostPer1kTokens: 0.000075,
          outputCostPer1kTokens: 0.0003,
          maxTokens: 8192,
          capabilities: [
            { type: 'text-generation' as const, supported: true },
            { type: 'image-analysis' as const, supported: true },
            { type: 'function-calling' as const, supported: true }
          ]
        },
        // Image generation models
        {
          id: 'dall-e-3',
          name: 'DALL-E 3',
          provider: 'openai',
          type: 'image' as const,
          contextWindow: 4000,
          inputCostPer1kTokens: 0.04,
          outputCostPer1kTokens: 0,
          maxTokens: 0,
          capabilities: [
            { type: 'image-generation' as const, supported: true },
            { type: 'high-quality-generation' as const, supported: true }
          ]
        },
        {
          id: 'dall-e-2',
          name: 'DALL-E 2',
          provider: 'openai',
          type: 'image' as const,
          contextWindow: 4000,
          inputCostPer1kTokens: 0.02,
          outputCostPer1kTokens: 0,
          maxTokens: 0,
          capabilities: [
            { type: 'image-generation' as const, supported: true }
          ]
        },
        {
          id: 'gpt-image-1',
          name: 'GPT-Image-1',
          provider: 'openai',
          type: 'image' as const,
          contextWindow: 4000,
          inputCostPer1kTokens: 0.05,
          outputCostPer1kTokens: 0,
          maxTokens: 0,
          capabilities: [
            { type: 'image-generation' as const, supported: true },
            { type: 'image-editing' as const, supported: true },
            { type: 'inpainting' as const, supported: true },
            { type: 'outpainting' as const, supported: true }
          ]
        },
        {
          id: 'gpt-4-vision',
          name: 'GPT-4 Vision',
          provider: 'openai',
          type: 'image' as const,
          contextWindow: 4000,
          inputCostPer1kTokens: 0.01,
          outputCostPer1kTokens: 0.03,
          maxTokens: 0,
          capabilities: [
            { type: 'image-generation' as const, supported: true },
            { type: 'image-analysis' as const, supported: true },
            { type: 'image-editing' as const, supported: true }
          ]
        },
        {
          id: 'midjourney-v6',
          name: 'Midjourney v6',
          provider: 'midjourney',
          type: 'image' as const,
          contextWindow: 4000,
          inputCostPer1kTokens: 0.05,
          outputCostPer1kTokens: 0,
          maxTokens: 0,
          capabilities: [
            { type: 'image-generation' as const, supported: true },
            { type: 'artistic-generation' as const, supported: true },
            { type: 'style-transfer' as const, supported: true }
          ]
        },
        {
          id: 'midjourney-v5.2',
          name: 'Midjourney v5.2',
          provider: 'midjourney',
          type: 'image' as const,
          contextWindow: 4000,
          inputCostPer1kTokens: 0.04,
          outputCostPer1kTokens: 0,
          maxTokens: 0,
          capabilities: [
            { type: 'image-generation' as const, supported: true },
            { type: 'artistic-generation' as const, supported: true }
          ]
        },
        {
          id: 'midjourney-niji',
          name: 'Midjourney Niji (Anime)',
          provider: 'midjourney',
          type: 'image' as const,
          contextWindow: 4000,
          inputCostPer1kTokens: 0.045,
          outputCostPer1kTokens: 0,
          maxTokens: 0,
          capabilities: [
            { type: 'image-generation' as const, supported: true },
            { type: 'anime-generation' as const, supported: true }
          ]
        },
        {
          id: 'stable-diffusion-xl',
          name: 'Stable Diffusion XL',
          provider: 'stability',
          type: 'image' as const,
          contextWindow: 4000,
          inputCostPer1kTokens: 0.03,
          outputCostPer1kTokens: 0,
          maxTokens: 0,
          capabilities: [
            { type: 'image-generation' as const, supported: true },
            { type: 'high-resolution' as const, supported: true }
          ]
        },
        {
          id: 'stable-diffusion-3',
          name: 'Stable Diffusion 3',
          provider: 'stability',
          type: 'image' as const,
          contextWindow: 4000,
          inputCostPer1kTokens: 0.035,
          outputCostPer1kTokens: 0,
          maxTokens: 0,
          capabilities: [
            { type: 'image-generation' as const, supported: true },
            { type: 'text-rendering' as const, supported: true }
          ]
        }
      ];
      
      // Use fallback models instead
      allModels.push(...fallbackModels);
      console.log('Using fallback models:', fallbackModels.length);
    }
    
    // Get user's plan - give ultra access for development
    const userPlan = isAuthenticated ? 'ultra' : 'demo'; // TODO: Get actual plan from Clerk user metadata
    console.log('User plan:', userPlan, 'Authenticated:', isAuthenticated);
    
    // Filter models based on user's plan - show all text models for demo users
    console.log('Filtering models for plan...');
    let availableModels;
    if (isAuthenticated) {
      availableModels = getAvailableModelsForPlan(userPlan, allModels);
    } else {
      // For unauthenticated users, show ALL models for development
      availableModels = allModels;
    }
    console.log('Available models after filtering:', availableModels?.length || 0);
    
    // Get plan limits
    const planLimits = getUserPlanLimits(userPlan);
    console.log('Plan limits:', planLimits);
    
    // Get provider health status
    console.log('Getting provider health...');
    let providerHealth: Record<string, boolean> = {};
    
    try {
      const router = enhancedModelRouter;
      const providerHealthMap = router.getProviderHealth();
      for (const [providerId, health] of providerHealthMap.entries()) {
        providerHealth[providerId] = health.isHealthy;
      }
      console.log('Provider health:', providerHealth);
    } catch (healthError) {
      console.warn('Failed to get provider health, using defaults:', healthError);
      // Set default health for common providers
      providerHealth = {
        openai: true,
        vertex: true,
        anthropic: true,
        replicate: true,
        midjourney: true,
        stability: true
      };
    }
    
    // Group models by provider
    const modelsByProvider = availableModels.reduce((acc: Record<string, any[]>, model: any) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push({
        id: model.id,
        name: model.name,
        type: model.type,
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
        inputCost: model.inputCostPer1kTokens,
        outputCost: model.outputCostPer1kTokens,
        capabilities: model.capabilities.map((cap: any) => ({
          type: cap.type,
          supported: cap.supported
        }))
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      data: {
        providers: Object.keys(modelsByProvider).map(provider => ({
          name: provider,
          status: providerHealth[provider] ? 'healthy' : 'unavailable',
          models: modelsByProvider[provider]
        })),
        totalModels: availableModels.length,
        userPlan: userPlan,
        planLimits: planLimits,
        computeModes: [
          {
            mode: 'flash',
            name: 'Flash Mode',
            description: 'Quick, concise responses optimized for speed',
            temperature: 0.3,
            maxTokens: 1000
          },
          {
            mode: 'think',
            name: 'Think Mode', 
            description: 'Detailed reasoning with step-by-step analysis',
            temperature: 0.5,
            maxTokens: 2000
          },
          {
            mode: 'ultra-think',
            name: 'Ultra-Think Mode',
            description: 'Deep analysis with comprehensive reasoning',
            temperature: 0.7,
            maxTokens: 4000
          },
          {
            mode: 'full-think',
            name: 'FullThink Mode',
            description: 'Maximum creativity with high temperature for diverse outputs',
            temperature: 1.0,
            maxTokens: 3000
          }
        ]
      }
    });

  } catch (error) {
    console.error('Models API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch models',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { requirement } = body;

    if (!requirement) {
      return NextResponse.json({ error: 'Model requirement is required' }, { status: 400 });
    }

    const router = getModelRouter();
    const recommendedModel = await router.selectBestModel(requirement);

    if (!recommendedModel) {
      return NextResponse.json({ 
        error: 'No suitable model found for the given requirements' 
      }, { status: 404 });
    }

    // Estimate cost for a sample request
    const estimatedCost = await router.estimateCost({
      model: recommendedModel.id,
      messages: [{ role: 'user', content: 'Sample message for cost estimation' }],
      userId,
      maxTokens: requirement.estimatedTokens || 1000
    });

    return NextResponse.json({
      success: true,
      data: {
        recommendedModel: {
          id: recommendedModel.id,
          name: recommendedModel.name,
          provider: recommendedModel.provider,
          type: recommendedModel.type,
          contextWindow: recommendedModel.contextWindow,
          estimatedCost,
          capabilities: recommendedModel.capabilities,
          reasoning: `Selected based on ${requirement.quality || 'balanced'} quality preference`
        }
      }
    });

  } catch (error) {
    console.error('Model selection API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to select model',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    );
  }
} 