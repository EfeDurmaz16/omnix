import { 
  ModelProvider, 
  ModelInfo, 
  GenerateRequest, 
  GenerateResponse, 
  ProviderError,
  RateLimitError
} from './base';
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeProvider implements ModelProvider {
  name = 'claude';
  private client: Anthropic | null = null;
  private initialized = false;

  models: ModelInfo[] = [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      provider: 'claude',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.015,
      maxTokens: 64000,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'image-analysis', supported: true }
      ]
    },
    {
      id: 'claude-opus-4-20250514',
      name: 'Claude Opus 4',
      provider: 'claude',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.015,
      outputCostPer1kTokens: 0.075,
      maxTokens: 32000,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'image-analysis', supported: true }
      ]
    },
    {
      id: 'claude-3-7-sonnet-20250219',
      name: 'Claude 3.7 Sonnet',
      provider: 'claude',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.015,
      maxTokens: 64000,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'image-analysis', supported: true }
      ]
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'claude',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.015,
      maxTokens: 8192,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'image-analysis', supported: true }
      ]
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'claude',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.0008,
      outputCostPer1kTokens: 0.004,
      maxTokens: 8192,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'image-analysis', supported: true }
      ]
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'claude',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.015,
      outputCostPer1kTokens: 0.075,
      maxTokens: 4096,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'image-analysis', supported: true }
      ]
    }
  ];

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        console.warn('⚠️ ANTHROPIC_API_KEY not set, Claude models unavailable');
        return;
      }

      console.log('🔧 Initializing Claude API provider...');
      
      this.client = new Anthropic({
        apiKey: apiKey,
      });
      
      this.initialized = true;
      console.log('✅ Claude provider initialized successfully (using direct Anthropic API)');
    } catch (error) {
      console.error('❌ Failed to initialize Claude provider:', error);
      this.client = null;
      this.initialized = false;
    }
  }

  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now();
    
    if (!this.initialized || !this.client) {
      throw new ProviderError('Claude provider not initialized', this.name);
    }

    try {
      console.log('🤖 Generating text with Claude:', { model: request.model, messages: request.messages.length });
      
      // Convert our messages to Anthropic format
      const anthropicMessages = request.messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));

      // Handle system message separately if present
      const systemMessage = request.messages.find(msg => msg.role === 'system');
      
      const requestOptions: any = {
        model: request.model,
        max_tokens: request.maxTokens || 8192,
        messages: anthropicMessages,
        temperature: request.temperature || 0.7,
      };

      // Add system message if present
      if (systemMessage) {
        requestOptions.system = systemMessage.content;
      }

      console.log('📡 Calling Claude API...');
      
      const response = await this.client.messages.create(requestOptions);
      
      console.log('✅ Claude API response received');
      
      // Extract content from response
      const content = response.content?.[0];
      const text = content?.type === 'text' ? content.text : '';
      
      if (!text) {
        throw new Error('No text content in Claude response');
      }

      const latency = Date.now() - startTime;
      
      // Get token usage from response
      const inputTokens = response.usage?.input_tokens || this.estimateInputTokens(request.messages);
      const outputTokens = response.usage?.output_tokens || this.estimateTokens(text);
      const totalTokens = inputTokens + outputTokens;
      
      const modelInfo = this.models.find(m => m.id === request.model);
      const estimatedCost = this.calculateCost(inputTokens, outputTokens, modelInfo);

      return {
        id: `claude-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        content: text,
        role: 'assistant',
        model: request.model,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens,
          estimatedCost
        },
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
        metadata: {
          provider: this.name,
          model: request.model,
          latency,
          timestamp: new Date().toISOString(),
          requestId: response.id || `claude-${Date.now()}`
        }
      };
      
    } catch (error) {
      console.error('❌ Claude text generation failed:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new RateLimitError(this.name, 429);
        }
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new ProviderError('Claude authentication failed', this.name, 'AUTH_ERROR', 401);
        }
        if (error.message.includes('403') || error.message.includes('permission')) {
          throw new ProviderError('Claude permission denied', this.name, 'PERMISSION_DENIED', 403);
        }
        if (error.message.includes('404') || error.message.includes('not found')) {
          throw new ProviderError(`Claude model ${request.model} not found`, this.name, 'MODEL_NOT_FOUND', 404);
        }
      }
      
      throw new ProviderError(
        `Claude generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        'CLAUDE_ERROR',
        500
      );
    }
  }

  async *generateStream(request: GenerateRequest): AsyncIterable<GenerateResponse> {
    if (!this.initialized || !this.client) {
      throw new ProviderError('Claude provider not initialized', this.name);
    }

    try {
      console.log('🤖 Streaming text with Claude:', { model: request.model, messages: request.messages.length });
      
      // Convert our messages to Anthropic format
      const anthropicMessages = request.messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));

      // Handle system message separately if present
      const systemMessage = request.messages.find(msg => msg.role === 'system');
      
      const requestOptions: any = {
        model: request.model,
        max_tokens: request.maxTokens || 8192,
        messages: anthropicMessages,
        temperature: request.temperature || 0.7,
        stream: true
      };

      // Add system message if present
      if (systemMessage) {
        requestOptions.system = systemMessage.content;
      }

      console.log('📡 Starting Claude stream...');
      
      const stream = this.client.messages.stream(requestOptions);
      
      let fullContent = '';
      let responseId = `claude-stream-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const deltaText = event.delta.text;
          fullContent += deltaText;
          
          yield {
            id: responseId,
            content: deltaText,
            role: 'assistant',
            model: request.model,
            usage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              estimatedCost: 0
            },
            finishReason: 'stop',
            metadata: {
              provider: this.name,
              model: request.model,
              latency: 0,
              timestamp: new Date().toISOString(),
              requestId: responseId
            }
          };
        }
      }
      
      // Final message with usage info
      const inputTokens = this.estimateInputTokens(request.messages);
      const outputTokens = this.estimateTokens(fullContent);
      const modelInfo = this.models.find(m => m.id === request.model);
      
      yield {
        id: responseId,
        content: '',
        role: 'assistant',
        model: request.model,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
          estimatedCost: this.calculateCost(inputTokens, outputTokens, modelInfo)
        },
        finishReason: 'stop',
        metadata: {
          provider: this.name,
          model: request.model,
          latency: 0,
          timestamp: new Date().toISOString(),
          requestId: responseId
        }
      };
      
    } catch (error) {
      console.error('❌ Claude stream generation failed:', error);
      throw new ProviderError(
        `Claude stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
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
    throw new ProviderError('Claude does not support image generation', this.name, 'NOT_SUPPORTED', 400);
  }

  async generateVideo(options: {
    prompt: string;
    model: string;
    duration?: number;
    quality?: string;
  }): Promise<{
    id: string;
    url: string;
    prompt: string;
    model: string;
    duration: number;
    createdAt: string;
  }> {
    throw new ProviderError('Claude does not support video generation', this.name, 'NOT_SUPPORTED', 400);
  }

  getModels(): ModelInfo[] {
    if (!this.initialized) {
      console.warn('🔄 Claude provider not initialized, returning empty models array');
      return [];
    }
    return this.models;
  }

  async validateConfig(): Promise<boolean> {
    try {
      if (!this.initialized || !this.client) {
        console.warn('❌ Claude client not available');
        return false;
      }

      console.log('🔍 Claude provider initialized and ready (skipping health check to preserve credits)');
      
      // Skip actual API call to preserve credits - just validate client exists
      return true;
      
      // Uncomment below for actual health check when you want to test the API:
      /*
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      
      if (response.content?.[0]?.type === 'text') {
        console.log('✅ Claude health check successful');
        return true;
      }
      */
      
    } catch (error) {
      console.warn('❌ Claude health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  estimateCost(request: GenerateRequest): number {
    const modelInfo = this.models.find(m => m.id === request.model);
    if (!modelInfo) return 0;

    const inputTokens = this.estimateInputTokens(request.messages);
    const outputTokens = request.maxTokens || 1000;
    
    return this.calculateCost(inputTokens, outputTokens, modelInfo);
  }

  private calculateCost(inputTokens: number, outputTokens: number, modelInfo?: ModelInfo): number {
    if (!modelInfo) return 0;
    
    const inputCost = (inputTokens / 1000) * modelInfo.inputCostPer1kTokens;
    const outputCost = (outputTokens / 1000) * modelInfo.outputCostPer1kTokens;
    
    return inputCost + outputCost;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for Claude
    return Math.ceil(text.length / 4);
  }

  private estimateInputTokens(messages: any[]): number {
    const totalText = messages.map(m => m.content).join(' ');
    return this.estimateTokens(totalText);
  }
} 