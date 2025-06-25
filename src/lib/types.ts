export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'ultra';
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'meta' | 'vertex' | 'cohere' | 'midjourney' | 'claude' | 'wavespeed';
  type: 'text' | 'image' | 'video';
  description: string;
  maxTokens: number;
  costPerToken: number;
  available: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | string;
  model?: string;
  tokens?: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationRequest {
  prompt: string;
  model: string;
  type: 'text' | 'image' | 'video';
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    dimensions?: string;
    duration?: number;
  };
}

export interface GenerationResult {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  url?: string;
  model: string;
  prompt: string;
  userId: string;
  tokensUsed: number;
  createdAt: Date;
}

export interface UsageStats {
  totalTokens: number;
  textTokens: number;
  imageGenerations: number;
  videoGenerations: number;
  remainingCredits: number;
  monthlyUsage: number;
  lastReset: Date;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  popular?: boolean;
} 