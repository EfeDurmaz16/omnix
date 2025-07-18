import { ModelProvider, ModelInfo } from '../providers/base';
import { OpenAIProvider } from '../providers/openai';
import { ClaudeProvider } from '../providers/claude';
import { VertexAIProvider } from '../providers/vertex';
import { WavespeedProvider } from '../providers/wavespeed';
import { OpenRouterProvider } from '../providers/openrouter';
import { ReplicateProvider } from '../providers/replicate';
import { ReplicateVideoProvider } from '../providers/replicate-video';
import { LumaVideoProvider } from '../providers/luma-video';
import { modelCatalogCache, providerCache } from '../cache/MemoryCache';

export interface ModelCategory {
  id: string;
  name: string;
  description: string;
  models: ModelInfo[];
  priority: number;
}

export interface ModelFilter {
  provider?: string;
  category?: string;
  type?: 'text' | 'multimodal' | 'image' | 'video' | 'audio';
  maxCost?: number;
  minContextWindow?: number;
  capabilities?: string[];
  freeOnly?: boolean;
}

export interface ModelRecommendation {
  model: ModelInfo;
  score: number;
  reason: string;
  alternatives: ModelInfo[];
}

export class ModelCatalog {
  private providers: Map<string, ModelProvider> = new Map();
  private models: ModelInfo[] = [];
  private categories: Map<string, ModelCategory> = new Map();
  private initialized = false;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    try {
      // Initialize existing providers
      if (process.env.OPENAI_API_KEY) {
        this.providers.set('openai', new OpenAIProvider());
      }
      
      if (process.env.ANTHROPIC_API_KEY) {
        this.providers.set('claude', new ClaudeProvider());
      }
      
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.providers.set('vertex', new VertexAIProvider());
      }
      
      if (process.env.WAVESPEED_API_KEY) {
        this.providers.set('wavespeed', new WavespeedProvider());
      }
      
      // Initialize new providers
      if (process.env.OPENROUTER_API_KEY) {
        this.providers.set('openrouter', new OpenRouterProvider());
      }
      
      if (process.env.REPLICATE_API_TOKEN) {
        this.providers.set('replicate', new ReplicateProvider());
        this.providers.set('replicate-video', new ReplicateVideoProvider());
      }
      
      // Initialize video-specific providers
      if (process.env.LUMA_API_KEY) {
        this.providers.set('luma-video', new LumaVideoProvider());
      }

      console.log(`🏭 Initialized ${this.providers.size} providers`);
    } catch (error) {
      console.error('❌ Error initializing providers:', error);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 Initializing Model Catalog...');
      
      // Check if we have cached models first
      const cachedModels = modelCatalogCache.get('all_models');
      const cachedCategories = modelCatalogCache.get('categories');
      
      if (cachedModels && cachedCategories) {
        console.log('⚡ Using cached model catalog data');
        this.models = cachedModels;
        this.categories = cachedCategories;
        this.initialized = true;
        return;
      }
      
      // Load models from all providers
      await this.loadAllModels();
      
      // Create model categories
      this.createCategories();
      
      // Cache the results
      modelCatalogCache.set('all_models', this.models);
      modelCatalogCache.set('categories', this.categories);
      console.log('💾 Cached model catalog data for future requests');
      
      this.initialized = true;
      console.log(`✅ Model Catalog initialized with ${this.models.length} models across ${this.categories.size} categories`);
    } catch (error) {
      console.error('❌ Failed to initialize Model Catalog:', error);
      throw error;
    }
  }

  private async loadAllModels(): Promise<void> {
    this.models = [];
    
    for (const [providerId, provider] of this.providers) {
      try {
        // Check if we have cached models for this provider
        const providerCacheKey = `provider_models_${providerId}`;
        const cachedProviderModels = providerCache.get(providerCacheKey);
        
        let providerModels: ModelInfo[] = [];
        
        if (cachedProviderModels) {
          console.log(`⚡ Using cached models for provider ${providerId}`);
          providerModels = cachedProviderModels;
        } else {
          // Load models from provider
          if (typeof (provider as any).listModels === 'function') {
            // Enhanced providers like OpenRouter that can fetch live models
            console.log(`🔄 Fetching live models from ${providerId}...`);
            providerModels = await (provider as any).listModels();
          } else if (typeof provider.getModels === 'function') {
            // Standard providers with static model lists
            providerModels = provider.getModels();
          } else {
            console.warn(`⚠️ Provider ${providerId} has no model listing method`);
            continue;
          }
          
          // Cache the provider models (longer TTL for static providers, shorter for dynamic)
          const isStaticProvider = typeof provider.getModels === 'function';
          const cacheTTL = isStaticProvider ? 60 * 60 * 1000 : 15 * 60 * 1000; // 1hr vs 15min
          
          providerCache.set(providerCacheKey, providerModels, cacheTTL);
          console.log(`💾 Cached ${providerModels.length} models from ${providerId}`);
        }
        
        this.models.push(...providerModels);
        console.log(`📦 Loaded ${providerModels.length} models from ${providerId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to load models from ${providerId}:`, error);
        
        // Try to use stale cached data if available
        const staleCacheKey = `provider_models_${providerId}`;
        const staleModels = providerCache.get(staleCacheKey);
        if (staleModels) {
          console.log(`🔄 Using stale cached models for ${providerId} due to error`);
          this.models.push(...staleModels);
        }
      }
    }
  }

  private createCategories(): void {
    const categoryDefinitions = [
      {
        id: 'free',
        name: 'Free Models',
        description: 'No-cost models for experimentation and light usage',
        priority: 1,
        filter: (model: ModelInfo) => model.inputCostPer1kTokens === 0 && model.outputCostPer1kTokens === 0
      },
      {
        id: 'cost-effective',
        name: 'Cost-Effective',
        description: 'High-value models with excellent performance per dollar',
        priority: 2,
        filter: (model: ModelInfo) => model.inputCostPer1kTokens <= 0.001 && model.inputCostPer1kTokens > 0
      },
      {
        id: 'flagship',
        name: 'Flagship Models',
        description: 'State-of-the-art models with cutting-edge capabilities',
        priority: 3,
        filter: (model: ModelInfo) => 
          model.category === 'flagship' || 
          model.id.includes('gpt-4') || 
          model.id.includes('claude-3.5') ||
          model.id.includes('gemini-2.0')
      },
      {
        id: 'coding',
        name: 'Code Generation',
        description: 'Specialized models for programming and development',
        priority: 4,
        filter: (model: ModelInfo) => 
          model.category === 'coding' ||
          model.capabilities.some(cap => cap.type === 'code-generation' && cap.supported)
      },
      {
        id: 'multimodal',
        name: 'Vision & Multimodal',
        description: 'Models that can process images, videos, and mixed content',
        priority: 5,
        filter: (model: ModelInfo) => 
          model.type === 'multimodal' ||
          model.capabilities.some(cap => cap.type === 'image-analysis' && cap.supported)
      },
      {
        id: 'image-generation',
        name: 'Image Generation',
        description: 'Models for creating and editing images',
        priority: 6,
        filter: (model: ModelInfo) => 
          model.type === 'image' &&
          model.capabilities.some(cap => cap.type === 'image-generation' && cap.supported)
      },
      {
        id: 'video-generation',
        name: 'Video Generation',
        description: 'Models for creating and editing videos',
        priority: 7,
        filter: (model: ModelInfo) => 
          model.type === 'video' ||
          model.capabilities.some(cap => cap.type === 'video-generation' && cap.supported)
      },
      {
        id: 'audio-generation',
        name: 'Audio & Music',
        description: 'Models for audio processing and music generation',
        priority: 8,
        filter: (model: ModelInfo) => 
          model.type === 'audio' ||
          model.capabilities.some(cap => cap.type === 'audio-generation' && cap.supported)
      },
      {
        id: 'reasoning',
        name: 'Reasoning Models',
        description: 'Models optimized for complex reasoning and problem-solving',
        priority: 9,
        filter: (model: ModelInfo) => 
          model.category === 'reasoning' ||
          model.capabilities.some(cap => cap.type === 'reasoning' && cap.supported) ||
          model.id.includes('reasoning') ||
          model.id.includes('think')
      },
      {
        id: 'web-search',
        name: 'Web-Connected',
        description: 'Models with real-time web search capabilities',
        priority: 10,
        filter: (model: ModelInfo) => 
          model.category === 'web-search' ||
          model.capabilities.some(cap => cap.type === 'web-search' && cap.supported)
      },
      {
        id: 'creative',
        name: 'Creative Writing',
        description: 'Models optimized for creative and artistic tasks',
        priority: 11,
        filter: (model: ModelInfo) => 
          model.category === 'creative' ||
          model.capabilities.some(cap => cap.type === 'creative-writing' && cap.supported)
      },
      {
        id: 'image-processing',
        name: 'Image Processing',
        description: 'Models for image enhancement, upscaling, and editing',
        priority: 12,
        filter: (model: ModelInfo) => 
          model.category === 'image-processing' ||
          model.capabilities.some(cap => 
            ['image-enhancement', 'image-upscaling', 'background-removal'].includes(cap.type) && cap.supported
          )
      }
    ];

    this.categories.clear();
    
    for (const categoryDef of categoryDefinitions) {
      const models = this.models.filter(categoryDef.filter);
      
      if (models.length > 0) {
        this.categories.set(categoryDef.id, {
          id: categoryDef.id,
          name: categoryDef.name,
          description: categoryDef.description,
          models: models.sort((a, b) => a.inputCostPer1kTokens - b.inputCostPer1kTokens),
          priority: categoryDef.priority
        });
      }
    }
  }

  async getAllModels(refresh = false): Promise<ModelInfo[]> {
    if (!this.initialized || refresh) {
      await this.initialize();
    }
    return [...this.models];
  }

  async getModelsByFilter(filter: ModelFilter): Promise<ModelInfo[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Create cache key from filter parameters
    const filterKey = `filter_${JSON.stringify(filter)}`;
    const cachedResult = modelCatalogCache.get(filterKey);
    
    if (cachedResult) {
      console.log('⚡ Using cached filter results');
      return cachedResult;
    }

    let filteredModels = [...this.models];

    if (filter.provider) {
      filteredModels = filteredModels.filter(model => model.provider === filter.provider);
    }

    if (filter.category) {
      const category = this.categories.get(filter.category);
      if (category) {
        const categoryModelIds = new Set(category.models.map(m => m.id));
        filteredModels = filteredModels.filter(model => categoryModelIds.has(model.id));
      }
    }

    if (filter.type) {
      filteredModels = filteredModels.filter(model => model.type === filter.type);
    }

    if (filter.maxCost !== undefined) {
      filteredModels = filteredModels.filter(model => 
        model.inputCostPer1kTokens <= filter.maxCost!
      );
    }

    if (filter.minContextWindow) {
      filteredModels = filteredModels.filter(model => 
        model.contextWindow >= filter.minContextWindow!
      );
    }

    if (filter.freeOnly) {
      filteredModels = filteredModels.filter(model => 
        model.inputCostPer1kTokens === 0 && model.outputCostPer1kTokens === 0
      );
    }

    if (filter.capabilities) {
      filteredModels = filteredModels.filter(model =>
        filter.capabilities!.every(requiredCap =>
          model.capabilities.some(cap => cap.type === requiredCap && cap.supported)
        )
      );
    }

    // Cache the filtered results for 10 minutes
    modelCatalogCache.set(filterKey, filteredModels, 10 * 60 * 1000);
    console.log(`💾 Cached filter results (${filteredModels.length} models)`);

    return filteredModels;
  }

  async getCategories(): Promise<ModelCategory[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return Array.from(this.categories.values())
      .sort((a, b) => a.priority - b.priority);
  }

  async getModelById(modelId: string): Promise<ModelInfo | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Cache individual model lookups
    const modelCacheKey = `model_${modelId}`;
    const cachedModel = modelCatalogCache.get(modelCacheKey);
    
    if (cachedModel) {
      return cachedModel;
    }
    
    const model = this.models.find(model => model.id === modelId) || null;
    
    // Cache the result (even if null)
    modelCatalogCache.set(modelCacheKey, model, 30 * 60 * 1000); // 30 minutes
    
    return model;
  }

  async getRecommendations(
    requirements: {
      task: 'text' | 'code' | 'creative' | 'analysis' | 'multimodal' | 'image' | 'video' | 'audio';
      budget?: 'free' | 'low' | 'medium' | 'high';
      speed?: 'fast' | 'balanced' | 'quality';
      contextLength?: number;
    }
  ): Promise<ModelRecommendation[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const recommendations: ModelRecommendation[] = [];
    
    // Define task-specific filters
    const taskFilters: Record<string, Partial<ModelFilter>> = {
      text: { capabilities: ['text-generation'] },
      code: { capabilities: ['code-generation'] },
      creative: { capabilities: ['creative-writing'] },
      analysis: { capabilities: ['reasoning'] },
      multimodal: { type: 'multimodal' },
      image: { type: 'image' },
      video: { type: 'video' },
      audio: { type: 'audio' }
    };

    const budgetLimits = {
      free: 0,
      low: 0.001,
      medium: 0.01,
      high: Infinity
    };

    const candidates = await this.getModelsByFilter({
      ...taskFilters[requirements.task],
      maxCost: requirements.budget ? budgetLimits[requirements.budget] : undefined,
      minContextWindow: requirements.contextLength
    });

    // Score models based on requirements
    for (const model of candidates.slice(0, 10)) { // Top 10 candidates
      let score = 0;
      let reason = '';

      // Budget scoring
      if (model.inputCostPer1kTokens === 0) {
        score += 30;
        reason += 'Free to use. ';
      } else if (model.inputCostPer1kTokens <= 0.001) {
        score += 20;
        reason += 'Very cost-effective. ';
      }

      // Provider reliability scoring
      if (['openai', 'claude', 'vertex'].includes(model.provider)) {
        score += 20;
        reason += 'Reliable provider. ';
      }

      // Context window scoring
      if (model.contextWindow >= 100000) {
        score += 15;
        reason += 'Large context window. ';
      }

      // Task-specific scoring
      const relevantCapabilities = model.capabilities.filter(cap => cap.supported);
      score += relevantCapabilities.length * 5;

      // Speed vs quality scoring
      if (requirements.speed === 'fast' && model.id.includes('turbo')) {
        score += 10;
        reason += 'Optimized for speed. ';
      } else if (requirements.speed === 'quality' && model.category === 'flagship') {
        score += 15;
        reason += 'Premium quality model. ';
      }

      const alternatives = candidates
        .filter(m => m.id !== model.id && m.provider !== model.provider)
        .slice(0, 3);

      recommendations.push({
        model,
        score,
        reason: reason.trim(),
        alternatives
      });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  async getProviderHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [providerId, provider] of this.providers) {
      try {
        health[providerId] = await provider.healthCheck();
      } catch {
        health[providerId] = false;
      }
    }
    
    return health;
  }

  async getStatistics(): Promise<{
    totalModels: number;
    providerBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
    freeModels: number;
    averageCost: number;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const providerBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};
    const typeBreakdown: Record<string, number> = {};

    for (const model of this.models) {
      // Provider breakdown
      providerBreakdown[model.provider] = (providerBreakdown[model.provider] || 0) + 1;
      
      // Category breakdown
      if (model.category) {
        categoryBreakdown[model.category] = (categoryBreakdown[model.category] || 0) + 1;
      }
      
      // Type breakdown
      typeBreakdown[model.type] = (typeBreakdown[model.type] || 0) + 1;
    }

    const freeModels = this.models.filter(m => 
      m.inputCostPer1kTokens === 0 && m.outputCostPer1kTokens === 0
    ).length;

    const paidModels = this.models.filter(m => m.inputCostPer1kTokens > 0);
    const averageCost = paidModels.length > 0 
      ? paidModels.reduce((sum, m) => sum + m.inputCostPer1kTokens, 0) / paidModels.length
      : 0;

    return {
      totalModels: this.models.length,
      providerBreakdown,
      categoryBreakdown,
      typeBreakdown,
      freeModels,
      averageCost
    };
  }

  getProvider(providerId: string): ModelProvider | undefined {
    return this.providers.get(providerId);
  }

  getProviderCount(): number {
    return this.providers.size;
  }

  getConfiguredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async refreshModels(): Promise<void> {
    console.log('🔄 Refreshing model catalog...');
    await this.loadAllModels();
    this.createCategories();
    console.log(`✅ Refreshed catalog with ${this.models.length} models`);
  }
}

// Singleton instance with auto-initialization
export const modelCatalog = new ModelCatalog();

// Auto-initialize the catalog when the module is loaded
modelCatalog.initialize().catch(error => {
  console.error('❌ Failed to auto-initialize model catalog:', error);
});