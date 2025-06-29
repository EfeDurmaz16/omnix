import { AIModel, Plan } from './types';

export const AI_MODELS: AIModel[] = [
  // Text Models - OpenAI
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    type: 'text',
    description: 'Most capable GPT-4 model, optimized for chat',
    maxTokens: 128000,
    costPerToken: 0.03,
    available: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    type: 'text',
    description: 'Fast and efficient for most tasks',
    maxTokens: 16385,
    costPerToken: 0.002,
    available: true,
  },
  
  // Text Models - Anthropic (Original)
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    type: 'text',
    description: 'Most powerful Claude model for complex tasks',
    maxTokens: 200000,
    costPerToken: 0.075,
    available: true,
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    type: 'text',
    description: 'Fastest Claude model for quick responses',
    maxTokens: 200000,
    costPerToken: 0.0125,
    available: true,
  },
  
  // Text Models - Google Direct
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    type: 'text',
    description: 'Google\'s most capable AI model',
    maxTokens: 32768,
    costPerToken: 0.0125,
    available: true,
  },
  
  // Text Models - Meta
  {
    id: 'llama-2-70b',
    name: 'LLaMA 2 70B',
    provider: 'meta',
    type: 'text',
    description: 'Open-source large language model',
    maxTokens: 4096,
    costPerToken: 0.0008,
    available: true,
  },
  
  // Text Models - Mistral
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'mistral',
    type: 'text',
    description: 'High-performance European AI model',
    maxTokens: 32768,
    costPerToken: 0.024,
    available: true,
  },
  
  // Text Models - Vertex AI (Gemini)
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'vertex',
    type: 'text',
    description: 'Latest and most advanced Gemini model with 2M context',
    maxTokens: 2097152,
    costPerToken: 0.00125,
    available: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'vertex',
    type: 'text',
    description: 'Ultra-fast Gemini model with 1M context',
    maxTokens: 1048576,
    costPerToken: 0.000075,
    available: true,
  },
  {
    id: 'gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'vertex',
    type: 'text',
    description: 'Advanced Gemini 2.0 with multimodal capabilities',
    maxTokens: 1048576,
    costPerToken: 0.000075,
    available: true,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'vertex',
    type: 'text',
    description: 'Proven Gemini 1.5 Pro with 2M context window',
    maxTokens: 2097152,
    costPerToken: 0.00125,
    available: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'vertex',
    type: 'text',
    description: 'Fast and efficient Gemini 1.5 model',
    maxTokens: 1048576,
    costPerToken: 0.000075,
    available: true,
  },
  
  // Text Models - Vertex AI (Claude)
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'vertex',
    type: 'text',
    description: 'Advanced Claude model via Vertex AI',
    maxTokens: 200000,
    costPerToken: 0.003,
    available: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    type: 'text',
    description: 'Fast Claude model via Anthropic API',
    maxTokens: 200000,
    costPerToken: 0.0008,
    available: true,
  },
  {
    id: 'claude-3-haiku-vertex',
    name: 'Claude 3 Haiku (Vertex)',
    provider: 'vertex',
    type: 'text',
    description: 'Original Claude 3 Haiku via Vertex AI',
    maxTokens: 200000,
    costPerToken: 0.00025,
    available: true,
  },
  
  // Text Models - Vertex AI (Llama)
  {
    id: 'llama-4-scout-17b-16e-instruct-maas',
    name: 'Llama 4 Scout 17B',
    provider: 'vertex',
    type: 'text',
    description: 'Meta\'s Llama 4 Scout with 128K context',
    maxTokens: 128000,
    costPerToken: 0.0002,
    available: true,
  },
  {
    id: 'llama-4-maverick-17b-128e-instruct-maas',
    name: 'Llama 4 Maverick 17B',
    provider: 'vertex',
    type: 'text',
    description: 'Meta\'s Llama 4 Maverick with extended context',
    maxTokens: 128000,
    costPerToken: 0.0002,
    available: true,
  },
  
  // Text Models - Vertex AI (Mistral)
  {
    id: 'mistral-small-2503@001',
    name: 'Mistral Small 2503',
    provider: 'vertex',
    type: 'text',
    description: 'Mistral AI\'s efficient small model via Vertex AI',
    maxTokens: 32768,
    costPerToken: 0.0002,
    available: true,
  },
  {
    id: 'mistral-large-2411@001',
    name: 'Mistral Large 2411',
    provider: 'vertex',
    type: 'text',
    description: 'Mistral AI\'s largest and most capable model',
    maxTokens: 128000,
    costPerToken: 0.003,
    available: true,
  },
  
  // Text Models - Cohere
  {
    id: 'command-r-plus',
    name: 'Command R+',
    provider: 'cohere',
    type: 'text',
    description: 'Cohere\'s advanced retrieval-augmented generation model',
    maxTokens: 128000,
    costPerToken: 0.003,
    available: true,
  },
  {
    id: 'command-r',
    name: 'Command R',
    provider: 'cohere',
    type: 'text',
    description: 'Cohere\'s efficient conversational model',
    maxTokens: 128000,
    costPerToken: 0.0005,
    available: true,
  },
  
  // Image Models - OpenAI
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'openai',
    type: 'image',
    description: 'Most advanced image generation from OpenAI',
    maxTokens: 0,
    costPerToken: 0.04,
    available: true,
  },
  {
    id: 'dall-e-2',
    name: 'DALL-E 2',
    provider: 'openai',
    type: 'image',
    description: 'High-quality image generation',
    maxTokens: 0,
    costPerToken: 0.02,
    available: true,
  },
  {
    id: 'stable-diffusion-xl',
    name: 'Stable Diffusion XL',
    provider: 'openai',
    type: 'image',
    description: 'Open-source image generation model',
    maxTokens: 0,
    costPerToken: 0.01,
    available: true,
  },
  
  // Image Models - Google Cloud Imagen (100% Available)
  {
    id: 'imagen-4.0-generate-preview-06-06',
    name: 'Imagen 4 Standard',
    provider: 'vertex',
    type: 'image',
    description: 'Google\'s latest Imagen 4 - balanced speed and quality, 100% available',
    maxTokens: 0,
    costPerToken: 0.04,
    available: true,
  },
  {
    id: 'imagen-4.0-ultra-generate-preview-06-06',
    name: 'Imagen 4 Ultra',
    provider: 'vertex',
    type: 'image',
    description: 'Imagen 4 Ultra - highest quality, slower speed, 100% available',
    maxTokens: 0,
    costPerToken: 0.08,
    available: true,
  },
  {
    id: 'imagen-4.0-fast-generate-preview-06-06',
    name: 'Imagen 4 Fast',
    provider: 'vertex',
    type: 'image',
    description: 'Imagen 4 Fast - quickest generation, 100% available',
    maxTokens: 0,
    costPerToken: 0.02,
    available: true,
  },
  {
    id: 'imagen-3.0-generate-002',
    name: 'Imagen 3.0',
    provider: 'vertex',
    type: 'image',
    description: 'Proven Imagen 3.0 model - 100% available',
    maxTokens: 0,
    costPerToken: 0.03,
    available: true,
  },
  
  // Image Models - Midjourney
  {
    id: 'midjourney-v6',
    name: 'Midjourney v6',
    provider: 'midjourney',
    type: 'image',
    description: 'Midjourney\'s latest version with enhanced photorealism',
    maxTokens: 0,
    costPerToken: 0.08,
    available: true,
  },
  {
    id: 'midjourney-v5',
    name: 'Midjourney v5',
    provider: 'midjourney',
    type: 'image',
    description: 'Stable Midjourney version with excellent artistic output',
    maxTokens: 0,
    costPerToken: 0.06,
    available: true,
  },
  
  // Video Models - RunwayML (via OpenAI provider)
  {
    id: 'gen-2',
    name: 'RunwayML Gen-2',
    provider: 'openai',
    type: 'video',
    description: 'Advanced video generation and editing - 100% available',
    maxTokens: 0,
    costPerToken: 0.05,
    available: true,
  },
  
  // Video Models - Google Cloud Veo (100% Available)
  {
    id: 'veo-3.0-generate-preview',
    name: 'Veo 3.0 Preview',
    provider: 'vertex',
    type: 'video',
    description: 'Google\'s latest Veo 3.0 - 100% available with advanced capabilities',
    maxTokens: 0,
    costPerToken: 0.20,
    available: true,
  },
  {
    id: 'veo-2.0-generate-001',
    name: 'Veo 2.0',
    provider: 'vertex',
    type: 'video',
    description: 'Google\'s stable Veo 2.0 video generation model - 100% available',
    maxTokens: 0,
    costPerToken: 0.15,
    available: true,
  },
  
  // Video Models - Wavespeed AI (100% Available)
  {
    id: 'seedance-v1-pro-i2v-720p',
    name: 'Seedance V1 Pro I2V 720p',
    provider: 'wavespeed',
    type: 'video',
    description: 'Image-to-video generation with cinematic quality at 720p resolution - 100% available',
    maxTokens: 0,
    costPerToken: 0.10,
    available: true,
  },
];

export const PRICING_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 100,
    features: [
      '100 credits per month',
      'Access to basic models',
      'Text generation',
      'Limited image generation',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 15,
    credits: 2000,
    popular: true,
    features: [
      '2,000 credits per month',
      'Access to all text models',
      'Unlimited text generation',
      'Advanced image generation',
      'Priority support',
      'API access',
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: 30,
    credits: 5000,
    features: [
      '5,000 credits per month',
      'Access to all models',
      'Unlimited generations',
      'Video generation (beta)',
      'Premium support',
      'Custom integrations',
      'Team collaboration',
    ],
  },
];

export const DEFAULT_MODELS = {
  text: 'gpt-3.5-turbo',
  image: 'dall-e-2',
  video: 'seedance-v1-pro-i2v-720p',
};

export const CREDIT_COSTS = {
  textGeneration: 1,
  imageGeneration: 10,
  videoGeneration: 50,
};

export const APP_CONFIG = {
  name: 'Aspendos',
  version: '1.0.0',
  description: 'Unified AI Platform for Text, Image, and Video Generation',
  supportEmail: 'support@aspendos.ai',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
}; 