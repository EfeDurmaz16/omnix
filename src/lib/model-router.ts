import { 
  ModelProvider, 
  GenerateRequest, 
  GenerateResponse, 
  ModelInfo,
  ProviderError,
  RateLimitError,
  selectOptimalModel,
  ModelRequirement
} from './providers/base';

// Lazy load providers to improve startup time
// import { OpenAIProvider } from './providers/openai';
// import { VertexAIProvider } from './providers/vertex';

export class ModelRouter {
  private providers: Map<string, ModelProvider> = new Map();
  private modelCache: Map<string, ModelInfo> = new Map();
  private lastRefresh = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initializeProviders();
  }

  private async initializeProviders() {
    try {
      // Lazy load OpenAI provider only when needed
      if (process.env.OPENAI_API_KEY) {
        try {
          const { OpenAIProvider } = await import('./providers/openai');
          const openaiProvider = new OpenAIProvider();
          this.providers.set('openai', openaiProvider);
          console.log('✅ OpenAI provider initialized');
        } catch (error) {
          console.warn('⚠️ OpenAI provider failed to initialize:', error);
        }
      } else {
        console.warn('⚠️ OPENAI_API_KEY not set, OpenAI models unavailable');
      }

      // Lazy load Claude provider only when needed
      if (process.env.GOOGLE_CLOUD_PROJECT || process.env.ANTHROPIC_VERTEX_PROJECT_ID) {
        try {
          const { ClaudeProvider } = await import('./providers/claude');
          const claudeProvider = new ClaudeProvider();
          this.providers.set('claude', claudeProvider);
          console.log('✅ Claude provider initialized');
        } catch (error) {
          console.warn('⚠️ Claude provider failed to initialize:', error);
        }
      } else {
        console.warn('⚠️ GOOGLE_CLOUD_PROJECT not set, Claude models unavailable');
      }

      // Lazy load Vertex AI provider only when needed
      if (process.env.GOOGLE_CLOUD_PROJECT) {
        try {
          const { VertexAIProvider } = await import('./providers/vertex');
          const vertexProvider = new VertexAIProvider();
          // Only add to providers if it actually initialized successfully
          if (vertexProvider && typeof vertexProvider.getModels === 'function') {
            this.providers.set('vertex', vertexProvider);
            console.log('✅ Vertex AI provider initialized');
          } else {
            console.warn('⚠️ Vertex AI provider initialization incomplete');
          }
        } catch (error) {
          console.warn('⚠️ Vertex AI provider failed to initialize:', error);
        }
      } else {
        console.warn('⚠️ GOOGLE_CLOUD_PROJECT not set, Vertex AI models unavailable');
      }

      // Lazy load Wavespeed provider only when needed
      if (process.env.WAVESPEED_API_KEY) {
        try {
          const { WavespeedProvider } = await import('./providers/wavespeed');
          const wavespeedProvider = new WavespeedProvider();
          this.providers.set('wavespeed', wavespeedProvider);
          console.log('✅ Wavespeed provider initialized');
        } catch (error) {
          console.warn('⚠️ Wavespeed provider failed to initialize:', error);
        }
      } else {
        console.warn('⚠️ WAVESPEED_API_KEY not set, Wavespeed models unavailable');
      }

      // TODO: Initialize other providers
      // if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      //   const bedrockProvider = new BedrockProvider();
      //   this.providers.set('bedrock', bedrockProvider);
      // }

      await this.refreshModels();
      
      console.log(`🔄 Model router initialized with ${this.providers.size} providers and ${this.modelCache.size} models`);
    } catch (error) {
      console.error('Failed to initialize providers:', error);
      // Don't throw error, just continue with whatever providers we have
    }
  }

  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    const model = await this.getModelInfo(request.model);
    if (!model) {
      throw new ProviderError(`Model ${request.model} not found`, 'router');
    }

    const provider = this.providers.get(model.provider);
    if (!provider) {
      throw new ProviderError(`Provider ${model.provider} not available`, 'router');
    }

    try {
      return await provider.generateText(request);
    } catch (error) {
      console.warn(`Error with model ${request.model}:`, error instanceof Error ? error.message : error);
      
      if (error instanceof RateLimitError) {
        // Try to find an alternative model
        const alternative = await this.findAlternativeModel(request);
        if (alternative) {
          console.log(`Rate limited on ${request.model}, trying ${alternative.id}`);
          return await this.generateText({ ...request, model: alternative.id });
        }
      }
      
      // If it's a 404 error (model not found), try to find a working alternative
      if (error instanceof Error && error.message.includes('404')) {
        console.log(`Model ${request.model} not available (404), trying alternative...`);
        const alternative = await this.findWorkingAlternative(request);
        if (alternative) {
          console.log(`Fallback to ${alternative.id}`);
          return await this.generateText({ ...request, model: alternative.id });
        }
      }
      
      throw error;
    }
  }

  async *generateStream(request: GenerateRequest): AsyncIterable<GenerateResponse> {
    const model = await this.getModelInfo(request.model);
    if (!model) {
      throw new ProviderError(`Model ${request.model} not found`, 'router');
    }

    const provider = this.providers.get(model.provider);
    if (!provider) {
      throw new ProviderError(`Provider ${model.provider} not available`, 'router');
    }

    try {
      yield* provider.generateStream(request);
    } catch (error) {
      if (error instanceof RateLimitError) {
        const alternative = await this.findAlternativeModel(request);
        if (alternative) {
          console.log(`Rate limited on ${request.model}, trying ${alternative.id}`);
          yield* this.generateStream({ ...request, model: alternative.id });
          return;
        }
      }
      throw error;
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    // Ensure providers are initialized before returning models
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    await this.refreshModelsIfNeeded();
    return Array.from(this.modelCache.values());
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    await this.refreshModelsIfNeeded();
    return this.modelCache.get(modelId) || null;
  }

  async selectBestModel(requirement: ModelRequirement): Promise<ModelInfo | null> {
    const availableModels = await this.getAvailableModels();
    return selectOptimalModel(requirement, availableModels);
  }

  async estimateCost(request: GenerateRequest): Promise<number> {
    const model = await this.getModelInfo(request.model);
    if (!model) return 0;

    const provider = this.providers.get(model.provider);
    if (!provider) return 0;

    return provider.estimateCost(request);
  }

  async getProviderHealth(): Promise<Record<string, boolean>> {
    // Ensure providers are initialized
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    
    const health: Record<string, boolean> = {};
    
    console.log('🏥 Checking provider health...');
    for (const [name, provider] of this.providers) {
      try {
        console.log(`🔍 Testing ${name} provider...`);
        health[name] = await provider.validateConfig();
        console.log(`${health[name] ? '✅' : '❌'} ${name}: ${health[name] ? 'healthy' : 'unhealthy'}`);
      } catch (error) {
        console.warn(`❌ ${name} health check error:`, error instanceof Error ? error.message : error);
        health[name] = false;
      }
    }
    
    console.log('🏥 Provider health summary:', health);
    return health;
  }

  async generateImage(options: {
    prompt: string;
    model: string;
    size?: string;
    quality?: string;
  }): Promise<{
    id: string;
    url: string;
    prompt: string;
    model: string;
    size: string;
    createdAt: string;
  }> {
    try {
      // Ensure providers are initialized
      if (this.initPromise) {
        await this.initPromise;
        this.initPromise = null;
      }

      console.log('🖼️ ModelRouter: Generating image with options:', { model: options.model, prompt: options.prompt.substring(0, 50) + '...' });

      const model = await this.getModelInfo(options.model);
      if (!model || model.type !== 'image') {
        throw new ProviderError(`Image model ${options.model} not found`, 'router', 'MODEL_NOT_FOUND', 404);
      }

      console.log('📋 Found model info:', { id: model.id, provider: model.provider, type: model.type });

      const provider = this.providers.get(model.provider);
      if (!provider) {
        throw new ProviderError(`Provider ${model.provider} not available`, 'router', 'PROVIDER_NOT_AVAILABLE', 503);
      }

      console.log('🔌 Found provider:', provider.name);

      // Check if provider has generateImage method
      if ('generateImage' in provider && typeof provider.generateImage === 'function') {
        console.log('🚀 Calling provider generateImage method...');
        const result = await provider.generateImage(options);
        console.log('✅ Provider returned result:', { id: result.id, url: result.url ? 'URL present' : 'No URL' });
        return result;
      } else {
        throw new ProviderError(`Provider ${model.provider} does not support image generation`, 'router', 'METHOD_NOT_SUPPORTED', 501);
      }
    } catch (error) {
      console.error('❌ ModelRouter: Image generation failed:', error);
      throw error;
    }
  }

  async generateVideo(options: {
    prompt: string;
    model: string;
    duration?: number;
    quality?: string;
    imageUrl?: string; // For image-to-video models like Wavespeed
  }): Promise<{
    id: string;
    url: string;
    prompt: string;
    model: string;
    duration: number;
    createdAt: string;
  }> {
    try {
      // Ensure providers are initialized
      if (this.initPromise) {
        await this.initPromise;
        this.initPromise = null;
      }

      console.log('🎬 ModelRouter: Generating video with options:', { model: options.model, prompt: options.prompt.substring(0, 50) + '...' });

      const model = await this.getModelInfo(options.model);
      if (!model || model.type !== 'video') {
        throw new ProviderError(`Video model ${options.model} not found`, 'router', 'MODEL_NOT_FOUND', 404);
      }

      console.log('📋 Found model info:', { id: model.id, provider: model.provider, type: model.type });

      const provider = this.providers.get(model.provider);
      if (!provider) {
        throw new ProviderError(`Provider ${model.provider} not available`, 'router', 'PROVIDER_NOT_AVAILABLE', 503);
      }

      console.log('🔌 Found provider:', provider.name);

      // Check if provider has generateVideo method
      if ('generateVideo' in provider && typeof provider.generateVideo === 'function') {
        console.log('🚀 Calling provider generateVideo method...');
        const result = await provider.generateVideo(options);
        console.log('✅ Provider returned result:', { id: result.id, url: result.url ? 'URL present' : 'No URL' });
        return result;
      } else {
        throw new ProviderError(`Provider ${model.provider} does not support video generation`, 'router', 'METHOD_NOT_SUPPORTED', 501);
      }
    } catch (error) {
      console.error('❌ ModelRouter: Video generation failed:', error);
      throw error;
    }
  }

  private async refreshModelsIfNeeded() {
    const now = Date.now();
    if (now - this.lastRefresh > this.CACHE_TTL) {
      await this.refreshModels();
    }
  }

  private async refreshModels() {
    this.modelCache.clear();
    
    for (const [providerName, provider] of this.providers) {
      try {
        const models = provider.getModels();
        for (const model of models) {
          this.modelCache.set(model.id, model);
        }
        console.log(`📋 Loaded ${models.length} models from ${providerName} provider`);
      } catch (error) {
        console.error(`Failed to refresh models for ${providerName}:`, error);
        // Continue with other providers even if one fails
      }
    }
    
    this.lastRefresh = Date.now();
    console.log(`🔄 Total models loaded: ${this.modelCache.size}`);
  }

  private async findAlternativeModel(request: GenerateRequest): Promise<ModelInfo | null> {
    const currentModel = await this.getModelInfo(request.model);
    if (!currentModel) return null;

    // Find models of the same type from different providers
    const alternatives = Array.from(this.modelCache.values()).filter(model => 
      model.id !== request.model &&
      model.type === currentModel.type &&
      model.provider !== currentModel.provider
    );

    if (alternatives.length === 0) return null;

    // Sort by cost efficiency
    alternatives.sort((a, b) => {
      const costA = a.inputCostPer1kTokens + a.outputCostPer1kTokens;
      const costB = b.inputCostPer1kTokens + b.outputCostPer1kTokens;
      return costA - costB;
    });

    return alternatives[0];
  }

  private async findWorkingAlternative(request: GenerateRequest): Promise<ModelInfo | null> {
    // Get all available models and prefer OpenAI models as they're most reliable
    const alternatives = Array.from(this.modelCache.values()).filter(model => 
      model.id !== request.model &&
      model.type === 'text' // Focus on text models
    );

    if (alternatives.length === 0) return null;

    // Sort by provider preference: OpenAI first, then others
    alternatives.sort((a, b) => {
      if (a.provider === 'openai' && b.provider !== 'openai') return -1;
      if (b.provider === 'openai' && a.provider !== 'openai') return 1;
      
      // Then by cost efficiency
      const costA = a.inputCostPer1kTokens + a.outputCostPer1kTokens;
      const costB = b.inputCostPer1kTokens + b.outputCostPer1kTokens;
      return costA - costB;
    });

    return alternatives[0];
  }
}

// Singleton instance
let modelRouter: ModelRouter | null = null;

export function getModelRouter(): ModelRouter {
  if (!modelRouter) {
    modelRouter = new ModelRouter();
  }
  return modelRouter;
}

// Helper functions for the API routes
export async function routeRequest(request: GenerateRequest): Promise<GenerateResponse> {
  const router = getModelRouter();
  return await router.generateText(request);
}

export async function* routeStreamRequest(request: GenerateRequest): AsyncIterable<GenerateResponse> {
  const router = getModelRouter();
  yield* router.generateStream(request);
}

export async function getModelsForUser(userId: string): Promise<ModelInfo[]> {
  const router = getModelRouter();
  const models = await router.getAvailableModels();
  
  // Get user plan from localStorage (for client-side) or default to 'pro'
  let userPlan = 'pro';
  try {
    if (typeof window !== 'undefined') {
      userPlan = localStorage.getItem('userPlan') || 'pro';
    }
  } catch (error) {
    console.warn('Could not access localStorage:', error);
  }
  
  console.log('🔍 Filtering models for plan:', userPlan);
  
  // Import model access checking
  const { getAvailableModelsForPlan } = await import('./model-access');
  const filteredModels = getAvailableModelsForPlan(userPlan, models);
  
  console.log(`📋 Returning ${filteredModels.length} models for ${userPlan} plan`);
  return filteredModels;
}

export async function validateModelAccess(userId: string, modelId: string): Promise<boolean> {
  const router = getModelRouter();
  
  // Get available models (this will trigger refresh if needed)
  const availableModels = await router.getAvailableModels();
  const model = availableModels.find(m => m.id === modelId);
  console.log('Model info for', modelId, ':', model ? 'found' : 'not found');
  
  if (!model) return false;
  
  // Get user plan from localStorage (for client-side) or default to 'pro'
  let userPlan = 'pro';
  try {
    if (typeof window !== 'undefined') {
      userPlan = localStorage.getItem('userPlan') || 'pro';
    }
  } catch (error) {
    console.warn('Could not access localStorage:', error);
  }
  
  console.log('🔑 Validating access for plan:', userPlan, 'model:', modelId);
  
  // Import model access checking
  const { checkModelAccess } = await import('./model-access');
  
  // Map model types: multimodal models should be checked as text models for plan access
  let modelType: 'text' | 'image' | 'video';
  
  if (model.type === 'multimodal' || model.type === 'text') {
    modelType = 'text';
  } else if (model.type === 'image') {
    modelType = 'image';
  } else if (model.type === 'video') {
    modelType = 'video';
  } else {
    // Default to text for unknown types
    modelType = 'text';
  }
  
  const hasAccess = checkModelAccess(userPlan, modelId, modelType);
  console.log(`🔓 Access result: ${hasAccess} for ${userPlan} -> ${modelId} (${modelType})`);
  
  return hasAccess;
} 