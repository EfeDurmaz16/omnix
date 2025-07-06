/**
 * Analytics Tracker for OmniX
 * Automatically tracks model usage across the application
 */

import { modelAnalytics } from './ModelAnalytics';

export interface TrackingConfig {
  enabled: boolean;
  trackSuccess: boolean;
  trackErrors: boolean;
  trackCosts: boolean;
  trackPerformance: boolean;
}

export class AnalyticsTracker {
  private config: TrackingConfig = {
    enabled: true,
    trackSuccess: true,
    trackErrors: true,
    trackCosts: true,
    trackPerformance: true
  };

  /**
   * Track a model API call
   */
  async trackModelUsage(params: {
    userId: string;
    modelId: string;
    provider: string;
    requestType: 'text' | 'image' | 'video' | 'audio' | 'multimodal';
    input: string | any;
    startTime: number;
    success: boolean;
    error?: string;
    response?: any;
    tokensUsed?: number;
    cost?: number;
    quality?: string;
    mode?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const endTime = performance.now();
      const responseTime = endTime - params.startTime;

      // Calculate token usage if not provided
      let tokensUsed = params.tokensUsed || 0;
      if (!tokensUsed && params.input && params.response) {
        tokensUsed = this.estimateTokens(params.input, params.response);
      }

      // Calculate cost if not provided
      let cost = params.cost || 0;
      if (!cost && tokensUsed > 0) {
        cost = await this.estimateCost(params.modelId, tokensUsed);
      }

      // Determine input/output lengths
      const inputLength = typeof params.input === 'string' 
        ? params.input.length 
        : JSON.stringify(params.input).length;
      
      const outputLength = params.response 
        ? (typeof params.response === 'string' ? params.response.length : JSON.stringify(params.response).length)
        : 0;

      // Get model context window
      const contextWindow = await this.getModelContextWindow(params.modelId);

      // Record the event
      modelAnalytics.recordEvent({
        userId: params.userId,
        modelId: params.modelId,
        provider: params.provider,
        requestType: params.requestType,
        tokensUsed,
        responseTime,
        success: params.success,
        error: params.error,
        cost,
        inputLength,
        outputLength,
        quality: params.quality,
        mode: params.mode,
        contextWindow,
        metadata: {
          ...params.metadata,
          trackedAt: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
          endpoint: this.inferEndpoint(params.modelId, params.requestType)
        }
      });

      console.log(`📊 Tracked model usage: ${params.modelId} (${responseTime.toFixed(2)}ms, $${cost.toFixed(4)})`);
    } catch (error) {
      console.error('❌ Failed to track model usage:', error);
    }
  }

  /**
   * Track text generation
   */
  async trackTextGeneration(params: {
    userId: string;
    modelId: string;
    provider: string;
    prompt: string;
    response: string;
    startTime: number;
    success: boolean;
    error?: string;
    tokensUsed?: number;
    cost?: number;
    mode?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.trackModelUsage({
      ...params,
      requestType: 'text',
      input: params.prompt,
      response: params.response
    });
  }

  /**
   * Track image generation
   */
  async trackImageGeneration(params: {
    userId: string;
    modelId: string;
    provider: string;
    prompt: string;
    imageUrl?: string;
    startTime: number;
    success: boolean;
    error?: string;
    quality?: string;
    size?: string;
    cost?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.trackModelUsage({
      ...params,
      requestType: 'image',
      input: params.prompt,
      response: params.imageUrl,
      metadata: {
        ...params.metadata,
        imageSize: params.size,
        imageQuality: params.quality
      }
    });
  }

  /**
   * Track multimodal requests (text + image)
   */
  async trackMultimodalRequest(params: {
    userId: string;
    modelId: string;
    provider: string;
    messages: any[];
    response: string;
    startTime: number;
    success: boolean;
    error?: string;
    tokensUsed?: number;
    cost?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const hasImages = params.messages.some(msg => 
      Array.isArray(msg.content) && 
      msg.content.some((content: any) => content.type === 'image_url')
    );

    await this.trackModelUsage({
      ...params,
      requestType: hasImages ? 'multimodal' : 'text',
      input: params.messages,
      response: params.response
    });
  }

  /**
   * Track video generation
   */
  async trackVideoGeneration(params: {
    userId: string;
    modelId: string;
    provider: string;
    prompt: string;
    videoUrl?: string;
    startTime: number;
    success: boolean;
    error?: string;
    duration?: number;
    quality?: string;
    cost?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.trackModelUsage({
      ...params,
      requestType: 'video',
      input: params.prompt,
      response: params.videoUrl || '',
      metadata: {
        ...params.metadata,
        videoDuration: params.duration,
        videoQuality: params.quality
      }
    });
  }

  /**
   * Update tracking configuration
   */
  updateConfig(newConfig: Partial<TrackingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📊 Analytics tracking config updated:', this.config);
  }

  /**
   * Get current tracking configuration
   */
  getConfig(): TrackingConfig {
    return { ...this.config };
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(input: any, output: any): number {
    const inputText = typeof input === 'string' ? input : JSON.stringify(input);
    const outputText = typeof output === 'string' ? output : JSON.stringify(output);
    
    // Rough estimation: ~4 characters per token for English text
    const totalChars = inputText.length + outputText.length;
    return Math.ceil(totalChars / 4);
  }

  /**
   * Estimate cost based on model and token usage
   */
  private async estimateCost(modelId: string, tokens: number): Promise<number> {
    try {
      // Import model catalog to get pricing info
      const { modelCatalog } = await import('../catalog/ModelCatalog');
      const model = await modelCatalog.getModelById(modelId);
      
      if (model) {
        // Assume 70% input tokens, 30% output tokens for cost calculation
        const inputTokens = Math.floor(tokens * 0.7);
        const outputTokens = Math.floor(tokens * 0.3);
        
        const inputCost = (inputTokens / 1000) * model.inputCostPer1kTokens;
        const outputCost = (outputTokens / 1000) * model.outputCostPer1kTokens;
        
        return inputCost + outputCost;
      }
    } catch (error) {
      console.warn('Failed to estimate cost for', modelId, error);
    }
    
    return 0;
  }

  /**
   * Get model context window size
   */
  private async getModelContextWindow(modelId: string): Promise<number | undefined> {
    try {
      const { modelCatalog } = await import('../catalog/ModelCatalog');
      const model = await modelCatalog.getModelById(modelId);
      return model?.contextWindow;
    } catch (error) {
      console.warn('Failed to get context window for', modelId, error);
      return undefined;
    }
  }

  /**
   * Infer the API endpoint based on model and request type
   */
  private inferEndpoint(modelId: string, requestType: string): string {
    if (requestType === 'image') {
      return '/api/chat/image';
    } else if (requestType === 'multimodal') {
      return '/api/chat/multimodal';
    } else {
      return '/api/chat';
    }
  }

  /**
   * Get analytics summary for debugging
   */
  getAnalyticsSummary(): any {
    return modelAnalytics.getRealTimeStats();
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`📊 Analytics tracking ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Singleton instance
export const analyticsTracker = new AnalyticsTracker();