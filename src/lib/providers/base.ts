// Base Provider Interface for Multi-Model Support
export interface ModelProvider {
  name: string;
  models: ModelInfo[];
  
  generateText(request: GenerateRequest): Promise<GenerateResponse>;
  generateStream(request: GenerateRequest): AsyncIterable<GenerateResponse>;
  getModels(): ModelInfo[];
  validateConfig(): Promise<boolean>;
  healthCheck(): Promise<boolean>;
  estimateCost(request: GenerateRequest): number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: 'text' | 'multimodal' | 'image' | 'code' | 'video' | 'audio' | 'embedding' | 'moderation';
  contextWindow: number;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  capabilities: ModelCapability[];
  maxTokens?: number;
  rateLimits?: {
    tokensPerMinute?: number;
    requestsPerMinute?: number;
    requestsPerDay?: number;
    imagesPerMinute?: number;
  };
}

export interface ModelCapability {
  type: 'text-generation' | 'image-analysis' | 'code-generation' | 'function-calling' | 'json-mode' | 'file-upload' | 'image-generation' | 'video-generation' | 'audio-processing' | 'reasoning' | 'research' | 'text-to-speech' | 'speech-to-text' | 'embeddings' | 'content-moderation';
  supported: boolean;
  details?: Record<string, any>;
}

export interface GenerateRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
    functionCall?: any;
  }>;
  userId?: string;
  sessionId?: string;
  mode?: 'flash' | 'think' | 'ultra-think' | 'full-think';
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  functions?: any[];
  attachedImages?: Array<{
    name: string;
    content: string;
    mimeType: string;
  }>;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | MessageContent[];
  name?: string;
  functionCall?: FunctionCall;
}

export interface MessageContent {
  type: 'text' | 'image';
  text?: string;
  imageUrl?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface GenerateResponse {
  id: string;
  content: string;
  role: 'assistant';
  model: string;
  usage: TokenUsage;
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
  functionCall?: FunctionCall;
  metadata: ResponseMetadata;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface ResponseMetadata {
  provider: string;
  model: string;
  latency: number;
  timestamp: string;
  requestId: string;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

export type ComputeMode = 'flash' | 'think' | 'ultra-think' | 'full-think';

export interface ComputeModeConfig {
  mode: ComputeMode;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  reasoning: boolean;
}

// Compute Mode Configurations
export const COMPUTE_MODES: Record<ComputeMode, ComputeModeConfig> = {
  flash: {
    mode: 'flash',
    systemPrompt: `Provide quick, concise responses. Prioritize speed and efficiency.

IMPORTANT FORMATTING RULES:
- Always wrap code in proper code blocks with language specifiers: \`\`\`python, \`\`\`javascript, \`\`\`html, etc.
- Use inline code \`like this\` only for single words, variables, or short snippets
- For multi-line code, always use fenced code blocks with the appropriate language
- Never provide large code blocks as plain text or multiple inline code segments`,
    temperature: 0.3,
    maxTokens: 1000,
    reasoning: false,
  },
  think: {
    mode: 'think',
    systemPrompt: `Take time to think through the problem step by step. Provide detailed reasoning.

IMPORTANT FORMATTING RULES:
- Always wrap code in proper code blocks with language specifiers: \`\`\`python, \`\`\`javascript, \`\`\`html, etc.
- Use inline code \`like this\` only for single words, variables, or short snippets
- For multi-line code, always use fenced code blocks with the appropriate language
- Never provide large code blocks as plain text or multiple inline code segments`,
    temperature: 0.5,
    maxTokens: 2000,
    reasoning: true,
  },
  'ultra-think': {
    mode: 'ultra-think',
    systemPrompt: `Engage in deep analysis. Consider multiple perspectives, edge cases, and provide comprehensive reasoning.

IMPORTANT FORMATTING RULES:
- Always wrap code in proper code blocks with language specifiers: \`\`\`python, \`\`\`javascript, \`\`\`html, etc.
- Use inline code \`like this\` only for single words, variables, or short snippets
- For multi-line code, always use fenced code blocks with the appropriate language
- Never provide large code blocks as plain text or multiple inline code segments`,
    temperature: 0.7,
    maxTokens: 4000,
    reasoning: true,
  },
  'full-think': {
    mode: 'full-think',
    systemPrompt: `You are operating in maximum creativity mode with high temperature settings. Explore creative solutions, think outside the box, and provide diverse perspectives. Feel free to be innovative, imaginative, and explore multiple possibilities. Generate varied and creative responses while maintaining accuracy and helpfulness.

IMPORTANT FORMATTING RULES:
- Always wrap code in proper code blocks with language specifiers: \`\`\`python, \`\`\`javascript, \`\`\`html, etc.
- Use inline code \`like this\` only for single words, variables, or short snippets
- For multi-line code, always use fenced code blocks with the appropriate language
- Never provide large code blocks as plain text or multiple inline code segments`,
    temperature: 1.0,
    maxTokens: 3000,
    reasoning: true,
  },
};

// Provider Error Types
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(provider: string, resetTime?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 'RATE_LIMIT', 429, true);
    this.resetTime = resetTime;
  }
  
  public resetTime?: number;
}

export class InsufficientCreditsError extends ProviderError {
  constructor(provider: string) {
    super(`Insufficient credits for ${provider}`, provider, 'INSUFFICIENT_CREDITS', 402, false);
  }
}

// Utility Functions
export function selectOptimalModel(
  requirement: ModelRequirement,
  availableModels: ModelInfo[]
): ModelInfo | null {
  const candidates = availableModels.filter(model => {
    if (requirement.type && model.type !== requirement.type) return false;
    if (requirement.capabilities && !requirement.capabilities.every(cap => 
      model.capabilities.some(mc => mc.type === cap && mc.supported)
    )) return false;
    if (requirement.maxCost && estimateModelCost(model, requirement.estimatedTokens || 1000) > requirement.maxCost) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Sort by cost efficiency (performance/cost ratio)
  return candidates.sort((a, b) => {
    const costA = estimateModelCost(a, requirement.estimatedTokens || 1000);
    const costB = estimateModelCost(b, requirement.estimatedTokens || 1000);
    const efficiencyA = a.contextWindow / costA;
    const efficiencyB = b.contextWindow / costB;
    return efficiencyB - efficiencyA;
  })[0];
}

function estimateModelCost(model: ModelInfo, tokens: number): number {
  const inputCost = (tokens * 0.7) * (model.inputCostPer1kTokens / 1000);
  const outputCost = (tokens * 0.3) * (model.outputCostPer1kTokens / 1000);
  return inputCost + outputCost;
}

export interface ModelRequirement {
  type?: 'text' | 'multimodal' | 'image' | 'code' | 'video' | 'audio' | 'embedding' | 'moderation';
  capabilities?: string[];
  maxCost?: number;
  estimatedTokens?: number;
  quality?: 'fast' | 'balanced' | 'high';
}

// Abstract Base Provider Class
export abstract class BaseProvider implements ModelProvider {
  abstract name: string;
  abstract models: ModelInfo[];

  abstract generateText(request: GenerateRequest): Promise<GenerateResponse>;
  abstract generateStream(request: GenerateRequest): AsyncIterable<GenerateResponse>;
  abstract validateConfig(): Promise<boolean>;

  // Default healthCheck implementation - can be overridden by providers
  async healthCheck(): Promise<boolean> {
    try {
      return await this.validateConfig();
    } catch (error) {
      console.warn(`Health check failed for ${this.name}:`, error);
      return false;
    }
  }

  getModels(): ModelInfo[] {
    return this.models;
  }

  estimateCost(request: GenerateRequest): number {
    const model = this.models.find(m => m.id === request.model);
    if (!model) return 0;

    const estimatedInputTokens = this.estimateInputTokens(request.messages);
    const estimatedOutputTokens = request.maxTokens || 1000;

    const inputCost = (estimatedInputTokens / 1000) * model.inputCostPer1kTokens;
    const outputCost = (estimatedOutputTokens / 1000) * model.outputCostPer1kTokens;

    return inputCost + outputCost;
  }

  protected estimateInputTokens(messages: Message[]): number {
    return messages.reduce((total, message) => {
      const content = typeof message.content === 'string' 
        ? message.content 
        : Array.isArray(message.content) 
          ? message.content.map(c => c.text || '').join('')
          : '';
      return total + this.estimateTokens(content);
    }, 0);
  }

  protected estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  protected createResponse(
    content: string,
    model: string,
    usage: TokenUsage,
    finishReason: 'stop' | 'length' | 'function_call' | 'content_filter' = 'stop',
    functionCall?: FunctionCall
  ): GenerateResponse {
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      role: 'assistant',
      model,
      usage,
      finishReason,
      functionCall,
      metadata: {
        provider: this.name,
        model,
        latency: 0, // Will be calculated by caller
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }
    };
  }
} 