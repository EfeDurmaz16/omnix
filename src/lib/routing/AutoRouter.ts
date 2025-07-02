/**
 * Auto-Routing Engine
 * Intelligently routes queries to optimal models based on content analysis
 */

import { costOptimizer } from '../optimization/CostOptimizer';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: 'text' | 'image' | 'video';
  contextWindow: number;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  capabilities: string[];
}

export interface RoutingRequest {
  query: string;
  userPlan: 'free' | 'pro' | 'ultra' | 'enterprise';
  userPreference: 'cost' | 'balanced' | 'quality' | 'speed';
  hasAutoRouting: boolean;
  currentModel?: string;
  context?: {
    conversationHistory?: string[];
    taskComplexity?: 'low' | 'medium' | 'high';
    expectedLength?: 'short' | 'medium' | 'long';
  };
}

export interface RoutingResult {
  recommendedModel: ModelInfo;
  routingReason: string;
  confidence: number; // 0-1 scale
  shouldRedirect: boolean;
  redirectPage?: 'image' | 'video' | 'chat';
  alternativeModels: ModelInfo[];
  estimatedCost: number;
  estimatedSpeed: number; // response time in seconds
}

export interface QueryAnalysis {
  type: 'simple' | 'complex' | 'creative' | 'analytical' | 'code' | 'image' | 'video' | 'multimodal';
  complexity: 'low' | 'medium' | 'high';
  expectedLength: 'short' | 'medium' | 'long';
  hasMedia: boolean;
  mediaType?: 'image' | 'video' | 'audio';
  keywords: string[];
  urgency: 'low' | 'medium' | 'high';
  domainSpecific: boolean;
  language: string;
}

export class AutoRouter {
  private static instance: AutoRouter;
  
  // Model categorization by capability and cost
  private readonly modelCategories = {
    ultraFast: ['gpt-4o-mini', 'claude-3-5-haiku-20241022', 'gemini-2.0-flash-001'],
    balanced: ['gpt-3.5-turbo', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro'],
    highQuality: ['gpt-4o', 'gpt-4o-2024-11-20', 'claude-3-opus-20240229', 'o1-preview'],
    creative: ['gpt-4o', 'claude-3-opus-20240229', 'claude-3-5-sonnet-20241022'],
    analytical: ['o1-preview', 'o1-mini', 'claude-3-opus-20240229', 'gemini-1.5-pro'],
    coding: ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gpt-3.5-turbo'],
    multimodal: ['gpt-4o', 'gpt-4o-2024-11-20', 'claude-3-opus-20240229', 'gemini-1.5-pro']
  };

  static getInstance(): AutoRouter {
    if (!AutoRouter.instance) {
      AutoRouter.instance = new AutoRouter();
    }
    return AutoRouter.instance;
  }

  /**
   * Main routing function - determines the best model for a query
   */
  async routeQuery(request: RoutingRequest): Promise<RoutingResult> {
    if (!request.hasAutoRouting) {
      // Return current model if auto-routing is disabled
      const currentModel = await this.getModelInfo(request.currentModel || 'gpt-3.5-turbo');
      return {
        recommendedModel: currentModel,
        routingReason: 'Auto-routing disabled by user',
        confidence: 1.0,
        shouldRedirect: false,
        alternativeModels: [],
        estimatedCost: 0.002, // Default estimate
        estimatedSpeed: 3.0
      };
    }

    // Analyze the query
    const analysis = await this.analyzeQuery(request.query);
    
    // Check for redirection needs (image/video generation)
    const redirectResult = this.checkForRedirection(analysis);
    if (redirectResult.shouldRedirect) {
      return redirectResult;
    }

    // Select optimal model based on analysis and preferences
    const modelSelection = await this.selectOptimalModel(analysis, request);
    
    return modelSelection;
  }

  /**
   * Analyze query to understand its characteristics
   */
  private async analyzeQuery(query: string): Promise<QueryAnalysis> {
    const queryLower = query.toLowerCase();
    const words = query.split(/\s+/);
    
    // Detect type and complexity
    const type = this.detectQueryType(queryLower);
    const complexity = this.assessComplexity(query, words);
    const expectedLength = this.estimateResponseLength(queryLower, words);
    
    // Detect media requests
    const mediaDetection = this.detectMediaRequests(queryLower);
    
    // Extract keywords and assess domain specificity
    const keywords = this.extractKeywords(queryLower);
    const domainSpecific = this.isDomainSpecific(keywords);
    
    // Assess urgency based on language patterns
    const urgency = this.assessUrgency(queryLower);
    
    return {
      type,
      complexity,
      expectedLength,
      hasMedia: mediaDetection.hasMedia,
      mediaType: mediaDetection.mediaType,
      keywords,
      urgency,
      domainSpecific,
      language: 'en' // Could be enhanced with language detection
    };
  }

  private detectQueryType(query: string): QueryAnalysis['type'] {
    // Image generation patterns
    if (this.matchesPatterns(query, [
      'generate image', 'create picture', 'make image', 'draw', 'generate photo',
      'create artwork', 'design image', 'make picture', 'create visual',
      'generate illustration', 'create logo', 'make banner'
    ])) {
      return 'image';
    }

    // Video generation patterns
    if (this.matchesPatterns(query, [
      'generate video', 'create video', 'make video', 'video generation',
      'create animation', 'make clip', 'generate clip'
    ])) {
      return 'video';
    }

    // Code-related patterns
    if (this.matchesPatterns(query, [
      'write code', 'debug', 'function', 'algorithm', 'programming',
      'script', 'sql', 'python', 'javascript', 'react', 'api'
    ])) {
      return 'code';
    }

    // Creative writing patterns
    if (this.matchesPatterns(query, [
      'write story', 'poem', 'creative writing', 'narrative', 'fiction',
      'character', 'plot', 'dialogue', 'screenplay'
    ])) {
      return 'creative';
    }

    // Analytical patterns
    if (this.matchesPatterns(query, [
      'analyze', 'analysis', 'compare', 'evaluate', 'assess', 'research',
      'summarize', 'review', 'critique', 'examine'
    ])) {
      return 'analytical';
    }

    // Simple question patterns
    if (this.matchesPatterns(query, [
      'what is', 'who is', 'when', 'where', 'how many', 'define',
      'explain briefly', 'quick question'
    ]) && query.length < 100) {
      return 'simple';
    }

    // Multimodal patterns
    if (this.matchesPatterns(query, [
      'with image', 'describe image', 'analyze picture', 'based on image',
      'image shows', 'in the picture'
    ])) {
      return 'multimodal';
    }

    // Default to complex for longer, detailed queries
    return query.length > 200 ? 'complex' : 'simple';
  }

  private assessComplexity(query: string, words: string[]): QueryAnalysis['complexity'] {
    let complexityScore = 0;

    // Length factor
    if (words.length > 50) complexityScore += 2;
    else if (words.length > 20) complexityScore += 1;

    // Complex keywords
    const complexKeywords = [
      'comprehensive', 'detailed', 'thorough', 'analyze', 'compare',
      'evaluate', 'complex', 'advanced', 'deep dive', 'multifaceted'
    ];
    complexityScore += complexKeywords.filter(k => query.toLowerCase().includes(k)).length;

    // Multiple questions or tasks
    const questionMarks = (query.match(/\?/g) || []).length;
    if (questionMarks > 1) complexityScore += 1;

    // Technical terms
    const technicalTerms = [
      'algorithm', 'architecture', 'implementation', 'optimization',
      'database', 'api', 'framework', 'machine learning', 'neural network'
    ];
    complexityScore += technicalTerms.filter(t => query.toLowerCase().includes(t)).length;

    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  private estimateResponseLength(query: string, words: string[]): QueryAnalysis['expectedLength'] {
    // Indicators for short responses
    if (this.matchesPatterns(query, [
      'yes or no', 'true or false', 'quick answer', 'briefly',
      'in one word', 'simple answer', 'just tell me'
    ])) {
      return 'short';
    }

    // Indicators for long responses
    if (this.matchesPatterns(query, [
      'detailed explanation', 'comprehensive', 'step by step',
      'thorough analysis', 'complete guide', 'everything about',
      'full tutorial', 'in depth'
    ])) {
      return 'long';
    }

    // Based on query length and complexity
    if (words.length < 10) return 'short';
    if (words.length > 30) return 'long';
    return 'medium';
  }

  private detectMediaRequests(query: string): { hasMedia: boolean; mediaType?: 'image' | 'video' | 'audio' } {
    if (this.matchesPatterns(query, [
      'generate image', 'create picture', 'make image', 'draw',
      'create artwork', 'design', 'illustration', 'logo'
    ])) {
      return { hasMedia: true, mediaType: 'image' };
    }

    if (this.matchesPatterns(query, [
      'generate video', 'create video', 'make video', 'animation'
    ])) {
      return { hasMedia: true, mediaType: 'video' };
    }

    return { hasMedia: false };
  }

  private checkForRedirection(analysis: QueryAnalysis): RoutingResult {
    if (analysis.type === 'image') {
      return {
        recommendedModel: { id: 'dalle-3', name: 'DALL-E 3' } as ModelInfo,
        routingReason: 'Image generation request detected - redirecting to image generator',
        confidence: 0.9,
        shouldRedirect: true,
        redirectPage: 'image',
        alternativeModels: [],
        estimatedCost: 0.04,
        estimatedSpeed: 10.0
      };
    }

    if (analysis.type === 'video') {
      return {
        recommendedModel: { id: 'veo-2', name: 'Google Veo 2' } as ModelInfo,
        routingReason: 'Video generation request detected - redirecting to video generator',
        confidence: 0.9,
        shouldRedirect: true,
        redirectPage: 'video',
        alternativeModels: [],
        estimatedCost: 0.20,
        estimatedSpeed: 30.0
      };
    }

    return {
      recommendedModel: {} as ModelInfo,
      routingReason: '',
      confidence: 0,
      shouldRedirect: false,
      alternativeModels: [],
      estimatedCost: 0,
      estimatedSpeed: 0
    };
  }

  private async selectOptimalModel(analysis: QueryAnalysis, request: RoutingRequest): Promise<RoutingResult> {
    let candidateModels: string[] = [];
    let routingReason = '';

    // Select model category based on analysis
    switch (analysis.type) {
      case 'simple':
        candidateModels = this.modelCategories.ultraFast;
        routingReason = 'Simple query - using fast, cost-effective model';
        break;
      
      case 'creative':
        candidateModels = this.modelCategories.creative;
        routingReason = 'Creative task - using model optimized for creative writing';
        break;
      
      case 'analytical':
        candidateModels = this.modelCategories.analytical;
        routingReason = 'Analytical task - using model with strong reasoning capabilities';
        break;
      
      case 'code':
        candidateModels = this.modelCategories.coding;
        routingReason = 'Coding task - using model optimized for programming';
        break;
      
      case 'multimodal':
        candidateModels = this.modelCategories.multimodal;
        routingReason = 'Multimodal task - using vision-capable model';
        break;
      
      default:
        // Use preference-based selection
        switch (request.userPreference) {
          case 'cost':
            candidateModels = this.modelCategories.ultraFast;
            routingReason = 'Cost-optimized selection';
            break;
          case 'speed':
            candidateModels = this.modelCategories.ultraFast;
            routingReason = 'Speed-optimized selection';
            break;
          case 'quality':
            candidateModels = this.modelCategories.highQuality;
            routingReason = 'Quality-optimized selection';
            break;
          default:
            candidateModels = this.modelCategories.balanced;
            routingReason = 'Balanced performance selection';
        }
    }

    // Filter by user plan
    const availableModels = this.filterByUserPlan(candidateModels, request.userPlan);
    
    // Smart model selection instead of just picking the first
    const selectedModelId = await this.selectBestFromCandidates(
      availableModels, 
      analysis, 
      request.userPreference,
      request.currentModel
    );
    
    const recommendedModel = await this.getModelInfo(selectedModelId);
    
    // Get alternatives (excluding the selected one)
    const alternativeModels = await Promise.all(
      availableModels
        .filter(id => id !== selectedModelId)
        .slice(0, 3)
        .map(id => this.getModelInfo(id))
    );

    // Estimate cost and speed
    const estimatedCost = this.estimateCost(recommendedModel, analysis);
    const estimatedSpeed = this.estimateSpeed(recommendedModel, analysis);

    // Calculate confidence based on analysis clarity
    const confidence = this.calculateConfidence(analysis, request);

    return {
      recommendedModel,
      routingReason,
      confidence,
      shouldRedirect: false,
      alternativeModels,
      estimatedCost,
      estimatedSpeed
    };
  }

  private async selectBestFromCandidates(
    candidates: string[], 
    analysis: QueryAnalysis, 
    userPreference: string,
    currentModel?: string
  ): Promise<string> {
    if (candidates.length === 0) {
      return 'gpt-3.5-turbo'; // Fallback
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // If current model is in candidates and it's suitable, prefer it for consistency
    if (currentModel && candidates.includes(currentModel)) {
      // But only if the query doesn't clearly need a different type of model
      const needsUpgrade = analysis.complexity === 'high' || 
                          analysis.type === 'analytical' || 
                          analysis.type === 'creative';
      
      const currentIsBasic = ['gpt-3.5-turbo', 'claude-3-5-haiku-20241022', 'gemini-2.0-flash-001'].includes(currentModel);
      
      if (!needsUpgrade || !currentIsBasic) {
        return currentModel;
      }
    }

    // Score each candidate based on suitability
    const scoredCandidates = await Promise.all(
      candidates.map(async (modelId) => {
        const model = await this.getModelInfo(modelId);
        let score = 0;

        // Base scoring by model category
        if (analysis.type === 'creative' && ['gpt-4o', 'claude-3-opus-20240229', 'claude-3-5-sonnet-20241022'].includes(modelId)) {
          score += 30;
        }
        if (analysis.type === 'analytical' && ['o1-preview', 'o1-mini', 'claude-3-opus-20240229', 'gemini-1.5-pro'].includes(modelId)) {
          score += 30;
        }
        if (analysis.type === 'code' && ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gpt-3.5-turbo'].includes(modelId)) {
          score += 30;
        }
        if (analysis.type === 'simple' && ['gpt-4o-mini', 'claude-3-5-haiku-20241022', 'gemini-2.0-flash-001'].includes(modelId)) {
          score += 30;
        }

        // Complexity-based scoring
        if (analysis.complexity === 'high') {
          if (['gpt-4o', 'o1-preview', 'claude-3-opus-20240229'].includes(modelId)) score += 20;
        } else if (analysis.complexity === 'low') {
          if (['gpt-4o-mini', 'claude-3-5-haiku-20241022', 'gemini-2.0-flash-001'].includes(modelId)) score += 20;
        }

        // User preference scoring
        const cost = model.inputCostPer1kTokens + model.outputCostPer1kTokens;
        if (userPreference === 'cost') {
          score += Math.max(0, 20 - (cost * 10000)); // Lower cost = higher score
        } else if (userPreference === 'quality') {
          if (['gpt-4o', 'o1-preview', 'claude-3-opus-20240229'].includes(modelId)) score += 25;
        } else if (userPreference === 'speed') {
          if (['gpt-4o-mini', 'claude-3-5-haiku-20241022', 'gemini-2.0-flash-001'].includes(modelId)) score += 25;
        }

        // Length-based preference
        if (analysis.expectedLength === 'long' && ['gpt-4o', 'claude-3-opus-20240229', 'o1-preview'].includes(modelId)) {
          score += 15;
        } else if (analysis.expectedLength === 'short' && ['gpt-4o-mini', 'claude-3-5-haiku-20241022'].includes(modelId)) {
          score += 15;
        }

        return { modelId, score };
      })
    );

    // Sort by score and return the best
    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates[0].modelId;
  }

  private filterByUserPlan(models: string[], userPlan: string): string[] {
    const planModelAccess: { [key: string]: string[] } = {
      'free': ['gpt-3.5-turbo', 'claude-3-5-haiku-20241022', 'gemini-2.0-flash-001'],
      'pro': ['gpt-3.5-turbo', 'gpt-4o-mini', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'gemini-2.0-flash-001', 'gemini-1.5-pro'],
      'ultra': ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-11-20', 'o1-mini', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'gemini-2.0-flash-001', 'gemini-1.5-pro'],
      'enterprise': ['*'] // All models
    };

    const allowedModels = planModelAccess[userPlan] || planModelAccess['free'];
    
    if (allowedModels.includes('*')) {
      return models;
    }

    return models.filter(model => allowedModels.includes(model));
  }

  private async getModelInfo(modelId: string): Promise<ModelInfo> {
    // This would normally fetch from your model database
    const modelData: { [key: string]: Partial<ModelInfo> } = {
      'gpt-3.5-turbo': { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', inputCostPer1kTokens: 0.0005, outputCostPer1kTokens: 0.0015 },
      'gpt-4o': { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', inputCostPer1kTokens: 0.0025, outputCostPer1kTokens: 0.01 },
      'gpt-4o-mini': { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', inputCostPer1kTokens: 0.00015, outputCostPer1kTokens: 0.0006 },
      'gpt-4o-2024-11-20': { id: 'gpt-4o-2024-11-20', name: 'GPT-4o Latest', provider: 'openai', inputCostPer1kTokens: 0.0025, outputCostPer1kTokens: 0.01 },
      'o1-preview': { id: 'o1-preview', name: 'o1 Preview', provider: 'openai', inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.06 },
      'o1-mini': { id: 'o1-mini', name: 'o1 Mini', provider: 'openai', inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.012 },
      'claude-3-5-haiku-20241022': { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', inputCostPer1kTokens: 0.00025, outputCostPer1kTokens: 0.00125 },
      'claude-3-5-sonnet-20241022': { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.015 },
      'claude-3-opus-20240229': { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.075 },
      'gemini-2.0-flash-001': { id: 'gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'google', inputCostPer1kTokens: 0.000075, outputCostPer1kTokens: 0.0003 },
      'gemini-1.5-pro': { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', inputCostPer1kTokens: 0.00035, outputCostPer1kTokens: 0.00105 }
    };

    return {
      id: modelId,
      name: modelId,
      provider: 'unknown',
      type: 'text',
      contextWindow: 4096,
      inputCostPer1kTokens: 0.001,
      outputCostPer1kTokens: 0.002,
      capabilities: ['text'],
      ...modelData[modelId]
    } as ModelInfo;
  }

  private estimateCost(model: ModelInfo, analysis: QueryAnalysis): number {
    const inputTokens = this.estimateInputTokens(analysis);
    const outputTokens = this.estimateOutputTokens(analysis);
    
    return ((inputTokens / 1000) * (model.inputCostPer1kTokens || 0.001)) +
           ((outputTokens / 1000) * (model.outputCostPer1kTokens || 0.002));
  }

  private estimateSpeed(model: ModelInfo, analysis: QueryAnalysis): number {
    // Base speed estimates (seconds) for different models
    const modelSpeeds: { [key: string]: number } = {
      'gpt-3.5-turbo': 1.5,
      'gpt-4o': 2.5,
      'gpt-4o-mini': 1.2,
      'gpt-4o-2024-11-20': 2.5,
      'o1-preview': 15.0, // o1 models are much slower due to reasoning
      'o1-mini': 8.0,
      'claude-3-5-haiku-20241022': 1.0,
      'claude-3-5-sonnet-20241022': 2.0,
      'claude-3-opus-20240229': 4.0,
      'gemini-2.0-flash-001': 0.8,
      'gemini-1.5-pro': 2.5
    };

    const baseSpeed = modelSpeeds[model.id] || 2.0;
    
    // Adjust for complexity
    const complexityMultiplier = {
      'low': 0.8,
      'medium': 1.0,
      'high': 1.5
    }[analysis.complexity] || 1.0;

    return baseSpeed * complexityMultiplier;
  }

  private estimateInputTokens(analysis: QueryAnalysis): number {
    const baseTokens = {
      'simple': 20,
      'complex': 100,
      'creative': 50,
      'analytical': 80,
      'code': 60,
      'image': 30,
      'video': 40,
      'multimodal': 70
    }[analysis.type] || 50;

    return baseTokens;
  }

  private estimateOutputTokens(analysis: QueryAnalysis): number {
    const baseLengthTokens = {
      'short': 50,
      'medium': 200,
      'long': 800
    }[analysis.expectedLength] || 200;

    const typeMultiplier: { [key: string]: number } = {
      'creative': 1.5,
      'analytical': 1.3,
      'code': 1.2,
      'simple': 0.5,
      'complex': 1.4,
      'image': 0.3,
      'video': 0.4,
      'multimodal': 1.1
    };

    const multiplier = typeMultiplier[analysis.type] || 1.0;

    return Math.round(baseLengthTokens * multiplier);
  }

  private calculateConfidence(analysis: QueryAnalysis, request: RoutingRequest): number {
    let confidence = 0.7; // Base confidence

    // High confidence for clear patterns
    if (analysis.type === 'image' || analysis.type === 'video') confidence = 0.95;
    if (analysis.type === 'simple' && analysis.complexity === 'low') confidence = 0.9;
    if (analysis.type === 'code') confidence = 0.85;

    // Adjust for domain specificity
    if (analysis.domainSpecific) confidence += 0.05;

    // Adjust for query clarity
    if (analysis.keywords.length > 3) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const stopWords = new Set(['the', 'is', 'are', 'was', 'were', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    return query.split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  private isDomainSpecific(keywords: string[]): boolean {
    const domainTerms = [
      'medical', 'legal', 'technical', 'scientific', 'academic',
      'financial', 'programming', 'marketing', 'engineering'
    ];
    return keywords.some(keyword => domainTerms.includes(keyword));
  }

  private assessUrgency(query: string): QueryAnalysis['urgency'] {
    if (this.matchesPatterns(query, ['urgent', 'asap', 'immediately', 'quickly', 'fast'])) {
      return 'high';
    }
    if (this.matchesPatterns(query, ['soon', 'priority', 'important'])) {
      return 'medium';
    }
    return 'low';
  }
}

// Export singleton instance
export const autoRouter = AutoRouter.getInstance();