import OpenAI from 'openai';
import { 
  ModelProvider, 
  ModelInfo, 
  GenerateRequest, 
  GenerateResponse, 
  ProviderError,
  RateLimitError,
  COMPUTE_MODES,
  ModelCapability
} from './base';

export class OpenAIProvider implements ModelProvider {
  name = 'openai';
  private client: OpenAI;
  
  models: ModelInfo[] = [
    // GPT-4 Series
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 8192,
      inputCostPer1kTokens: 0.03,
      outputCostPer1kTokens: 0.06,
      maxTokens: 4096,
      rateLimits: { tokensPerMinute: 10000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4-0613',
      name: 'GPT-4 (June 2023)',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 8192,
      inputCostPer1kTokens: 0.03,
      outputCostPer1kTokens: 0.06,
      maxTokens: 4096,
      rateLimits: { tokensPerMinute: 10000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.01,
      outputCostPer1kTokens: 0.03,
      maxTokens: 4096,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4-turbo-2024-04-09',
      name: 'GPT-4 Turbo (April 2024)',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.01,
      outputCostPer1kTokens: 0.03,
      maxTokens: 4096,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4-turbo-preview',
      name: 'GPT-4 Turbo Preview',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.01,
      outputCostPer1kTokens: 0.03,
      maxTokens: 4096,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    // GPT-4o Series
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.0025,
      outputCostPer1kTokens: 0.01,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'audio-processing', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4o-2024-05-13',
      name: 'GPT-4o (May 2024)',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.0025,
      outputCostPer1kTokens: 0.01,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'audio-processing', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4o-2024-08-06',
      name: 'GPT-4o (August 2024)',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.0025,
      outputCostPer1kTokens: 0.01,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'audio-processing', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4o-2024-11-20',
      name: 'GPT-4o (November 2024)',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.0025,
      outputCostPer1kTokens: 0.01,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'audio-processing', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    // GPT-4o Mini Series
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.00015,
      outputCostPer1kTokens: 0.0006,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'audio-processing', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4o-mini-2024-07-18',
      name: 'GPT-4o Mini (July 2024)',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.00015,
      outputCostPer1kTokens: 0.0006,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'audio-processing', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    // GPT-3.5 Series
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      type: 'text',
      contextWindow: 16385,
      inputCostPer1kTokens: 0.0005,
      outputCostPer1kTokens: 0.0015,
      maxTokens: 4096,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-3.5-turbo-0125',
      name: 'GPT-3.5 Turbo (January 2024)',
      provider: 'openai',
      type: 'text',
      contextWindow: 16385,
      inputCostPer1kTokens: 0.0005,
      outputCostPer1kTokens: 0.0015,
      maxTokens: 4096,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-3.5-turbo-1106',
      name: 'GPT-3.5 Turbo (November 2023)',
      provider: 'openai',
      type: 'text',
      contextWindow: 16385,
      inputCostPer1kTokens: 0.0005,
      outputCostPer1kTokens: 0.0015,
      maxTokens: 4096,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-3.5-turbo-16k',
      name: 'GPT-3.5 Turbo 16K',
      provider: 'openai',
      type: 'text',
      contextWindow: 16385,
      inputCostPer1kTokens: 0.001,
      outputCostPer1kTokens: 0.002,
      maxTokens: 4096,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-3.5-turbo-instruct',
      name: 'GPT-3.5 Turbo Instruct',
      provider: 'openai',
      type: 'text',
      contextWindow: 4096,
      inputCostPer1kTokens: 0.0015,
      outputCostPer1kTokens: 0.002,
      maxTokens: 4096,
      rateLimits: { tokensPerMinute: 90000, requestsPerMinute: 3500 },
      capabilities: [
        { type: 'text-generation', supported: true }
      ]
    },
    // GPT-4.1 Series (Latest)
    {
      id: 'gpt-4.1-2025-04-14',
      name: 'GPT-4.1 (April 2025)',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.0025,
      outputCostPer1kTokens: 0.01,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4.1-mini',
      name: 'GPT-4.1 Mini',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.00015,
      outputCostPer1kTokens: 0.0006,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4.1-nano-2025-04-14',
      name: 'GPT-4.1 Nano (April 2025)',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.00010,
      outputCostPer1kTokens: 0.0004,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    // GPT-4.1 Series - Simple Versions
    {
      id: 'gpt-4.1',
      name: 'gpt-4.1',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.0025,
      outputCostPer1kTokens: 0.01,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4.1-nano',
      name: 'gpt-4.1-nano',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.00010,
      outputCostPer1kTokens: 0.0004,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    // GPT-4.5 Preview
    {
      id: 'gpt-4.5-preview',
      name: 'GPT-4.5 Preview',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.005,
      outputCostPer1kTokens: 0.015,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 125000, requestsPerMinute: 1000 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    // o1 Series (Reasoning Models)
    {
      id: 'o1',
      name: 'o1',
      provider: 'openai',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.015,
      outputCostPer1kTokens: 0.06,
      maxTokens: 32768,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o1-2024-12-17',
      name: 'o1 (December 2024)',
      provider: 'openai',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.015,
      outputCostPer1kTokens: 0.06,
      maxTokens: 32768,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o1-mini',
      name: 'o1 Mini',
      provider: 'openai',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.012,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o1-mini-2024-09-12',
      name: 'o1 Mini (September 2024)',
      provider: 'openai',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.012,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o1-preview',
      name: 'o1 Preview',
      provider: 'openai',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.015,
      outputCostPer1kTokens: 0.06,
      maxTokens: 32768,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o1-preview-2024-09-12',
      name: 'o1 Preview (September 2024)',
      provider: 'openai',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.015,
      outputCostPer1kTokens: 0.06,
      maxTokens: 32768,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o1-pro-2025-03-19',
      name: 'o1 Pro (March 2025)',
      provider: 'openai',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.06,
      outputCostPer1kTokens: 0.24,
      maxTokens: 32768,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    // o1 Series - Simple Versions
    {
      id: 'o1-pro',
      name: 'o1-pro',
      provider: 'openai',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.06,
      outputCostPer1kTokens: 0.24,
      maxTokens: 32768,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    // o3 Series (Next Generation) - Dated Versions
    {
      id: 'o3-2025-04-16',
      name: 'o3 (April 2025)',
      provider: 'openai',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.015,
      outputCostPer1kTokens: 0.06,
      maxTokens: 32768,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o4-mini-2025-04-16',
      name: 'o4 Mini (April 2025)',
      provider: 'openai',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.012,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o3-pro-2025-06-10',
      name: 'o3 Pro (June 2025)',
      provider: 'openai',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.06,
      outputCostPer1kTokens: 0.24,
      maxTokens: 32768,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o3-mini-2025-01-31',
      name: 'o3 Mini (January 2025)',
      provider: 'openai',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.012,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    // o3 Series (Next Generation) - Simple Versions  
    {
      id: 'o3',
      name: 'o3',
      provider: 'openai',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.015,
      outputCostPer1kTokens: 0.06,
      maxTokens: 32768,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o4-mini',
      name: 'o4-mini',
      provider: 'openai',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.012,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o3-pro',
      name: 'o3-pro',
      provider: 'openai',
      type: 'text',
      contextWindow: 200000,
      inputCostPer1kTokens: 0.06,
      outputCostPer1kTokens: 0.24,
      maxTokens: 32768,
      rateLimits: { tokensPerMinute: 30000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o3-mini',
      name: 'o3-mini',
      provider: 'openai',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.012,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true }
      ]
    },
    {
      id: 'o4-mini-deep-research',
      name: 'o4 Mini Deep Research',
      provider: 'openai',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.012,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 200000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'reasoning', supported: true },
        { type: 'research', supported: true }
      ]
    },
    // ChatGPT Models
    {
      id: 'chatgpt-4o-latest',
      name: 'ChatGPT-4o Latest',
      provider: 'openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.005,
      outputCostPer1kTokens: 0.015,
      maxTokens: 16384,
      rateLimits: { tokensPerMinute: 500000, requestsPerMinute: 200 },
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    // Image Generation Models
    {
      id: 'dall-e-3',
      name: 'DALL-E 3',
      provider: 'openai',
      type: 'image',
      contextWindow: 4000,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      rateLimits: { requestsPerMinute: 500, imagesPerMinute: 5 },
      capabilities: [
        { type: 'image-generation', supported: true }
      ]
    },
    {
      id: 'dall-e-2',
      name: 'DALL-E 2',
      provider: 'openai',
      type: 'image',
      contextWindow: 4000,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      rateLimits: { requestsPerMinute: 500, imagesPerMinute: 5 },
      capabilities: [
        { type: 'image-generation', supported: true }
      ]
    },
    {
      id: 'gpt-image-1',
      name: 'GPT Image 1',
      provider: 'openai',
      type: 'image',
      contextWindow: 4000,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      rateLimits: { tokensPerMinute: 100000, imagesPerMinute: 5 },
      capabilities: [
        { type: 'image-generation', supported: true }
      ]
    },
    // Audio Models
    {
      id: 'tts-1',
      name: 'TTS-1',
      provider: 'openai',
      type: 'audio',
      contextWindow: 4096,
      inputCostPer1kTokens: 0.015,
      outputCostPer1kTokens: 0,
      maxTokens: 4096,
      rateLimits: { requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-to-speech', supported: true }
      ]
    },
    {
      id: 'tts-1-hd',
      name: 'TTS-1 HD',
      provider: 'openai',
      type: 'audio',
      contextWindow: 4096,
      inputCostPer1kTokens: 0.03,
      outputCostPer1kTokens: 0,
      maxTokens: 4096,
      rateLimits: { requestsPerMinute: 500 },
      capabilities: [
        { type: 'text-to-speech', supported: true }
      ]
    },
    {
      id: 'whisper-1',
      name: 'Whisper-1',
      provider: 'openai',
      type: 'audio',
      contextWindow: 0,
      inputCostPer1kTokens: 0.006,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      rateLimits: { requestsPerMinute: 500 },
      capabilities: [
        { type: 'speech-to-text', supported: true }
      ]
    },
    // Embedding Models
    {
      id: 'text-embedding-3-large',
      name: 'Text Embedding 3 Large',
      provider: 'openai',
      type: 'embedding',
      contextWindow: 8191,
      inputCostPer1kTokens: 0.00013,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      rateLimits: { tokensPerMinute: 1000000, requestsPerMinute: 3000 },
      capabilities: [
        { type: 'embeddings', supported: true }
      ]
    },
    {
      id: 'text-embedding-3-small',
      name: 'Text Embedding 3 Small',
      provider: 'openai',
      type: 'embedding',
      contextWindow: 8191,
      inputCostPer1kTokens: 0.00002,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      rateLimits: { tokensPerMinute: 1000000, requestsPerMinute: 3000 },
      capabilities: [
        { type: 'embeddings', supported: true }
      ]
    },
    {
      id: 'text-embedding-ada-002',
      name: 'Text Embedding Ada 002',
      provider: 'openai',
      type: 'embedding',
      contextWindow: 8191,
      inputCostPer1kTokens: 0.0001,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      rateLimits: { tokensPerMinute: 1000000, requestsPerMinute: 3000 },
      capabilities: [
        { type: 'embeddings', supported: true }
      ]
    },
    // Moderation Models
    {
      id: 'omni-moderation-latest',
      name: 'Omni Moderation Latest',
      provider: 'openai',
      type: 'moderation',
      contextWindow: 32768,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      rateLimits: { tokensPerMinute: 10000, requestsPerMinute: 500 },
      capabilities: [
        { type: 'content-moderation', supported: true }
      ]
    },
    {
      id: 'text-moderation-latest',
      name: 'Text Moderation Latest',
      provider: 'openai',
      type: 'moderation',
      contextWindow: 32768,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      rateLimits: { tokensPerMinute: 150000, requestsPerMinute: 1000 },
      capabilities: [
        { type: 'content-moderation', supported: true }
      ]
    },
    // Fallback video models (sample videos) when other providers aren't available
    {
      id: 'veo-2.0-generate-001',
      name: 'Veo 2.0 (Sample)',
      provider: 'openai',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      capabilities: [
        { type: 'video-generation', supported: true }
      ]
    },
    {
      id: 'veo-3.0-generate-preview',
      name: 'Veo 3.0 (Sample)',
      provider: 'openai',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      capabilities: [
        { type: 'video-generation', supported: true }
      ]
    }
  ];

  constructor(apiKey?: string) {
    if (!apiKey && !process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now();
    
    try {
      // Apply compute mode if specified
      const computeModeConfig = request.mode ? COMPUTE_MODES[request.mode] : null;
      let messages = [...request.messages];
      
      // Check if this is an o1 or o3 model that doesn't support system messages
      const isReasoningModel = request.model.includes('o1') || request.model.includes('o3');
      
      if (computeModeConfig && !isReasoningModel) {
        // Prepend system message for compute mode (only for non-reasoning models)
        if (messages[0]?.role !== 'system') {
          messages.unshift({
            role: 'system',
            content: computeModeConfig.systemPrompt
          });
        } else {
          messages[0].content = `${computeModeConfig.systemPrompt}\n\n${messages[0].content}`;
        }
      } else if (computeModeConfig && isReasoningModel) {
        // For reasoning models, add compute mode instructions to the first user message
        const firstUserMessageIndex = messages.findIndex(msg => msg.role === 'user');
        if (firstUserMessageIndex >= 0) {
          messages[firstUserMessageIndex].content = `${computeModeConfig.systemPrompt}\n\n${messages[firstUserMessageIndex].content}`;
        }
      }

      // Convert system messages to user messages for o1/o3 models
      if (isReasoningModel) {
        messages = messages.map(msg => {
          if (msg.role === 'system') {
            return {
              role: 'user' as const,
              content: `Instructions: ${msg.content}`
            };
          }
          return msg;
        });
      }

      // Prepare OpenAI API request parameters
      const requestParams: any = {
        model: request.model,
        messages: messages.map(msg => {
          const baseMessage: any = {
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : this.formatContent(msg.content),
          };
          
          if (msg.name && msg.role === 'function') {
            baseMessage.name = msg.name;
          }
          
          if (msg.functionCall && msg.role === 'assistant') {
            baseMessage.function_call = msg.functionCall;
          }
          
          return baseMessage;
        }),
        temperature: computeModeConfig?.temperature ?? request.temperature ?? 0.7,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stop,
        ...(request.functions && { functions: request.functions }),
        stream: false,
      };

      // Use max_completion_tokens for o1/o3 models, max_tokens for others
      if (isReasoningModel) {
        requestParams.max_completion_tokens = computeModeConfig?.maxTokens ?? request.maxTokens ?? 1000;
      } else {
        requestParams.max_tokens = computeModeConfig?.maxTokens ?? request.maxTokens ?? 1000;
      }

      const completion = await this.client.chat.completions.create(requestParams);

      const latency = Date.now() - startTime;
      const choice = completion.choices[0];
      
      if (!choice?.message) {
        throw new ProviderError('No response from OpenAI', this.name);
      }

      const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const modelInfo = this.models.find(m => m.id === request.model);
      const estimatedCost = this.calculateCost(usage.prompt_tokens, usage.completion_tokens, modelInfo);

      return {
        id: completion.id,
        content: choice.message.content || '',
        role: 'assistant',
        model: request.model,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          estimatedCost
        },
        finishReason: this.mapFinishReason(choice.finish_reason || null),
        ...(choice.message.function_call && { functionCall: choice.message.function_call }),
        metadata: {
          provider: this.name,
          model: request.model,
          latency,
          timestamp: new Date().toISOString(),
          requestId: completion.id,
        }
      };
      
    } catch (error) {
      const latency = Date.now() - startTime;
      
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          const resetTime = error.headers?.['x-ratelimit-reset-tokens'] 
            ? parseInt(error.headers['x-ratelimit-reset-tokens']) * 1000 
            : undefined;
          throw new RateLimitError(this.name, resetTime);
        }
        
        throw new ProviderError(
          error.message,
          this.name,
          error.code || '',
          error.status,
          error.status >= 500
        );
      }
      
      throw new ProviderError(
        error instanceof Error ? error.message : 'Unknown OpenAI error',
        this.name
      );
    }
  }

  async *generateStream(request: GenerateRequest): AsyncIterable<GenerateResponse> {
    const startTime = Date.now();
    
    try {
      const computeModeConfig = request.mode ? COMPUTE_MODES[request.mode] : null;
      let messages = [...request.messages];
      
      // Check if this is an o1 or o3 model that doesn't support system messages
      const isReasoningModel = request.model.includes('o1') || request.model.includes('o3');
      
      if (computeModeConfig && !isReasoningModel) {
        if (messages[0]?.role !== 'system') {
          messages.unshift({
            role: 'system',
            content: computeModeConfig.systemPrompt
          });
        } else {
          messages[0].content = `${computeModeConfig.systemPrompt}\n\n${messages[0].content}`;
        }
      } else if (computeModeConfig && isReasoningModel) {
        // For reasoning models, add compute mode instructions to the first user message
        const firstUserMessageIndex = messages.findIndex(msg => msg.role === 'user');
        if (firstUserMessageIndex >= 0) {
          messages[firstUserMessageIndex].content = `${computeModeConfig.systemPrompt}\n\n${messages[firstUserMessageIndex].content}`;
        }
      }

      // Convert system messages to user messages for o1/o3 models
      if (isReasoningModel) {
        messages = messages.map(msg => {
          if (msg.role === 'system') {
            return {
              role: 'user' as const,
              content: `Instructions: ${msg.content}`
            };
          }
          return msg;
        });
      }

      // Prepare streaming request parameters
      const streamParams: any = {
        model: request.model,
        messages: messages.map(msg => {
          const baseMessage: any = {
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : this.formatContent(msg.content),
          };
          
          if (msg.name && msg.role === 'function') {
            baseMessage.name = msg.name;
          }
          
          return baseMessage;
        }),
        temperature: computeModeConfig?.temperature ?? request.temperature ?? 0.7,
        stream: true,
      };

      // Use max_completion_tokens for o1/o3 models, max_tokens for others
      if (isReasoningModel) {
        streamParams.max_completion_tokens = computeModeConfig?.maxTokens ?? request.maxTokens ?? 1000;
      } else {
        streamParams.max_tokens = computeModeConfig?.maxTokens ?? request.maxTokens ?? 1000;
      }

      const stream = await this.client.chat.completions.create(streamParams) as any;

      let accumulatedContent = '';
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          accumulatedContent += delta.content;
          completionTokens += this.estimateTokens(delta.content);
          
          const modelInfo = this.models.find(m => m.id === request.model);
          const estimatedCost = this.calculateCost(promptTokens, completionTokens, modelInfo);
          
          yield {
            id: chunk.id,
            content: accumulatedContent,
            role: 'assistant',
            model: request.model,
            usage: {
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
              estimatedCost
            },
            finishReason: this.mapFinishReason(chunk.choices[0]?.finish_reason),
            metadata: {
              provider: this.name,
              model: request.model,
              latency: Date.now() - startTime,
              timestamp: new Date().toISOString(),
              requestId: chunk.id,
            }
          };
        }
      }
      
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throw new RateLimitError(this.name);
        }
        throw new ProviderError(error.message, this.name, error.code || '', error.status);
      }
      throw new ProviderError(
        error instanceof Error ? error.message : 'Unknown OpenAI streaming error',
        this.name
      );
    }
  }

  getModels(): ModelInfo[] {
    return this.models;
  }

  async validateConfig(): Promise<boolean> {
    try {
      console.log('🔍 Testing OpenAI connection...');
      const models = await this.client.models.list();
      console.log('✅ OpenAI test successful, found', models.data.length, 'models');
      return true;
    } catch (error) {
      console.warn('❌ OpenAI health check failed:', error instanceof Error ? error.message : error);
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
      console.log(`🎨 Generating image with OpenAI ${options.model}:`, options.prompt.substring(0, 100));

      if (options.model === 'dall-e-3') {
        // DALL-E 3 supports higher quality and larger sizes
        const response = await this.client.images.generate({
          model: 'dall-e-3',
          prompt: options.prompt,
          n: 1,
          size: options.size as '1024x1024' | '1792x1024' | '1024x1792' || '1024x1024',
          quality: options.quality as 'standard' | 'hd' || 'standard',
          response_format: 'url'
        });

        if (!response.data || response.data.length === 0) {
          throw new Error('No image data returned from DALL-E 3');
        }

        const imageUrl = response.data[0]?.url;
        const revisedPrompt = response.data[0]?.revised_prompt;

        if (!imageUrl) {
          throw new Error('No image URL returned from DALL-E 3');
        }

        console.log('✅ DALL-E 3 image generated successfully:', imageUrl);

        return {
          id: `img-${Date.now()}`,
          url: imageUrl,
          prompt: revisedPrompt || options.prompt,
          model: options.model,
          size: options.size || '1024x1024',
          createdAt: new Date().toISOString(),
        };

      } else if (options.model === 'dall-e-2') {
        // DALL-E 2 has different size options
        const response = await this.client.images.generate({
          model: 'dall-e-2',
          prompt: options.prompt,
          n: 1,
          size: options.size as '256x256' | '512x512' | '1024x1024' || '512x512',
          response_format: 'url'
        });

        if (!response.data || response.data.length === 0) {
          throw new Error('No image data returned from DALL-E 2');
        }

        const imageUrl = response.data[0]?.url;

        if (!imageUrl) {
          throw new Error('No image URL returned from DALL-E 2');
        }

        console.log('✅ DALL-E 2 image generated successfully:', imageUrl);

        return {
          id: `img-${Date.now()}`,
          url: imageUrl,
          prompt: options.prompt,
          model: options.model,
          size: options.size || '512x512',
          createdAt: new Date().toISOString(),
        };

      } else {
        throw new Error(`Unsupported OpenAI image model: ${options.model}`);
      }

    } catch (error) {
      console.error('❌ OpenAI image generation failed:', error);
      throw new ProviderError(
        `OpenAI image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'openai',
        'IMAGE_GENERATION_ERROR',
        500
      );
    }
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
    // OpenAI doesn't have video generation yet, but we can provide sample videos
    // This allows the app to work without requiring Vertex AI setup
    console.log(`🎬 Video generation requested but OpenAI doesn't support video. Using sample video for: ${options.prompt.substring(0, 100)}`);
    
    // Use Google's sample videos that actually work
    const sampleVideos = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
    ];
    
    const videoUrl = sampleVideos[Math.floor(Math.random() * sampleVideos.length)];
    
    return {
      id: `vid-${Date.now()}`,
      url: videoUrl,
      prompt: options.prompt,
      model: `${options.model}-sample`,
      duration: options.duration || 5,
      createdAt: new Date().toISOString(),
    };
  }

  private formatContent(content: any[]): string {
    return content
      .map(item => {
        if (item.type === 'text') return item.text;
        if (item.type === 'image') return `[Image: ${item.imageUrl?.url}]`;
        return '';
      })
      .join('\n');
  }

  private mapFinishReason(reason: string | null | undefined): 'stop' | 'length' | 'function_call' | 'content_filter' {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'function_call': return 'function_call';
      case 'content_filter': return 'content_filter';
      default: return 'stop';
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number, modelInfo?: ModelInfo): number {
    if (!modelInfo) return 0;
    
    const inputCost = (inputTokens / 1000) * modelInfo.inputCostPer1kTokens;
    const outputCost = (outputTokens / 1000) * modelInfo.outputCostPer1kTokens;
    
    return inputCost + outputCost;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  private estimateInputTokens(messages: any[]): number {
    return messages.reduce((total, message) => {
      const content = typeof message.content === 'string' 
        ? message.content 
        : this.formatContent(message.content);
      return total + this.estimateTokens(content);
    }, 0);
  }
} 