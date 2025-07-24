import OpenAI from 'openai';
import { ModelProvider, ModelInfo, GenerateRequest, GenerateResponse, StreamResponse, ProviderError } from './base';

export class OpenRouterProvider implements ModelProvider {
  public readonly id = 'openrouter';
  public readonly name = 'OpenRouter';
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://omnix.ai',
        'X-Title': 'OmniX AI Platform',
      }
    });
  }

  models: ModelInfo[] = [
    // Free Models - Perfect for free tier users
    {
      id: 'meta-llama/llama-3.2-3b-instruct:free',
      name: 'Llama 3.2 3B (Free)',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 131072,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: false }
      ],
      category: 'free'
    },
    {
      id: 'microsoft/phi-3-mini-128k-instruct:free',
      name: 'Phi-3 Mini 128K (Free)',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: false }
      ],
      category: 'free'
    },
    
    // Ultra Cost-Effective Models
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 64000,
      inputCostPer1kTokens: 0.00014,
      outputCostPer1kTokens: 0.00028,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true }
      ],
      category: 'cost-effective'
    },
    {
      id: 'deepseek/deepseek-coder',
      name: 'DeepSeek Coder',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 64000,
      inputCostPer1kTokens: 0.00014,
      outputCostPer1kTokens: 0.00028,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true }
      ],
      category: 'coding'
    },
    
    // Qwen Models - Great balance of cost and performance
    {
      id: 'qwen/qwen-2.5-72b-instruct',
      name: 'Qwen 2.5 72B Instruct',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 32768,
      inputCostPer1kTokens: 0.0004,
      outputCostPer1kTokens: 0.0004,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'reasoning', supported: true }
      ],
      category: 'flagship'
    },
    {
      id: 'qwen/qwen-2.5-coder-32b-instruct',
      name: 'Qwen 2.5 Coder 32B',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 131072,
      inputCostPer1kTokens: 0.0002,
      outputCostPer1kTokens: 0.0002,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true }
      ],
      category: 'coding'
    },
    
    // Mistral Models - European AI
    {
      id: 'mistralai/mistral-large',
      name: 'Mistral Large',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.002,
      outputCostPer1kTokens: 0.006,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'reasoning', supported: true }
      ],
      category: 'flagship'
    },
    {
      id: 'mistralai/codestral',
      name: 'Codestral',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 32768,
      inputCostPer1kTokens: 0.0015,
      outputCostPer1kTokens: 0.0015,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true }
      ],
      category: 'coding'
    },
    
    // Grok Models - xAI
    {
      id: 'x-ai/grok-beta',
      name: 'Grok Beta',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 131072,
      inputCostPer1kTokens: 0.005,
      outputCostPer1kTokens: 0.015,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'reasoning', supported: true }
      ],
      category: 'flagship'
    },
    
    // Claude via OpenRouter (backup)
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet (OR)',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.015,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'reasoning', supported: true },
        { type: 'image-analysis', supported: true }
      ],
      category: 'flagship'
    },
    
    // Llama Models
    {
      id: 'meta-llama/llama-3.1-405b-instruct',
      name: 'Llama 3.1 405B Instruct',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 131072,
      inputCostPer1kTokens: 0.005,
      outputCostPer1kTokens: 0.005,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'reasoning', supported: true }
      ],
      category: 'flagship'
    },
    {
      id: 'meta-llama/llama-3.1-70b-instruct',
      name: 'Llama 3.1 70B Instruct',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 131072,
      inputCostPer1kTokens: 0.0004,
      outputCostPer1kTokens: 0.0004,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'reasoning', supported: true }
      ],
      category: 'cost-effective'
    },
    
    // Specialized Models
    {
      id: 'perplexity/llama-3.1-sonar-large-128k-online',
      name: 'Llama 3.1 Sonar Large (Online)',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 127072,
      inputCostPer1kTokens: 0.005,
      outputCostPer1kTokens: 0.005,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'web-search', supported: true },
        { type: 'real-time-data', supported: true }
      ],
      category: 'web-search'
    },
    
    // Creative Models
    {
      id: 'google/gemma-2-27b-it',
      name: 'Gemma 2 27B Instruct',
      provider: 'openrouter',
      type: 'text',
      contextWindow: 8192,
      inputCostPer1kTokens: 0.0001,
      outputCostPer1kTokens: 0.0001,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'creative-writing', supported: true }
      ],
      category: 'creative'
    }
  ];

  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
        stream: false,
        ...(request.functions && { functions: request.functions }),
        ...(request.functionCall && { function_call: request.functionCall })
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new ProviderError('No completion choices returned', this.id);
      }

      return {
        id: completion.id,
        content: choice.message.content || '',
        model: request.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || 'unknown',
        functionCall: choice.message.function_call,
        metadata: {
          provider: this.id,
          model: request.model,
          timestamp: new Date().toISOString(),
          cost: this.calculateCost(completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, request.model)
        }
      };
    } catch (error: any) {
      console.error(`OpenRouter API error for model ${request.model}:`, error);
      
      if (error.status === 429) {
        throw new ProviderError(`Rate limit exceeded for ${request.model}`, this.id, true);
      }
      if (error.status === 402) {
        throw new ProviderError(`Insufficient credits for ${request.model}`, this.id, false);
      }
      if (error.status === 404) {
        throw new ProviderError(`Model ${request.model} not found`, this.id, false);
      }
      
      throw new ProviderError(
        error.message || `OpenRouter API error for ${request.model}`,
        this.id,
        error.status >= 500
      );
    }
  }

  async *generateStream(request: GenerateRequest): AsyncGenerator<StreamResponse, void, unknown> {
    try {
      const stream = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
        stream: true,
        ...(request.functions && { functions: request.functions })
      });

      let accumulatedContent = '';
      
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (choice?.delta?.content) {
          accumulatedContent += choice.delta.content;
          
          yield {
            id: chunk.id,
            content: accumulatedContent, // Return accumulated content, not delta
            model: request.model,
            done: false,
            metadata: {
              provider: this.id,
              model: request.model,
              timestamp: new Date().toISOString()
            }
          };
        }

        if (choice?.finish_reason) {
          yield {
            id: chunk.id,
            content: '',
            model: request.model,
            done: true,
            finishReason: choice.finish_reason,
            metadata: {
              provider: this.id,
              model: request.model,
              timestamp: new Date().toISOString()
            }
          };
        }
      }
    } catch (error: any) {
      console.error(`OpenRouter streaming error for model ${request.model}:`, error);
      throw new ProviderError(
        error.message || `OpenRouter streaming error for ${request.model}`,
        this.id,
        error.status >= 500
      );
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      // Fetch live models from OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://omnix.ai',
          'X-Title': 'OmniX AI Platform'
        }
      });

      if (!response.ok) {
        console.warn('Failed to fetch live OpenRouter models, using static list');
        return this.models;
      }

      const { data } = await response.json();
      
      // Convert to our ModelInfo format
      const liveModels: ModelInfo[] = data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: 'openrouter',
        type: this.detectModelType(model),
        contextWindow: model.context_length || 8192,
        inputCostPer1kTokens: parseFloat(model.pricing?.prompt || '0'),
        outputCostPer1kTokens: parseFloat(model.pricing?.completion || '0'),
        capabilities: this.extractCapabilities(model),
        category: this.categorizeModel(model)
      }));

      console.log(`📡 Fetched ${liveModels.length} live models from OpenRouter`);
      return liveModels;
    } catch (error) {
      console.warn('Error fetching live OpenRouter models:', error);
      return this.models;
    }
  }

  private detectModelType(model: any): 'text' | 'multimodal' | 'image' | 'audio' | 'video' {
    const id = model.id.toLowerCase();
    const name = (model.name || '').toLowerCase();
    
    if (id.includes('vision') || name.includes('vision') || model.multimodal) {
      return 'multimodal';
    }
    return 'text';
  }

  private extractCapabilities(model: any): Array<{ type: string; supported: boolean }> {
    const capabilities = [
      { type: 'text-generation', supported: true }
    ];

    const id = model.id.toLowerCase();
    const name = (model.name || '').toLowerCase();

    if (id.includes('coder') || id.includes('code') || name.includes('code')) {
      capabilities.push({ type: 'code-generation', supported: true });
    }

    if (id.includes('vision') || name.includes('vision') || model.multimodal) {
      capabilities.push({ type: 'image-analysis', supported: true });
    }

    if (id.includes('function') || model.function_calling !== false) {
      capabilities.push({ type: 'function-calling', supported: true });
    }

    if (id.includes('sonar') || id.includes('online') || name.includes('search')) {
      capabilities.push({ type: 'web-search', supported: true });
    }

    return capabilities;
  }

  private categorizeModel(model: any): string {
    const id = model.id.toLowerCase();
    const cost = parseFloat(model.pricing?.prompt || '0');

    if (cost === 0) return 'free';
    if (cost <= 0.001) return 'cost-effective';
    if (id.includes('coder') || id.includes('code')) return 'coding';
    if (id.includes('creative') || id.includes('story')) return 'creative';
    if (id.includes('reasoning') || id.includes('think')) return 'reasoning';
    if (id.includes('sonar') || id.includes('online')) return 'web-search';
    if (cost >= 0.003) return 'flagship';
    
    return 'general';
  }

  private calculateCost(usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }, modelId: string): number {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return 0;

    const inputCost = (usage.prompt_tokens / 1000) * model.inputCostPer1kTokens;
    const outputCost = (usage.completion_tokens / 1000) * model.outputCostPer1kTokens;
    
    return inputCost + outputCost;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://omnix.ai'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}