// Base Provider Interface for Multi-Model Support
export interface ModelProvider {
  name: string;
  models: ModelInfo[];
  
  generateText(request: GenerateRequest): Promise<GenerateResponse>;
  generateStream(request: GenerateRequest): AsyncIterable<GenerateResponse>;
  getModels(): ModelInfo[];
  validateConfig(): Promise<boolean>;
  estimateCost(request: GenerateRequest): number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: 'text' | 'multimodal' | 'image' | 'code' | 'video';
  contextWindow: number;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  capabilities: ModelCapability[];
  maxTokens?: number;
}

export interface ModelCapability {
  type: 'text-generation' | 'image-analysis' | 'code-generation' | 'function-calling' | 'json-mode' | 'file-upload' | 'image-generation' | 'video-generation';
  supported: boolean;
  details?: Record<string, any>;
}

export interface GenerateRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  functions?: FunctionDefinition[];
  mode?: ComputeMode;
  agentId?: string;
  userId: string;
  sessionId?: string;
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

export type ComputeMode = 'flash' | 'think' | 'ultra-think';

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
    systemPrompt: 'Provide quick, concise responses. Prioritize speed and efficiency.',
    temperature: 0.3,
    maxTokens: 1000,
    reasoning: false,
  },
  think: {
    mode: 'think',
    systemPrompt: 'Take time to think through the problem step by step. Provide detailed reasoning.',
    temperature: 0.5,
    maxTokens: 2000,
    reasoning: true,
  },
  'ultra-think': {
    mode: 'ultra-think',
    systemPrompt: 'Engage in deep analysis. Consider multiple perspectives, edge cases, and provide comprehensive reasoning.',
    temperature: 0.7,
    maxTokens: 4000,
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
  type?: 'text' | 'multimodal' | 'image' | 'code' | 'video';
  capabilities?: ('text-generation' | 'image-analysis' | 'code-generation' | 'function-calling' | 'json-mode' | 'file-upload' | 'image-generation' | 'video-generation')[];
  maxCost?: number;
  estimatedTokens?: number;
  quality?: 'fast' | 'balanced' | 'high';
} 