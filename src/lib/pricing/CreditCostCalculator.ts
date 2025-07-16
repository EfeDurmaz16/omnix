/**
 * Credit Cost Calculator - Integrates with existing system
 * 
 * This service calculates and deducts credits for API usage,
 * ensuring profitability while providing transparent pricing.
 */

import { prismaCreditManager } from '@/lib/credits/PrismaCreditManager';
import { calculateCreditCost, getModelCreditCost, CREDIT_COST_TIERS } from './CreditPricing';
import type { TokenUsage } from '@/lib/providers/base';

export interface CreditDeductionResult {
  success: boolean;
  creditsDeducted: number;
  remainingCredits: number;
  error?: string;
  breakdown?: {
    baseCredits: number;
    tokenCredits: number;
    multiplier: number;
    total: number;
  };
}

export interface CreditEstimate {
  estimatedCredits: number;
  tier: string;
  breakdown: {
    baseCredits: number;
    inputTokenCredits: number;
    outputTokenCredits: number;
    multiplier: number;
  };
}

export class CreditCostCalculator {
  private static instance: CreditCostCalculator;
  
  static getInstance(): CreditCostCalculator {
    if (!CreditCostCalculator.instance) {
      CreditCostCalculator.instance = new CreditCostCalculator();
    }
    return CreditCostCalculator.instance;
  }

  /**
   * Calculate credit cost for a model request
   */
  calculateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    requestType: 'text' | 'image' | 'video' | 'audio' = 'text'
  ): CreditEstimate {
    const tier = this.findModelTier(modelId);
    const config = tier.config;
    
    // Base cost
    const baseCredits = config.baseCreditsPerRequest;
    
    // Token-based costs
    const inputTokenCredits = inputTokens * config.creditsPerInputToken;
    const outputTokenCredits = outputTokens * config.creditsPerOutputToken;
    
    // Apply request type multiplier
    let multiplier = 1.0;
    if (requestType === 'image') {
      multiplier = 2.0;
    } else if (requestType === 'video') {
      multiplier = 5.0;
    } else if (requestType === 'audio') {
      multiplier = 1.5;
    }
    
    const subtotal = baseCredits + inputTokenCredits + outputTokenCredits;
    const total = subtotal * multiplier;
    
    // Apply min/max bounds
    const finalCredits = Math.max(
      config.minimumCredits,
      Math.min(config.maximumCredits, Math.ceil(total))
    );
    
    return {
      estimatedCredits: finalCredits,
      tier: tier.name,
      breakdown: {
        baseCredits,
        inputTokenCredits,
        outputTokenCredits,
        multiplier
      }
    };
  }

  /**
   * Process credit deduction for API usage
   */
  async processUsage(
    modelId: string,
    usage: TokenUsage,
    requestType: 'text' | 'image' | 'video' | 'audio' = 'text',
    userId?: string
  ): Promise<CreditDeductionResult> {
    try {
      // Calculate credit cost
      const estimate = this.calculateCost(
        modelId,
        usage.promptTokens,
        usage.completionTokens,
        requestType
      );
      
      // Check if user has sufficient credits
      const currentCredits = await prismaCreditManager.getCredits(userId);
      
      if (currentCredits < estimate.estimatedCredits) {
        return {
          success: false,
          creditsDeducted: 0,
          remainingCredits: currentCredits,
          error: `Insufficient credits: ${currentCredits} available, ${estimate.estimatedCredits} required`
        };
      }
      
      // Deduct credits
      const deductionResult = await prismaCreditManager.deductCredits(
        estimate.estimatedCredits,
        `${modelId} usage: ${usage.promptTokens} input + ${usage.completionTokens} output tokens`,
        {
          modelId,
          requestType,
          tokenUsage: usage,
          tier: estimate.tier,
          breakdown: estimate.breakdown
        },
        userId
      );
      
      if (deductionResult.success) {
        return {
          success: true,
          creditsDeducted: estimate.estimatedCredits,
          remainingCredits: deductionResult.newBalance,
          breakdown: {
            baseCredits: estimate.breakdown.baseCredits,
            tokenCredits: estimate.breakdown.inputTokenCredits + estimate.breakdown.outputTokenCredits,
            multiplier: estimate.breakdown.multiplier,
            total: estimate.estimatedCredits
          }
        };
      } else {
        return {
          success: false,
          creditsDeducted: 0,
          remainingCredits: currentCredits,
          error: deductionResult.error
        };
      }
      
    } catch (error) {
      console.error('Failed to process credit usage:', error);
      return {
        success: false,
        creditsDeducted: 0,
        remainingCredits: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get credit estimate for a model without deducting
   */
  async getEstimate(
    modelId: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
    requestType: 'text' | 'image' | 'video' | 'audio' = 'text'
  ): Promise<CreditEstimate> {
    return this.calculateCost(modelId, estimatedInputTokens, estimatedOutputTokens, requestType);
  }

  /**
   * Check if user has sufficient credits for a request
   */
  async canAfford(
    modelId: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
    requestType: 'text' | 'image' | 'video' | 'audio' = 'text',
    userId?: string
  ): Promise<{
    canAfford: boolean;
    currentCredits: number;
    requiredCredits: number;
    shortfall: number;
  }> {
    const estimate = await this.getEstimate(modelId, estimatedInputTokens, estimatedOutputTokens, requestType);
    const currentCredits = await prismaCreditManager.getCredits(userId);
    
    return {
      canAfford: currentCredits >= estimate.estimatedCredits,
      currentCredits,
      requiredCredits: estimate.estimatedCredits,
      shortfall: Math.max(0, estimate.estimatedCredits - currentCredits)
    };
  }

  /**
   * Get model pricing info for display
   */
  getModelPricing(modelId: string): {
    tier: string;
    baseCredits: number;
    inputCreditsPer1k: number;
    outputCreditsPer1k: number;
    example1kTokens: number;
  } {
    const tier = this.findModelTier(modelId);
    const config = tier.config;
    
    // Calculate cost for 1k tokens (60% input, 40% output)
    const example = this.calculateCost(modelId, 600, 400, 'text');
    
    return {
      tier: tier.name,
      baseCredits: config.baseCreditsPerRequest,
      inputCreditsPer1k: config.creditsPerInputToken * 1000,
      outputCreditsPer1k: config.creditsPerOutputToken * 1000,
      example1kTokens: example.estimatedCredits
    };
  }

  /**
   * Get all model pricing for comparison
   */
  getAllModelPricing(): Record<string, ReturnType<typeof this.getModelPricing>> {
    const pricing: Record<string, ReturnType<typeof this.getModelPricing>> = {};
    
    // Get pricing for each tier's representative models
    Object.entries(CREDIT_COST_TIERS).forEach(([tierName, tier]) => {
      tier.models.forEach(model => {
        pricing[model] = this.getModelPricing(model);
      });
    });
    
    return pricing;
  }

  /**
   * Find which tier a model belongs to
   */
  private findModelTier(modelId: string) {
    for (const [tierName, tier] of Object.entries(CREDIT_COST_TIERS)) {
      if (tier.models.some(model => 
        modelId.includes(model) || 
        model.includes(modelId) ||
        this.fuzzyMatch(modelId, model)
      )) {
        return tier;
      }
    }
    
    // Default to standard tier for unknown models
    return CREDIT_COST_TIERS.standard;
  }

  /**
   * Fuzzy match for model names
   */
  private fuzzyMatch(modelId: string, tierModel: string): boolean {
    const normalize = (str: string) => str.toLowerCase().replace(/[-_\s]/g, '');
    const normalizedModelId = normalize(modelId);
    const normalizedTierModel = normalize(tierModel);
    
    return normalizedModelId.includes(normalizedTierModel) || 
           normalizedTierModel.includes(normalizedModelId);
  }

  /**
   * Get usage analytics for cost optimization
   */
  async getUsageAnalytics(userId?: string): Promise<{
    totalCreditsUsed: number;
    averagePerRequest: number;
    topModels: Array<{
      modelId: string;
      creditsUsed: number;
      requestCount: number;
    }>;
    recommendations: string[];
  }> {
    try {
      const transactions = await enhancedCreditManager.getTransactionHistory(userId);
      const usageTransactions = transactions.filter(t => t.type === 'usage');
      
      const totalCreditsUsed = usageTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const averagePerRequest = usageTransactions.length > 0 ? totalCreditsUsed / usageTransactions.length : 0;
      
      // Aggregate by model
      const modelUsage: Record<string, { credits: number; count: number }> = {};
      
      usageTransactions.forEach(t => {
        const modelId = t.metadata?.modelId || 'unknown';
        if (!modelUsage[modelId]) {
          modelUsage[modelId] = { credits: 0, count: 0 };
        }
        modelUsage[modelId].credits += Math.abs(t.amount);
        modelUsage[modelId].count += 1;
      });
      
      const topModels = Object.entries(modelUsage)
        .map(([modelId, usage]) => ({
          modelId,
          creditsUsed: usage.credits,
          requestCount: usage.count
        }))
        .sort((a, b) => b.creditsUsed - a.creditsUsed)
        .slice(0, 5);
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (averagePerRequest > 20) {
        recommendations.push('Consider using lower-tier models for simple tasks to reduce costs');
      }
      
      if (topModels.length > 0 && topModels[0].creditsUsed > totalCreditsUsed * 0.5) {
        recommendations.push(`${topModels[0].modelId} accounts for >50% of your usage - consider optimization`);
      }
      
      return {
        totalCreditsUsed,
        averagePerRequest,
        topModels,
        recommendations
      };
      
    } catch (error) {
      console.error('Failed to get usage analytics:', error);
      return {
        totalCreditsUsed: 0,
        averagePerRequest: 0,
        topModels: [],
        recommendations: ['Unable to analyze usage - please try again later']
      };
    }
  }
}

// Export singleton instance
export const creditCostCalculator = CreditCostCalculator.getInstance();