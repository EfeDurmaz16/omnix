import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Plan as UserPlan } from '@prisma/client';
import { rateLimiter, RateLimitResult } from '@/lib/rate-limiting/RedisRateLimiter';

export interface PlanLimits {
  monthlyCredits: number;
  allowedModels: string[];
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  features: string[];
}

// Helper arrays for model categorization
const FREE_MODELS = [
  // Ultra cost-effective text models ($0-$0.004/1k tokens)
  'meta-llama/llama-3.2-3b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'deepseek/deepseek-chat',
  'deepseek/deepseek-coder',
  'gpt-4.1-nano',
  'gpt-4.1-nano-2025-04-14',
  'gpt-3.5-turbo',
  'gpt-4o-mini',
  'claude-3-5-haiku-20241022',
  'gemini-1.5-flash',
  'gemini-2.0-flash-001'
];

const PRO_MODELS = [
  // Standard performance text models (up to $0.015/1k tokens)
  'gpt-4o', 'gpt-4o-2024-05-13', 'gpt-4o-2024-08-06', 'gpt-4o-2024-11-20',
  'gpt-4.1', 'gpt-4.1-2025-04-14', 'gpt-4.1-mini',
  'o1-mini', 'o1-mini-2024-09-12', 'o3-mini', 'o3-mini-2025-01-31', 'o4-mini', 'o4-mini-2025-04-16',
  'claude-3-5-sonnet-20241022', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219',
  'gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-2.5-pro',
  'qwen/qwen-2.5-coder-32b-instruct', 'qwen/qwen-2.5-72b-instruct',
  'meta-llama/llama-3.1-70b-instruct', 'google/gemma-2-27b-it',
  // Basic image models
  'dall-e-2', 'dall-e-3', 'imagen-3.0-generate-002', 'imagen-4.0-fast-generate-preview-06-06',
  'black-forest-labs/flux-1.1-pro', 'recraft-ai/recraft-v3'
];

const ULTRA_MODELS = [
  // Premium performance text models (up to $0.075/1k tokens)
  'gpt-4', 'gpt-4-0613', 'gpt-4-turbo', 'gpt-4-turbo-2024-04-09', 'gpt-4-turbo-preview',
  'gpt-4.5-preview', 'chatgpt-4o-latest',
  'o1', 'o1-2024-12-17', 'o1-preview', 'o1-preview-2024-09-12', 'o3', 'o3-2025-04-16',
  'claude-3-opus-20240229',
  'mistralai/mistral-large', 'mistralai/codestral', 'x-ai/grok-beta',
  'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-405b-instruct',
  'perplexity/llama-3.1-sonar-large-128k-online',
  'mistral-small-2503@001', 'llama-4-scout-17b-16e-instruct-maas', 'llama-4-maverick-17b-128e-instruct-maas',
  // Advanced image models
  'gpt-image-1', 'gpt-4-vision-preview', 'imagen-4.0-generate-preview-06-06', 'imagen-4.0-ultra-generate-preview-06-06',
  'ideogram-ai/ideogram-v2', 'tencentarc/gfpgan', 'nightmareai/real-esrgan', 'cjwbw/rembg', 'yorickvp/llava-13b',
  // Video models (basic)
  'minimax/video-01', 'lightricks/ltx-video', 'kling-video-v1.6', 'pika-labs-v1.0',
  'stable-video-diffusion-xt', 'zeroscope-v2-xl', 'runway-gen3-turbo', 'haiper-video-v2',
  'luma-ray-v1.0', 'seedance-v1-pro-i2v-720p',
  // Audio models
  'tts-1', 'gpt-4o-mini-tts', 'whisper-1', 'text-embedding-3-small', 'text-embedding-3-large',
  'text-embedding-ada-002', 'meta/musicgen'
];

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  FREE: {
    monthlyCredits: 100,
    allowedModels: FREE_MODELS,
    requestsPerMinute: 5,
    requestsPerHour: 50,
    requestsPerDay: 200,
    features: ['basic-chat']
  },
  PRO: {
    monthlyCredits: 1000,
    allowedModels: [...FREE_MODELS, ...PRO_MODELS],
    requestsPerMinute: 20,
    requestsPerHour: 500,
    requestsPerDay: 2000,
    features: ['basic-chat', 'image-generation', 'code-preview']
  },
  ULTRA: {
    monthlyCredits: 2500,
    allowedModels: [...FREE_MODELS, ...PRO_MODELS, ...ULTRA_MODELS],
    requestsPerMinute: 60,
    requestsPerHour: 1500,
    requestsPerDay: 6000,
    features: ['basic-chat', 'image-generation', 'video-generation-basic', 'code-preview', 'agents']
  },
  TEAM: {
    monthlyCredits: 5000,
    allowedModels: ['*'], // Wildcard for all models including premium
    requestsPerMinute: 120,
    requestsPerHour: 3000,
    requestsPerDay: 12000,
    features: [
      'basic-chat', 
      'image-generation', 
      'video-generation-basic',
      'video-generation-premium',
      'code-preview', 
      'agents',
      'team-collaboration',
      'priority-support'
    ]
  }
};

export class PlanEnforcer {

  /**
   * Check if user has access to a specific model
   */
  static async checkModelAccess(userId: string, modelId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { plan: true }
      });

      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      const planLimits = PLAN_LIMITS[user.plan];
      
      // Check if model is allowed for this plan
      if (planLimits.allowedModels.includes('*') || planLimits.allowedModels.includes(modelId)) {
        return { allowed: true };
      }

      return { 
        allowed: false, 
        reason: `Model ${modelId} not available in ${user.plan} plan. Upgrade to access this model.` 
      };
    } catch (error) {
      console.error('Error checking model access:', error);
      return { allowed: false, reason: 'Error checking access permissions' };
    }
  }

  /**
   * Check if user has sufficient monthly credits
   */
  static async checkMonthlyQuota(userId: string, estimatedCredits: number): Promise<{ allowed: boolean; reason?: string; usage?: any }> {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { 
          plan: true,
          credits: true,
          createdAt: true
        }
      });

      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      // Calculate current month usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyUsage = await prisma.creditTransaction.aggregate({
        where: {
          userId: userId,
          type: 'USAGE',
          createdAt: {
            gte: startOfMonth
          }
        },
        _sum: {
          amount: true
        }
      });

      const usedCredits = Math.abs(monthlyUsage._sum.amount || 0);
      const planLimits = PLAN_LIMITS[user.plan];
      const remainingQuota = planLimits.monthlyCredits - usedCredits;

      const usage = {
        used: usedCredits,
        limit: planLimits.monthlyCredits,
        remaining: remainingQuota,
        percentage: (usedCredits / planLimits.monthlyCredits) * 100
      };

      // Check if user has enough credits (plan credits + purchased credits)
      const totalAvailableCredits = user.credits + remainingQuota;
      
      if (totalAvailableCredits < estimatedCredits) {
        return { 
          allowed: false, 
          reason: `Insufficient credits. Need ${estimatedCredits}, have ${totalAvailableCredits}`,
          usage 
        };
      }

      return { allowed: true, usage };
    } catch (error) {
      console.error('Error checking monthly quota:', error);
      return { allowed: false, reason: 'Error checking quota' };
    }
  }

  /**
   * Check rate limiting based on plan with Redis support
   */
  static async checkRateLimit(
    userId: string, 
    window: 'minute' | 'hour' | 'day',
    endpoint?: string
  ): Promise<{ 
    allowed: boolean; 
    reason?: string; 
    rateLimitInfo?: RateLimitResult;
    headers?: Record<string, string>;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { plan: true }
      });

      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      const planLimits = PLAN_LIMITS[user.plan];
      
      // Create rate limit key with optional endpoint for granular limiting
      const key = endpoint 
        ? `rate_limit:${userId}:${window}:${endpoint}`
        : `rate_limit:${userId}:${window}`;

      // Determine window duration and limit
      let windowMs: number;
      let limit: number;

      switch (window) {
        case 'minute':
          windowMs = 60 * 1000;
          limit = planLimits.requestsPerMinute;
          break;
        case 'hour':
          windowMs = 60 * 60 * 1000;
          limit = planLimits.requestsPerHour;
          break;
        case 'day':
          windowMs = 24 * 60 * 60 * 1000;
          limit = planLimits.requestsPerDay;
          break;
      }

      // Check rate limit using Redis or memory fallback
      const rateLimitResult = await rateLimiter.checkRateLimit(key, limit, windowMs);

      // Generate rate limit headers
      const headers = {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
        'X-RateLimit-Window': window
      };

      if (rateLimitResult.retryAfter) {
        headers['Retry-After'] = rateLimitResult.retryAfter.toString();
      }

      if (!rateLimitResult.allowed) {
        return {
          allowed: false,
          reason: `Rate limit exceeded. ${limit} requests per ${window} allowed for ${user.plan} plan. Try again in ${rateLimitResult.retryAfter || 1} seconds.`,
          rateLimitInfo: rateLimitResult,
          headers
        };
      }

      return {
        allowed: true,
        rateLimitInfo: rateLimitResult,
        headers
      };

    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: false, reason: 'Error checking rate limit' };
    }
  }

  /**
   * Check if user has access to a specific feature
   */
  static async checkFeatureAccess(userId: string, feature: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { plan: true }
      });

      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      const planLimits = PLAN_LIMITS[user.plan];
      
      if (planLimits.features.includes(feature)) {
        return { allowed: true };
      }

      return { 
        allowed: false, 
        reason: `Feature '${feature}' not available in ${user.plan} plan. Upgrade to access this feature.` 
      };
    } catch (error) {
      console.error('Error checking feature access:', error);
      return { allowed: false, reason: 'Error checking feature access' };
    }
  }

  /**
   * Comprehensive plan enforcement for API requests
   */
  static async enforceApiRequest(
    userId: string, 
    modelId: string, 
    estimatedCredits: number,
    feature?: string,
    endpoint?: string
  ): Promise<{ 
    allowed: boolean; 
    reason?: string; 
    rateLimitInfo?: RateLimitResult;
    usageInfo?: any;
    headers?: Record<string, string>;
  }> {
    // Check model access
    const modelCheck = await this.checkModelAccess(userId, modelId);
    if (!modelCheck.allowed) {
      return { allowed: false, reason: modelCheck.reason };
    }

    // Check feature access if specified
    if (feature) {
      const featureCheck = await this.checkFeatureAccess(userId, feature);
      if (!featureCheck.allowed) {
        return { allowed: false, reason: featureCheck.reason };
      }
    }

    // Check monthly quota
    const quotaCheck = await this.checkMonthlyQuota(userId, estimatedCredits);
    if (!quotaCheck.allowed) {
      return { 
        allowed: false, 
        reason: quotaCheck.reason,
        usageInfo: quotaCheck.usage
      };
    }

    // Check rate limiting (minute level - most restrictive)
    const rateLimitCheck = await this.checkRateLimit(userId, 'minute', endpoint);
    if (!rateLimitCheck.allowed) {
      return { 
        allowed: false, 
        reason: rateLimitCheck.reason,
        rateLimitInfo: rateLimitCheck.rateLimitInfo,
        headers: rateLimitCheck.headers
      };
    }

    return { 
      allowed: true,
      rateLimitInfo: rateLimitCheck.rateLimitInfo,
      usageInfo: quotaCheck.usage,
      headers: rateLimitCheck.headers
    };
  }

  /**
   * Get current rate limit status for a user
   */
  static async getRateLimitStatus(
    userId: string,
    window: 'minute' | 'hour' | 'day' = 'minute',
    endpoint?: string
  ): Promise<{
    limit: number;
    remaining: number;
    resetTime: number;
    headers: Record<string, string>;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { plan: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const planLimits = PLAN_LIMITS[user.plan];
      const key = endpoint 
        ? `rate_limit:${userId}:${window}:${endpoint}`
        : `rate_limit:${userId}:${window}`;

      let windowMs: number;
      let limit: number;

      switch (window) {
        case 'minute':
          windowMs = 60 * 1000;
          limit = planLimits.requestsPerMinute;
          break;
        case 'hour':
          windowMs = 60 * 60 * 1000;
          limit = planLimits.requestsPerHour;
          break;
        case 'day':
          windowMs = 24 * 60 * 60 * 1000;
          limit = planLimits.requestsPerDay;
          break;
      }

      const status = await rateLimiter.getRateLimitStatus(key, limit, windowMs);

      const headers = {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': status.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(status.resetTime / 1000).toString(),
        'X-RateLimit-Window': window
      };

      return {
        limit,
        remaining: status.remaining,
        resetTime: status.resetTime,
        headers
      };

    } catch (error) {
      console.error('Error getting rate limit status:', error);
      throw error;
    }
  }

  /**
   * Reset rate limit for a specific user and window
   */
  static async resetRateLimit(
    userId: string,
    window: 'minute' | 'hour' | 'day' = 'minute',
    endpoint?: string
  ): Promise<void> {
    const key = endpoint 
      ? `rate_limit:${userId}:${window}:${endpoint}`
      : `rate_limit:${userId}:${window}`;
    
    await rateLimiter.resetRateLimit(key);
  }

  /**
   * Cleanup expired rate limit entries (delegated to RedisRateLimiter)
   */
  static cleanupRateLimits(): void {
    rateLimiter.cleanupMemoryStore();
  }
}

export default PlanEnforcer;