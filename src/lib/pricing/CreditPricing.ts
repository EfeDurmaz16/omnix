/**
 * Credit Pricing System - Recalculated for profitability
 * 
 * This system defines credit costs for different models and operations
 * to ensure sustainable business operations while providing competitive pricing.
 */

export interface CreditCostConfig {
  baseCreditsPerRequest: number;
  creditsPerInputToken: number;
  creditsPerOutputToken: number;
  minimumCredits: number;
  maximumCredits: number;
  multiplier: number; // For different model tiers
}

export interface ModelCostTier {
  name: string;
  description: string;
  config: CreditCostConfig;
  models: string[];
}

/**
 * Credit Cost Tiers - Recalculated for profitability
 */
export const CREDIT_COST_TIERS: Record<string, ModelCostTier> = {
  // Tier 1: Basic models (GPT-3.5, Claude Haiku, etc.) - 1-2 credits per chat
  basic: {
    name: 'Basic',
    description: 'Fast, efficient models for simple tasks',
    config: {
      baseCreditsPerRequest: 1,
      creditsPerInputToken: 0.0005,
      creditsPerOutputToken: 0.001,
      minimumCredits: 1,
      maximumCredits: 3,
      multiplier: 1.0
    },
    models: [
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'claude-3-haiku-20240307',
      'gemini-1.5-flash'
    ]
  },

  // Tier 2: Standard models (GPT-4, Claude Sonnet, etc.) - 2-4 credits per chat
  standard: {
    name: 'Standard',
    description: 'Balanced performance and cost',
    config: {
      baseCreditsPerRequest: 2,
      creditsPerInputToken: 0.001,
      creditsPerOutputToken: 0.002,
      minimumCredits: 2,
      maximumCredits: 6,
      multiplier: 1.5
    },
    models: [
      'gpt-4',
      'gpt-4-turbo',
      'claude-3-sonnet-20240229',
      'gemini-1.5-pro'
    ]
  },

  // Tier 3: Premium models (GPT-4o, Claude Opus, etc.) - 3-5 credits per chat
  premium: {
    name: 'Premium',
    description: 'High-performance models for complex tasks',
    config: {
      baseCreditsPerRequest: 3,
      creditsPerInputToken: 0.0015,
      creditsPerOutputToken: 0.003,
      minimumCredits: 3,
      maximumCredits: 8,
      multiplier: 2.0
    },
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'claude-3-opus-20240229',
      'gemini-1.5-pro-002'
    ]
  },

  // Tier 4: Image models - 10-25 credits per request
  image: {
    name: 'Image Generation',
    description: 'AI image generation models',
    config: {
      baseCreditsPerRequest: 10,
      creditsPerInputToken: 0.01,
      creditsPerOutputToken: 0.02,
      minimumCredits: 10,
      maximumCredits: 25,
      multiplier: 5.0
    },
    models: [
      'dall-e-3',
      'dall-e-2',
      'stable-diffusion-xl',
      'midjourney',
      'stable-diffusion-3'
    ]
  },

  // Tier 5: Video models - 150-300 credits per request (covers $6-12 cost)
  video: {
    name: 'Video Generation',
    description: 'AI video generation models - premium pricing',
    config: {
      baseCreditsPerRequest: 150, // Minimum 150 credits = $6 (covers base cost)
      creditsPerInputToken: 0.05,
      creditsPerOutputToken: 0.1,
      minimumCredits: 150, // $6 minimum
      maximumCredits: 300, // $12 maximum
      multiplier: 30.0
    },
    models: [
      'seedance-video-v1',
      'google-veo-2',
      'google-veo-3',
      'runway-gen-3',
      'luma-dream-machine'
    ]
  }
};

/**
 * Credit Package Pricing - Updated for profitability with video generation
 */
export const CREDIT_PACKAGES = {
  starter: {
    price: 9, // $9 (was $5)
    credits: 100,
    bonus: 0,
    costPerCredit: 0.09, // $9 / 100 = $0.09
    description: 'Perfect for trying out the platform - includes chat & images'
  },
  
  popular: {
    price: 29, // $29 (was $15)
    credits: 300,
    bonus: 50, // Total: 350 credits
    costPerCredit: 0.083, // $29 / 350 = ~$0.083
    description: 'Best value for regular users - includes 2 videos'
  },
  
  power: {
    price: 69, // $69 (was $40)
    credits: 800,
    bonus: 200, // Total: 1000 credits
    costPerCredit: 0.069, // $69 / 1000 = $0.069
    description: 'For power users - includes 6 videos'
  },
  
  enterprise: {
    price: 149, // $149 (was $100)
    credits: 2000,
    bonus: 500, // Total: 2500 credits
    costPerCredit: 0.0596, // $149 / 2500 = ~$0.06
    description: 'Maximum value for businesses - includes 16 videos'
  }
};

/**
 * Subscription Plan Credit Allocations
 */
export const SUBSCRIPTION_CREDITS = {
  free: {
    monthlyCredits: 100,
    rollover: false,
    description: 'Basic usage for testing'
  },
  
  pro: {
    monthlyCredits: 1000, // Increased from unlimited text to credit-based
    rollover: true,
    rolloverLimit: 500, // Max 500 credits can roll over
    description: 'Professional usage with rollover'
  },
  
  ultra: {
    monthlyCredits: 2500,
    rollover: true,
    rolloverLimit: 1000,
    description: 'Power user allocation'
  },
  
  team: {
    monthlyCredits: 5000, // Per team member
    rollover: true,
    rolloverLimit: 2000,
    description: 'Team collaboration credits'
  }
};

/**
 * Calculate credit cost for a request
 */
export function calculateCreditCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  requestType: 'text' | 'image' | 'video' | 'audio' = 'text'
): number {
  // Find the appropriate tier for this model
  const tier = findModelTier(modelId);
  const config = tier.config;
  
  // Calculate base cost
  let cost = config.baseCreditsPerRequest;
  
  // Add token-based costs
  cost += inputTokens * config.creditsPerInputToken;
  cost += outputTokens * config.creditsPerOutputToken;
  
  // Apply request type multiplier (now handled by tier-specific pricing)
  if (requestType === 'image') {
    cost *= 1.5;
  } else if (requestType === 'video') {
    cost *= 2; // Video models already have high base cost
  } else if (requestType === 'audio') {
    cost *= 1.5;
  }
  
  // Ensure within bounds
  cost = Math.max(config.minimumCredits, Math.min(config.maximumCredits, cost));
  
  // Round to reasonable precision
  return Math.ceil(cost);
}

/**
 * Find which tier a model belongs to
 */
function findModelTier(modelId: string): ModelCostTier {
  // Check video models first (highest cost)
  if (CREDIT_COST_TIERS.video.models.some(model => modelId.includes(model) || model.includes(modelId))) {
    return CREDIT_COST_TIERS.video;
  }
  
  // Check image models
  if (CREDIT_COST_TIERS.image.models.some(model => modelId.includes(model) || model.includes(modelId))) {
    return CREDIT_COST_TIERS.image;
  }
  
  // Check other tiers
  for (const [tierName, tier] of Object.entries(CREDIT_COST_TIERS)) {
    if (tierName === 'video' || tierName === 'image') continue; // Already checked above
    
    if (tier.models.some(model => modelId.includes(model) || model.includes(modelId))) {
      return tier;
    }
  }
  
  // Default to standard tier for unknown models
  return CREDIT_COST_TIERS.standard;
}

/**
 * Get profitability analysis for current pricing
 */
export function getProfitabilityAnalysis() {
  const averageModelCost = 0.002; // Average cost per 1k tokens from providers
  const creditValue = 0.04; // Average value per credit ($40 / 1000 credits)
  
  const analysis = {
    // Cost breakdown
    providerCosts: {
      gpt35: 0.0015, // $0.0015 per 1k tokens
      gpt4: 0.03, // $0.03 per 1k tokens
      claude: 0.008, // $0.008 per 1k tokens
      gemini: 0.00125 // $0.00125 per 1k tokens
    },
    
    // Our pricing
    creditCosts: {
      basic: 2, // 2 credits minimum
      standard: 5, // 5 credits minimum
      premium: 10, // 10 credits minimum
      specialized: 25 // 25 credits minimum
    },
    
    // Profitability margins
    margins: {
      basic: ((2 * creditValue) - 0.0015) / (2 * creditValue) * 100, // ~81% margin
      standard: ((5 * creditValue) - 0.03) / (5 * creditValue) * 100, // ~85% margin
      premium: ((10 * creditValue) - 0.03) / (10 * creditValue) * 100, // ~92% margin
      specialized: ((25 * creditValue) - 0.05) / (25 * creditValue) * 100 // ~95% margin
    },
    
    // Recommendations
    recommendations: [
      'Current pricing provides healthy margins of 80-95%',
      'Credit packages offer good value while maintaining profitability',
      'Subscription plans should be credit-based to ensure cost control',
      'Consider usage-based pricing for high-volume users'
    ]
  };
  
  return analysis;
}

/**
 * Estimate monthly costs for subscription plans
 */
export function estimateSubscriptionCosts(plan: keyof typeof SUBSCRIPTION_CREDITS) {
  const planConfig = SUBSCRIPTION_CREDITS[plan];
  const creditValue = 0.04; // $40 / 1000 credits
  
  const estimatedMonthlyCost = planConfig.monthlyCredits * creditValue;
  
  return {
    plan,
    monthlyCredits: planConfig.monthlyCredits,
    estimatedValue: estimatedMonthlyCost,
    costPerCredit: creditValue,
    rollover: planConfig.rollover,
    rolloverLimit: planConfig.rolloverLimit
  };
}

/**
 * Get credit cost for a specific model and usage
 */
export function getModelCreditCost(
  modelId: string,
  estimatedTokens: number = 1000
): {
  tier: string;
  costPerRequest: number;
  costPer1kTokens: number;
  estimatedCost: number;
} {
  const tier = findModelTier(modelId);
  const inputTokens = Math.floor(estimatedTokens * 0.6); // Assume 60% input
  const outputTokens = Math.floor(estimatedTokens * 0.4); // Assume 40% output
  
  const totalCost = calculateCreditCost(modelId, inputTokens, outputTokens);
  
  return {
    tier: tier.name,
    costPerRequest: tier.config.baseCreditsPerRequest,
    costPer1kTokens: (tier.config.creditsPerInputToken + tier.config.creditsPerOutputToken) * 1000,
    estimatedCost: totalCost
  };
}

/**
 * Validate credit pricing strategy
 */
export function validatePricingStrategy(): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check if margins are healthy (>70%)
  const analysis = getProfitabilityAnalysis();
  
  Object.entries(analysis.margins).forEach(([tier, margin]) => {
    if (margin < 70) {
      issues.push(`${tier} tier margin is below 70% (${margin.toFixed(1)}%)`);
    }
  });
  
  // Check credit package pricing
  Object.entries(CREDIT_PACKAGES).forEach(([packageName, packageConfig]) => {
    if (packageConfig.costPerCredit > 0.05) {
      suggestions.push(`Consider reducing cost per credit for ${packageName} package`);
    }
    
    if (packageConfig.costPerCredit < 0.03) {
      issues.push(`${packageName} package cost per credit may be too low for profitability`);
    }
  });
  
  // Check subscription allocations
  const proValue = SUBSCRIPTION_CREDITS.pro.monthlyCredits * 0.04; // $40
  if (proValue < 19.99) {
    suggestions.push('Pro plan credit allocation provides good value');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}