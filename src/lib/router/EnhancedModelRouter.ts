import { ModelProvider, ModelInfo, GenerateRequest, GenerateResponse, ProviderError } from '../providers/base';
import { modelCatalog, ModelFilter, ModelRecommendation } from '../catalog/ModelCatalog';
import { ChromaRAG } from '../rag/ChromaRAG';
import { FirecrawlWebSearch } from '../search/FirecrawlWebSearch';

export interface RouterConfig {
  fallbackStrategy: 'cost-optimized' | 'performance-first' | 'provider-diversity';
  maxRetries: number;
  healthCheckInterval: number;
  enableCaching: boolean;
  enableWebSearch: boolean;
  ragIntegration: boolean;
}

export interface ProviderHealth {
  providerId: string;
  isHealthy: boolean;
  lastChecked: Date;
  errorCount: number;
  averageLatency: number;
}

export interface RequestContext {
  userId?: string;
  sessionId?: string;
  conversationId?: string;
  preferences?: {
    preferredProviders?: string[];
    maxCostPerRequest?: number;
    qualityOverSpeed?: boolean;
  };
}

export interface EnhancedGenerateRequest extends GenerateRequest {
  context?: RequestContext;
  fallbackModels?: string[];
  requireWebSearch?: boolean;
  useRAG?: boolean;
  ragQuery?: string;
}

export interface EnhancedGenerateResponse extends GenerateResponse {
  actualModel: string;
  providerUsed: string;
  fallbacksAttempted: string[];
  cost: number;
  ragResults?: Array<{
    content: string;
    relevanceScore: number;
    source: string;
  }>;
  webSearchResults?: Array<{
    title: string;
    url: string;
    snippet: string;
    relevance: number;
  }>;
  cacheHit?: boolean;
  processingTime: number;
}

export class EnhancedModelRouter {
  private config: RouterConfig;
  private providerHealth: Map<string, ProviderHealth> = new Map();
  private responseCache: Map<string, { response: GenerateResponse; timestamp: number }> = new Map();
  private ragSystem?: ChromaRAG;
  private webSearch?: FirecrawlWebSearch;
  private requestQueue: Map<string, Promise<EnhancedGenerateResponse>> = new Map();

  // Standard code formatting instructions for all models
  private readonly codeFormattingInstructions = `

🚨 MANDATORY CODE FORMATTING RULES - NO EXCEPTIONS:

1. NEVER send raw code without markdown fences
2. ALWAYS use proper language-specific fences:
   - React/JSX: \`\`\`jsx
   - JavaScript: \`\`\`javascript
   - TypeScript: \`\`\`typescript
   - Python: \`\`\`python
   - Java: \`\`\`java
   - CSS: \`\`\`css
   - HTML: \`\`\`html

3. COMPLETE FENCE STRUCTURE (streaming-safe):
   \`\`\`language
   // code here
   \`\`\`

4. NEVER do this (broken streaming):
   ❌ import React from 'react';
   ❌ function Component() {
   ❌   return <div>Hello</div>;
   ❌ }

5. ALWAYS do this (correct streaming):
   ✅ Here's a React component:
   ✅ 
   ✅ \`\`\`jsx
   ✅ import React from 'react';
   ✅ function Component() {
   ✅   return <div>Hello</div>;
   ✅ }
   ✅ \`\`\`

6. For inline code: Use single backticks \`like this\`

7. STREAMING REQUIREMENTS:
   - Send complete opening fence: \`\`\`jsx (never partial)
   - Send complete closing fence: \`\`\` on its own line
   - Separate explanation text from code blocks
   - Use proper language identifiers

VIOLATION OF THESE RULES BREAKS THE UI - FOLLOW STRICTLY!`;

  // Model-specific identity system prompts
  private readonly modelIdentityPrompts: Map<string, string> = new Map([
    // Kimi models
    ['moonshotai/kimi-k2', `You are Kimi, an AI assistant created by Moonshot AI. You are helpful, accurate, and friendly. You should always identify yourself as Kimi when asked about your identity.${this.codeFormattingInstructions}`],
    ['moonshotai/kimi-k1', `You are Kimi, an AI assistant created by Moonshot AI. You are helpful, accurate, and friendly. You should always identify yourself as Kimi when asked about your identity.${this.codeFormattingInstructions}`],
    
    // Grok models
    ['x-ai/grok-4', `You are Grok, an AI assistant created by xAI. You are helpful, maximally truthful, and a bit cheeky, inspired by the Hitchhiker's Guide to the Galaxy. You should always identify yourself as Grok when asked about your identity.${this.codeFormattingInstructions}`],
    ['x-ai/grok-3', `You are Grok, an AI assistant created by xAI. You are helpful, maximally truthful, and a bit cheeky, inspired by the Hitchhiker's Guide to the Galaxy. You should always identify yourself as Grok when asked about your identity.${this.codeFormattingInstructions}`],
    ['x-ai/grok-2', `You are Grok, an AI assistant created by xAI. You are helpful, maximally truthful, and a bit cheeky, inspired by the Hitchhiker's Guide to the Galaxy. You should always identify yourself as Grok when asked about your identity.${this.codeFormattingInstructions}`],
    
    // Claude models
    ['claude-3-5-sonnet-20241022', `You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest. You should always identify yourself as Claude when asked about your identity.${this.codeFormattingInstructions}`],
    ['claude-3-opus-20240229', `You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest. You should always identify yourself as Claude when asked about your identity.${this.codeFormattingInstructions}`],
    ['claude-3-haiku-20240307', `You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest. You should always identify yourself as Claude when asked about your identity.${this.codeFormattingInstructions}`],
    
    // GPT models
    ['gpt-4', `You are ChatGPT, an AI assistant created by OpenAI. You are helpful, informative, and designed to assist with a wide range of tasks. You should always identify yourself as ChatGPT when asked about your identity.${this.codeFormattingInstructions}`],
    ['gpt-4-turbo', `You are ChatGPT, an AI assistant created by OpenAI. You are helpful, informative, and designed to assist with a wide range of tasks. You should always identify yourself as ChatGPT when asked about your identity.${this.codeFormattingInstructions}`],
    ['gpt-4o', `You are ChatGPT, an AI assistant created by OpenAI. You are helpful, informative, and designed to assist with a wide range of tasks. You should always identify yourself as ChatGPT when asked about your identity.${this.codeFormattingInstructions}`],
    ['gpt-4o-mini', `You are ChatGPT, an AI assistant created by OpenAI. You are helpful, informative, and designed to assist with a wide range of tasks. You should always identify yourself as ChatGPT when asked about your identity.${this.codeFormattingInstructions}`],
    ['gpt-4.1-nano-2025-04-14', `You are ChatGPT, an AI assistant created by OpenAI. You are helpful, informative, and designed to assist with a wide range of tasks. You should always identify yourself as ChatGPT when asked about your identity.${this.codeFormattingInstructions}`],
    
    // Gemini models
    ['gemini-pro', `You are Gemini, an AI assistant created by Google. You are helpful, accurate, and designed to assist with various tasks. You should always identify yourself as Gemini when asked about your identity.${this.codeFormattingInstructions}`],
    ['gemini-pro-vision', `You are Gemini, an AI assistant created by Google. You are helpful, accurate, and designed to assist with various tasks. You should always identify yourself as Gemini when asked about your identity.${this.codeFormattingInstructions}`],
    ['gemini-2.5-flash', `You are Gemini, an AI assistant created by Google. You are helpful, accurate, and designed to assist with various tasks. You should always identify yourself as Gemini when asked about your identity.${this.codeFormattingInstructions}`],
    
    // Llama models
    ['meta-llama/llama-3.2-90b-instruct', `You are Llama, an AI assistant created by Meta. You are helpful, accurate, and designed to assist with various tasks. You should always identify yourself as Llama when asked about your identity.${this.codeFormattingInstructions}`],
    ['meta-llama/llama-3.1-405b-instruct', `You are Llama, an AI assistant created by Meta. You are helpful, accurate, and designed to assist with various tasks. You should always identify yourself as Llama when asked about your identity.${this.codeFormattingInstructions}`],
    
    // DeepSeek models
    ['deepseek/deepseek-chat:free', `You are DeepSeek, an AI assistant created by DeepSeek AI. You are helpful, intelligent, and designed to assist with various tasks. You should always identify yourself as DeepSeek when asked about your identity.${this.codeFormattingInstructions}`],
    ['deepseek/deepseek-chat', `You are DeepSeek, an AI assistant created by DeepSeek AI. You are helpful, intelligent, and designed to assist with various tasks. You should always identify yourself as DeepSeek when asked about your identity.${this.codeFormattingInstructions}`],
    
    // Gemma models
    ['google/gemma-3n-e4b-it:free', `You are Gemma, an AI assistant created by Google DeepMind. You are helpful, accurate, and designed to assist with various tasks. You should always identify yourself as Gemma when asked about your identity. IMPORTANT: If you receive conversation context or previous messages, you DO have access to conversation memory and should acknowledge and use that information when users ask about previous interactions.${this.codeFormattingInstructions}`],
    ['google/gemma-2-9b-it:free', `You are Gemma, an AI assistant created by Google DeepMind. You are helpful, accurate, and designed to assist with various tasks. You should always identify yourself as Gemma when asked about your identity. IMPORTANT: If you receive conversation context or previous messages, you DO have access to conversation memory and should acknowledge and use that information when users ask about previous interactions.${this.codeFormattingInstructions}`],
  ]);

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = {
      fallbackStrategy: 'cost-optimized',
      maxRetries: 3,
      healthCheckInterval: 300000, // 5 minutes
      enableCaching: true,
      enableWebSearch: true,
      ragIntegration: true,
      ...config
    };

    if (this.config.ragIntegration) {
      try {
        this.ragSystem = new ChromaRAG();
      } catch (error) {
        console.warn('⚠️ RAG system initialization failed:', error);
      }
    }

    if (this.config.enableWebSearch) {
      try {
        this.webSearch = new FirecrawlWebSearch();
      } catch (error) {
        console.warn('⚠️ Web search initialization failed:', error);
      }
    }

    this.startHealthMonitoring();
  }

  async generateText(request: EnhancedGenerateRequest): Promise<EnhancedGenerateResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId(request);
    
    // Check for duplicate requests (temporarily disabled for testing)
    // if (this.requestQueue.has(requestId)) {
    //   console.log('🔄 Returning cached response for duplicate request');
    //   return await this.requestQueue.get(requestId)!;
    // }

    // Create promise for this request
    const responsePromise = this.processRequest(request, startTime);
    this.requestQueue.set(requestId, responsePromise);

    try {
      const response = await responsePromise;
      return response;
    } finally {
      this.requestQueue.delete(requestId);
    }
  }

  private async processRequest(request: EnhancedGenerateRequest, startTime: number): Promise<EnhancedGenerateResponse> {
    // Check cache first (temporarily disabled for testing)
    // if (this.config.enableCaching) {
    //   const cached = this.getCachedResponse(request);
    //   if (cached) {
    //     return {
    //       ...cached,
    //       cacheHit: true,
    //       processingTime: Date.now() - startTime,
    //       fallbacksAttempted: [],
    //       actualModel: request.model,
    //       providerUsed: 'cache',
    //       cost: 0
    //     };
    //   }
    // }

    // Preprocess user message for code-related requests
    const preprocessedRequest = this.preprocessCodeRequests(request);
    
    // Add model identity system prompt FIRST
    const identityEnhancedRequest = this.addModelIdentityPrompt(preprocessedRequest);
    
    // Enhance request with RAG if needed
    const enhancedRequest = await this.enhanceWithRAG(identityEnhancedRequest);
    
    // Enhance with web search if needed
    const finalRequest = await this.enhanceWithWebSearch(enhancedRequest);

    // Select best model if not specified
    const modelToUse = await this.selectOptimalModel(finalRequest);
    finalRequest.model = modelToUse.id;

    // Attempt generation with fallbacks
    const response = await this.generateWithFallbacks(finalRequest);

    // Store conversation in RAG if successful
    if (this.ragSystem && request.context?.userId && response.content) {
      try {
        await this.storeConversationInRAG(request, response);
      } catch (error) {
        console.warn('⚠️ Failed to store conversation in RAG:', error);
      }
    }

    // Cache successful response
    if (this.config.enableCaching && response.content) {
      this.cacheResponse(finalRequest, response);
    }

    return {
      ...response,
      processingTime: Date.now() - startTime,
      cacheHit: false
    };
  }

  private addModelIdentityPrompt(request: EnhancedGenerateRequest): EnhancedGenerateRequest {
    const modelId = request.model;
    const identityPrompt = this.modelIdentityPrompts.get(modelId);
    
    console.log('🔧 Model identity lookup:', { modelId, hasIdentityPrompt: !!identityPrompt });
    
    // Use specific prompt or default with code formatting
    const effectivePrompt = identityPrompt || 
      `You are a helpful AI assistant. You are designed to assist users with a wide range of tasks and questions.${this.codeFormattingInstructions}`;
    
    if (!identityPrompt) {
      console.log('⚠️ Using default prompt with code formatting for model:', modelId);
    }

    const messages = [...request.messages];
    
    // Add language enforcement and capability clarification to all models
    const languageEnforcement = "IMPORTANT: Always respond in English unless the user explicitly requests a different language.";
    const capabilityEnforcement = "IMPORTANT: You CAN read, analyze, and process files that users upload including PDFs, images, documents, and other file types. When users upload files, you should analyze their content and provide helpful responses about them. Do not say you cannot read files.";
    const mathEnforcement = "CRITICAL MATH RULES - READ THIS CAREFULLY: When writing mathematical expressions, you MUST use proper LaTeX syntax. NEVER EVER use $1$ as a placeholder. Examples of what to write: For logarithms write $\\log_b(x)$ or $\\ln(x)$. For square roots write $\\sqrt{x}$. For derivatives write $\\frac{d}{dx}(x^2) = 2x$. For integrals write $\\int x^2 dx = \\frac{x^3}{3} + C$. For fractions write $\\frac{1}{x}$. For exponentials write $e^x$. FORBIDDEN: Do not write $1$, do not write empty expressions, do not use placeholders. Write the actual mathematical expression every time.";
    const fullPrompt = `${effectivePrompt}\n\n${languageEnforcement}\n\n${capabilityEnforcement}\n\n${mathEnforcement}`;
    
    // Debug: Log the system prompt to verify it's being applied
    console.log('🔍 System prompt applied:', fullPrompt);
    
    // Check if there's already a system message
    if (messages.length > 0 && messages[0].role === 'system') {
      // Prepend identity to existing system message
      messages[0] = {
        ...messages[0],
        content: `${fullPrompt}\n\n${messages[0].content}`
      };
    } else {
      // Add identity as new system message
      messages.unshift({
        role: 'system',
        content: fullPrompt
      });
    }

    return {
      ...request,
      messages
    };
  }

  private async enhanceWithRAG(request: EnhancedGenerateRequest): Promise<EnhancedGenerateRequest> {
    if (!this.ragSystem || !request.useRAG || !request.context?.userId) {
      return request;
    }

    try {
      const query = request.ragQuery || request.messages[request.messages.length - 1]?.content || '';
      const memories = await this.ragSystem.searchRelevantMemories(
        request.context.userId,
        query,
        5
      );

      if (memories.length > 0) {
        const ragContext = memories
          .map(m => `Relevant memory: ${m.content} (Relevance: ${m.relevanceScore.toFixed(2)})`)
          .join('\n');

        // Add RAG context to system message (but preserve identity)
        const enhancedMessages = [...request.messages];
        if (enhancedMessages[0]?.role === 'system') {
          enhancedMessages[0] = {
            ...enhancedMessages[0],
            content: `${enhancedMessages[0].content}\n\nRelevant context from previous conversations:\n${ragContext}`
          };
        } else {
          enhancedMessages.unshift({
            role: 'system',
            content: `Relevant context from previous conversations:\n${ragContext}`
          });
        }

        return {
          ...request,
          messages: enhancedMessages
        };
      }
    } catch (error) {
      console.warn('⚠️ RAG enhancement failed:', error);
    }

    return request;
  }

  private async enhanceWithWebSearch(request: EnhancedGenerateRequest): Promise<EnhancedGenerateRequest> {
    if (!this.webSearch || !request.requireWebSearch) {
      return request;
    }

    try {
      const lastUserMessage = request.messages[request.messages.length - 1];
      if (lastUserMessage?.role !== 'user') return request;

      const searchResults = await this.webSearch.searchWeb(lastUserMessage.content, {
        maxResults: 3,
        language: 'en'
      });

      if (searchResults.length > 0) {
        const webContext = searchResults
          .map(result => `Web source: ${result.title}\nURL: ${result.url}\nContent: ${result.snippet}`)
          .join('\n\n');

        const enhancedMessages = [...request.messages];
        enhancedMessages[enhancedMessages.length - 1] = {
          ...lastUserMessage,
          content: `${lastUserMessage.content}\n\nReal-time web information:\n${webContext}`
        };

        return {
          ...request,
          messages: enhancedMessages
        };
      }
    } catch (error) {
      console.warn('⚠️ Web search enhancement failed:', error);
    }

    return request;
  }

  private async selectOptimalModel(request: EnhancedGenerateRequest): Promise<ModelInfo> {
    // If model is already specified, try to use it
    if (request.model) {
      const specifiedModel = await modelCatalog.getModelById(request.model);
      if (specifiedModel && this.isProviderHealthy(specifiedModel.provider)) {
        return specifiedModel;
      }
    }

    // Determine task type from request
    const taskType = this.detectTaskType(request);
    
    // Get recommendations based on task and user preferences
    const recommendations = await modelCatalog.getRecommendations({
      task: taskType,
      budget: this.getBudgetPreference(request.context?.preferences),
      speed: request.context?.preferences?.qualityOverSpeed ? 'quality' : 'balanced',
      contextLength: this.calculateRequiredContext(request)
    });

    // Filter by healthy providers and user preferences
    const viableRecommendations = recommendations.filter(rec => {
      const isHealthy = this.isProviderHealthy(rec.model.provider);
      const isPreferred = !request.context?.preferences?.preferredProviders ||
        request.context.preferences.preferredProviders.includes(rec.model.provider);
      const isAffordable = !request.context?.preferences?.maxCostPerRequest ||
        rec.model.inputCostPer1kTokens <= request.context.preferences.maxCostPerRequest;
      
      return isHealthy && isPreferred && isAffordable;
    });

    if (viableRecommendations.length === 0) {
      // Provide more detailed error information
      const providerHealth = await modelCatalog.getProviderHealth();
      const totalProviders = Object.keys(providerHealth).length;
      const totalRecommendations = recommendations.length;
      const healthyCount = recommendations.filter(rec => this.isProviderHealthy(rec.model.provider)).length;
      const preferredCount = recommendations.filter(rec => 
        !request.context?.preferences?.preferredProviders ||
        request.context.preferences.preferredProviders.includes(rec.model.provider)
      ).length;
      const affordableCount = recommendations.filter(rec =>
        !request.context?.preferences?.maxCostPerRequest ||
        rec.model.inputCostPer1kTokens <= request.context.preferences.maxCostPerRequest
      ).length;

      const errorDetails = [
        `Total providers configured: ${totalProviders}`,
        `Total model recommendations: ${totalRecommendations}`,
        `Healthy providers: ${healthyCount}`,
        `Preferred providers: ${preferredCount}`,
        `Affordable models: ${affordableCount}`
      ].join(', ');

             if (totalProviders === 0) {
         const suggestedKeys = [
           'OPENAI_API_KEY=your-openai-key',
           'OPENROUTER_API_KEY=your-openrouter-key (provides access to 400+ models)',
           'ANTHROPIC_API_KEY=your-anthropic-key'
         ];
         throw new Error(`No AI model providers are configured. Please add at least one API key to your .env.local file:\n\n${suggestedKeys.join('\n')}\n\nThen restart your development server.`);
       }

      throw new Error(`No viable models available for request. Debug info: ${errorDetails}`);
    }

    // Apply fallback strategy
    switch (this.config.fallbackStrategy) {
      case 'cost-optimized':
        return viableRecommendations.sort((a, b) => 
          a.model.inputCostPer1kTokens - b.model.inputCostPer1kTokens
        )[0].model;
      
      case 'performance-first':
        return viableRecommendations[0].model; // Already sorted by score
      
      case 'provider-diversity':
        // Try to use different provider than last used
        const lastProvider = this.getLastUsedProvider(request.context?.sessionId);
        const differentProvider = viableRecommendations.find(rec => 
          rec.model.provider !== lastProvider
        );
        return (differentProvider || viableRecommendations[0]).model;
      
      default:
        return viableRecommendations[0].model;
    }
  }

  private async generateWithFallbacks(request: EnhancedGenerateRequest): Promise<EnhancedGenerateResponse> {
    const fallbacksAttempted: string[] = [];
    let lastError: Error | null = null;

    // Build fallback model list
    const fallbackModels = await this.buildFallbackList(request);

    for (const modelId of fallbackModels) {
      const model = await modelCatalog.getModelById(modelId);
      if (!model) continue;

      const provider = modelCatalog.getProvider(model.provider);
      if (!provider) continue;

      try {
        console.log(`🚀 Attempting generation with ${modelId} (${model.provider})`);
        
        const response = await provider.generateText({
          ...request,
          model: modelId
        });

        const cost = this.calculateCost(response.usage, model);

        return {
          ...response,
          actualModel: modelId,
          providerUsed: model.provider,
          fallbacksAttempted,
          cost,
          processingTime: 0 // Will be set by caller
        };

      } catch (error: any) {
        console.warn(`❌ Generation failed with ${modelId}:`, error.message);
        fallbacksAttempted.push(modelId);
        lastError = error;

        // Update provider health
        this.updateProviderHealth(model.provider, false, error);

        // Check if we should retry with this provider
        if (error instanceof ProviderError && !error.retryable) {
          continue;
        }
      }
    }

    throw new Error(`All fallbacks exhausted. Last error: ${lastError?.message}`);
  }

  private async buildFallbackList(request: EnhancedGenerateRequest): Promise<string[]> {
    const fallbacks: string[] = [];

    // Start with requested model
    if (request.model) {
      fallbacks.push(request.model);
    }

    // Add user-specified fallbacks
    if (request.fallbackModels) {
      fallbacks.push(...request.fallbackModels);
    }

    // Add intelligent fallbacks based on task type
    const taskType = this.detectTaskType(request);
    const recommendations = await modelCatalog.getRecommendations({
      task: taskType,
      budget: 'medium'
    });

    // Add top 3 recommendations that aren't already in the list
    for (const rec of recommendations.slice(0, 3)) {
      if (!fallbacks.includes(rec.model.id)) {
        fallbacks.push(rec.model.id);
      }
    }

    // Add free models as last resort
    const freeModels = await modelCatalog.getModelsByFilter({ freeOnly: true });
    for (const model of freeModels.slice(0, 2)) {
      if (!fallbacks.includes(model.id)) {
        fallbacks.push(model.id);
      }
    }

    return fallbacks.slice(0, this.config.maxRetries + 1);
  }

  private detectTaskType(request: EnhancedGenerateRequest): 'text' | 'code' | 'creative' | 'analysis' | 'multimodal' | 'image' | 'video' | 'audio' {
    const lastMessage = request.messages[request.messages.length - 1]?.content?.toLowerCase() || '';
    
    if (lastMessage.includes('code') || lastMessage.includes('programming') || lastMessage.includes('function')) {
      return 'code';
    }
    if (lastMessage.includes('creative') || lastMessage.includes('story') || lastMessage.includes('poem')) {
      return 'creative';
    }
    if (lastMessage.includes('analyze') || lastMessage.includes('reasoning') || lastMessage.includes('problem')) {
      return 'analysis';
    }
    if (request.attachedImages && request.attachedImages.length > 0) {
      return 'multimodal';
    }
    
    return 'text';
  }

  private getBudgetPreference(preferences?: RequestContext['preferences']): 'free' | 'low' | 'medium' | 'high' {
    if (!preferences?.maxCostPerRequest) return 'medium';
    
    if (preferences.maxCostPerRequest === 0) return 'free';
    if (preferences.maxCostPerRequest <= 0.001) return 'low';
    if (preferences.maxCostPerRequest <= 0.01) return 'medium';
    return 'high';
  }

  private calculateRequiredContext(request: EnhancedGenerateRequest): number {
    const totalContent = request.messages
      .map(m => m.content)
      .join(' ')
      .length;
    
    // Rough estimation: 4 chars per token
    return Math.max(8192, Math.ceil(totalContent / 4) * 2);
  }

  private isProviderHealthy(providerId: string): boolean {
    const health = this.providerHealth.get(providerId);
    if (!health) return true; // Assume healthy if no data
    
    return health.isHealthy && health.errorCount < 5;
  }

  private updateProviderHealth(providerId: string, success: boolean, error?: Error): void {
    const existing = this.providerHealth.get(providerId) || {
      providerId,
      isHealthy: true,
      lastChecked: new Date(),
      errorCount: 0,
      averageLatency: 0
    };

    if (success) {
      existing.errorCount = Math.max(0, existing.errorCount - 1);
      existing.isHealthy = true;
    } else {
      existing.errorCount += 1;
      if (existing.errorCount >= 3) {
        existing.isHealthy = false;
      }
    }

    existing.lastChecked = new Date();
    this.providerHealth.set(providerId, existing);
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const health = await modelCatalog.getProviderHealth();
        for (const [providerId, isHealthy] of Object.entries(health)) {
          this.updateProviderHealth(providerId, isHealthy);
        }
      } catch (error) {
        console.warn('⚠️ Health monitoring failed:', error);
      }
    }, this.config.healthCheckInterval);
  }

  private generateRequestId(request: EnhancedGenerateRequest): string {
    const content = request.messages.map(m => m.content).join('|');
    const modelId = request.model || '';
    const userId = request.context?.userId || 'anonymous';
    // Include user ID and model ID to ensure different models and users get different responses
    return Buffer.from(`${userId}:${modelId}:${content}`).toString('base64').slice(0, 32);
  }

  private getCachedResponse(request: EnhancedGenerateRequest): GenerateResponse | null {
    if (!this.config.enableCaching) return null;
    
    const requestId = this.generateRequestId(request);
    const cached = this.responseCache.get(requestId);
    
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      return cached.response;
    }
    
    if (cached) {
      this.responseCache.delete(requestId);
    }
    
    return null;
  }

  private cacheResponse(request: EnhancedGenerateRequest, response: GenerateResponse): void {
    if (!this.config.enableCaching) return;
    
    const requestId = this.generateRequestId(request);
    this.responseCache.set(requestId, {
      response,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (this.responseCache.size > 1000) {
      const oldestKey = Array.from(this.responseCache.keys())[0];
      this.responseCache.delete(oldestKey);
    }
  }

  private calculateCost(usage: any, model: ModelInfo): number {
    if (!usage) return 0;
    
    const inputCost = (usage.promptTokens || 0) / 1000 * model.inputCostPer1kTokens;
    const outputCost = (usage.completionTokens || 0) / 1000 * model.outputCostPer1kTokens;
    
    return inputCost + outputCost;
  }

  private async storeConversationInRAG(
    request: EnhancedGenerateRequest, 
    response: GenerateResponse
  ): Promise<void> {
    if (!this.ragSystem || !request.context?.userId) return;

    const conversation = {
      id: request.context.conversationId || `conv-${Date.now()}`,
      userId: request.context.userId,
      messages: [
        ...request.messages
          .filter(msg => msg.role !== 'function')
          .map(msg => ({
            content: msg.content,
            role: msg.role as 'system' | 'user' | 'assistant',
            timestamp: new Date(),
            model: request.model
          })),
        {
          content: response.content,
          role: 'assistant' as const,
          timestamp: new Date(),
          model: response.model
        }
      ]
    };

    try {
      await this.ragSystem.storeConversation(request.context.userId, conversation);
    } catch (error) {
      console.error('❌ Failed to store conversation in RAG system:', error.message);
      // Don't throw the error - continue with the request
    }
  }

  private getLastUsedProvider(sessionId?: string): string | null {
    // In a real implementation, this would check session storage
    return null;
  }

  async *generateStream(request: EnhancedGenerateRequest): AsyncGenerator<GenerateResponse, void, unknown> {
    const model = await this.selectOptimalModel(request);
    const provider = modelCatalog.getProvider(model.provider);
    
    if (!provider) {
      throw new Error(`Provider ${model.provider} not available`);
    }

    request.model = model.id;
    
    // Apply the same enhancement pipeline as non-streaming (CRITICAL FIX)
    console.log('🔧 Applying system prompts to streaming request for model:', model.id);
    console.log('📝 Original messages:', JSON.stringify(request.messages, null, 2));
    
    // 0. Preprocess user message for code-related requests
    const preprocessedRequest = this.preprocessCodeRequests(request);
    
    // 1. Add model identity and system prompts
    const identityEnhancedRequest = this.addModelIdentityPrompt(preprocessedRequest);
    
    // 2. Enhance with RAG if enabled
    const ragEnhancedRequest = this.ragSystem 
      ? await this.enhanceWithRAG(identityEnhancedRequest)
      : identityEnhancedRequest;
    
    // 3. Enhance with web search if enabled
    const finalRequest = this.webSearch && request.useWebSearch
      ? await this.enhanceWithWebSearch(ragEnhancedRequest)
      : ragEnhancedRequest;
    
    console.log('📝 Final enhanced messages being sent to provider:', JSON.stringify(finalRequest.messages, null, 2));
    
    try {
      for await (const chunk of provider.generateStream(finalRequest)) {
        yield {
          ...chunk,
          metadata: {
            ...chunk.metadata,
            provider: model.provider,
            model: model.id
          }
        };
      }
    } catch (error: any) {
      console.error(`❌ Streaming failed with ${model.id}:`, error);
      throw error;
    }
  }

  /**
   * Preprocess user messages to add explicit formatting instructions for code requests
   */
  private preprocessCodeRequests(request: EnhancedGenerateRequest): EnhancedGenerateRequest {
    const lastMessage = request.messages[request.messages.length - 1];
    
    if (lastMessage?.role === 'user') {
      const content = lastMessage.content.toLowerCase();
      
      // Detect code-related requests
      const codeKeywords = [
        'calculator', 'component', 'function', 'code', 'script', 'program',
        'javascript', 'react', 'python', 'html', 'css', 'typescript',
        'build', 'create', 'write', 'implement', 'develop'
      ];
      
      const isCodeRequest = codeKeywords.some(keyword => 
        content.includes(keyword)
      );
      
      if (isCodeRequest) {
        console.log('🔧 Detected code request, adding explicit formatting instructions');
        
        const formattingReminder = `

CRITICAL FORMATTING REQUIREMENT: You MUST wrap ALL code in proper markdown code blocks.

For React components, use:
\`\`\`jsx
import React from 'react';
// Your React code
\`\`\`

For JavaScript, use:
\`\`\`javascript
// Your JavaScript code
\`\`\`

NEVER provide code as plain text. ALWAYS use the triple backtick (\`\`\`) format with language specifiers.
Your response will be considered incorrect if code is not properly formatted in code blocks.

`;
        
        // Add formatting instructions to the user message
        const enhancedContent = formattingReminder + lastMessage.content;
        
        return {
          ...request,
          messages: [
            ...request.messages.slice(0, -1),
            {
              ...lastMessage,
              content: enhancedContent
            }
          ]
        };
      }
    }
    
    return request;
  }

  getProviderHealth(): Map<string, ProviderHealth> {
    return new Map(this.providerHealth);
  }

  async getAvailableModels(filter?: ModelFilter): Promise<ModelInfo[]> {
    return await modelCatalog.getModelsByFilter(filter || {});
  }

  async getModelRecommendations(task: string): Promise<ModelRecommendation[]> {
    return await modelCatalog.getRecommendations({
      task: task as any,
      budget: 'medium'
    });
  }
}

// Export singleton instance
export const enhancedModelRouter = new EnhancedModelRouter();