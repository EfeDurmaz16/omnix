/**
 * Cost Optimization Engine
 * Intelligent model selection based on cost, performance, and requirements
 */

import { ModelInfo } from '../types';
import { getModelRouter } from '../model-router';
import { getAvailableModelsForPlan } from '../model-access';
import { estimateTokens } from '../utils/token-estimation';

export interface OptimizationRequest {
  task: string;
  requiredCapabilities: string[];
  maxCost?: number;
  qualityPreference: 'fast' | 'balanced' | 'high';
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  currentModel?: string;
  userPlan: 'free' | 'pro' | 'ultra' | 'enterprise';
}

export interface ModelCostComparison {
  model: ModelInfo;
  estimatedCost: number;
  qualityScore: number;
  speedScore: number;
  costEfficiencyScore: number;
  savings?: number; // vs current model
  recommendation: 'best' | 'cheapest' | 'premium' | 'alternative';
}

export interface OptimizationResult {
  recommendedModel: ModelInfo;
  estimatedCost: number;
  costRanking: ModelCostComparison[];
  reasoning: string;
  alternatives: ModelCostComparison[];
  potentialSavings: number;
  budgetImpact: 'low' | 'medium' | 'high';
}

interface ModelBenchmark {
  modelId: string;
  qualityScore: number; // 1-10 scale
  speedScore: number; // 1-10 scale (tokens/second)
  reliabilityScore: number; // 1-10 scale
}

export class CostOptimizer {
  private static instance: CostOptimizer;
  private modelBenchmarks: Map<string, ModelBenchmark> = new Map();

  static getInstance(): CostOptimizer {
    if (!CostOptimizer.instance) {
      CostOptimizer.instance = new CostOptimizer();
    }
    return CostOptimizer.instance;
  }

  constructor() {
    this.initializeBenchmarks();
  }

  private initializeBenchmarks() {
    // Initialize model performance benchmarks based on research and testing
    const benchmarks: ModelBenchmark[] = [
      // OpenAI Models
      { modelId: 'gpt-4', qualityScore: 9.5, speedScore: 6.0, reliabilityScore: 9.5 },
      { modelId: 'gpt-4-turbo', qualityScore: 9.3, speedScore: 8.0, reliabilityScore: 9.0 },
      { modelId: 'gpt-3.5-turbo', qualityScore: 7.5, speedScore: 9.0, reliabilityScore: 8.5 },
      { modelId: 'gpt-4o-mini', qualityScore: 8.0, speedScore: 9.5, reliabilityScore: 8.8 },
      
      // Anthropic Models
      { modelId: 'claude-3-opus', qualityScore: 9.8, speedScore: 5.5, reliabilityScore: 9.7 },
      { modelId: 'claude-3-sonnet', qualityScore: 8.5, speedScore: 7.5, reliabilityScore: 9.0 },
      { modelId: 'claude-3-haiku', qualityScore: 7.8, speedScore: 9.2, reliabilityScore: 8.7 },
      
      // Google Models
      { modelId: 'gemini-pro', qualityScore: 8.2, speedScore: 7.8, reliabilityScore: 8.0 },
      { modelId: 'gemini-flash', qualityScore: 7.0, speedScore: 9.8, reliabilityScore: 8.2 },
    ];

    benchmarks.forEach(benchmark => {
      this.modelBenchmarks.set(benchmark.modelId, benchmark);
    });
  }

  async optimizeModelSelection(request: OptimizationRequest): Promise<OptimizationResult> {
    const router = getModelRouter();
    const allModels = await router.getAvailableModels();
    const availableModels = getAvailableModelsForPlan(request.userPlan, allModels);
    
    // Filter models by required capabilities
    const candidateModels = availableModels.filter(model => 
      this.meetsRequirements(model, request)
    );

    if (candidateModels.length === 0) {
      throw new Error('No models available that meet the requirements');
    }

    // Calculate cost and performance for each model
    const comparisons = await Promise.all(
      candidateModels.map(model => this.analyzeModel(model, request))
    );

    // Sort by cost efficiency (quality/cost ratio)
    const sortedComparisons = comparisons.sort((a, b) => 
      b.costEfficiencyScore - a.costEfficiencyScore
    );

    // Determine best recommendation based on preference
    const recommendedComparison = this.selectRecommendation(sortedComparisons, request);
    
    // Calculate potential savings vs current model
    const potentialSavings = this.calculatePotentialSavings(comparisons, request.currentModel);
    
    return {
      recommendedModel: recommendedComparison.model,
      estimatedCost: recommendedComparison.estimatedCost,
      costRanking: sortedComparisons,
      reasoning: this.generateReasoning(recommendedComparison, request),
      alternatives: sortedComparisons.filter(c => c !== recommendedComparison).slice(0, 3),
      potentialSavings,
      budgetImpact: this.assessBudgetImpact(recommendedComparison.estimatedCost)
    };
  }

  private meetsRequirements(model: ModelInfo, request: OptimizationRequest): boolean {
    // Check if model has required capabilities
    return request.requiredCapabilities.every(capability => 
      model.capabilities?.includes(capability as any) || 
      model.type === capability ||
      (capability === 'text' && ['text', 'multimodal'].includes(model.type))
    );
  }

  private async analyzeModel(model: ModelInfo, request: OptimizationRequest): Promise<ModelCostComparison> {
    // Estimate tokens if not provided
    const inputTokens = request.estimatedInputTokens || 
      estimateTokens(request.task).input;
    const outputTokens = request.estimatedOutputTokens || 
      estimateTokens(request.task).output;

    // Calculate cost
    const inputCost = (inputTokens / 1000) * (model.inputCostPer1kTokens || 0);
    const outputCost = (outputTokens / 1000) * (model.outputCostPer1kTokens || 0);
    const estimatedCost = inputCost + outputCost;

    // Get performance metrics
    const benchmark = this.modelBenchmarks.get(model.id) || {
      modelId: model.id,
      qualityScore: 7.0, // Default moderate quality
      speedScore: 7.0,   // Default moderate speed
      reliabilityScore: 7.0
    };

    // Calculate cost efficiency (quality per dollar)
    const costEfficiencyScore = estimatedCost > 0 ? 
      (benchmark.qualityScore * benchmark.reliabilityScore) / (estimatedCost * 1000) : 0;

    // Determine recommendation type
    const recommendation = this.determineRecommendationType(model, estimatedCost, benchmark);

    return {
      model,
      estimatedCost,
      qualityScore: benchmark.qualityScore,
      speedScore: benchmark.speedScore,
      costEfficiencyScore,
      recommendation
    };
  }

  private determineRecommendationType(
    model: ModelInfo, 
    cost: number, 
    benchmark: ModelBenchmark
  ): 'best' | 'cheapest' | 'premium' | 'alternative' {
    if (benchmark.qualityScore >= 9.0 && cost < 0.05) return 'best';
    if (cost < 0.01) return 'cheapest';
    if (benchmark.qualityScore >= 9.5) return 'premium';
    return 'alternative';
  }

  private selectRecommendation(
    comparisons: ModelCostComparison[], 
    request: OptimizationRequest
  ): ModelCostComparison {
    switch (request.qualityPreference) {
      case 'fast':
        // Prioritize speed and low cost
        return comparisons.sort((a, b) => 
          (b.speedScore / a.estimatedCost) - (a.speedScore / b.estimatedCost)
        )[0];
      
      case 'high':
        // Prioritize quality regardless of cost
        return comparisons.sort((a, b) => b.qualityScore - a.qualityScore)[0];
      
      case 'balanced':
      default:
        // Use cost efficiency (already sorted)
        return comparisons[0];
    }
  }

  private calculatePotentialSavings(
    comparisons: ModelCostComparison[], 
    currentModelId?: string
  ): number {
    if (!currentModelId) return 0;

    const currentModelComparison = comparisons.find(c => c.model.id === currentModelId);
    if (!currentModelComparison) return 0;

    const cheapestModel = comparisons.reduce((prev, current) => 
      current.estimatedCost < prev.estimatedCost ? current : prev
    );

    return Math.max(0, currentModelComparison.estimatedCost - cheapestModel.estimatedCost);
  }

  private assessBudgetImpact(cost: number): 'low' | 'medium' | 'high' {
    if (cost < 0.01) return 'low';
    if (cost < 0.05) return 'medium';
    return 'high';
  }

  private generateReasoning(comparison: ModelCostComparison, request: OptimizationRequest): string {
    const model = comparison.model;
    const reasons: string[] = [];

    reasons.push(`${model.name} offers the best cost-efficiency ratio (${comparison.costEfficiencyScore.toFixed(2)})`);
    
    if (comparison.qualityScore >= 9.0) {
      reasons.push('High quality output for complex tasks');
    }
    
    if (comparison.speedScore >= 8.0) {
      reasons.push('Fast response times for quick iterations');
    }
    
    if (comparison.estimatedCost < 0.02) {
      reasons.push('Low cost per request, suitable for high-volume usage');
    }

    if (request.maxCost && comparison.estimatedCost <= request.maxCost) {
      reasons.push(`Stays within budget constraint of $${request.maxCost}`);
    }

    return reasons.join('. ') + '.';
  }

  /**
   * Get cost comparison between multiple models for the same task
   */
  async compareModelCosts(
    modelIds: string[],
    task: string,
    userPlan: string
  ): Promise<ModelCostComparison[]> {
    const request: OptimizationRequest = {
      task,
      requiredCapabilities: ['text'],
      qualityPreference: 'balanced',
      userPlan: userPlan as any
    };

    const router = getModelRouter();
    const allModels = await router.getAvailableModels();
    const availableModels = getAvailableModelsForPlan(userPlan, allModels);
    const requestedModels = availableModels.filter(model => 
      modelIds.includes(model.id)
    );

    return Promise.all(
      requestedModels.map(model => this.analyzeModel(model, request))
    );
  }

  /**
   * Get budget-friendly alternatives for expensive models
   */
  async getBudgetAlternatives(
    expensiveModelId: string,
    maxCost: number,
    userPlan: string
  ): Promise<ModelCostComparison[]> {
    const router = getModelRouter();
    const allModels = await router.getAvailableModels();
    const availableModels = getAvailableModelsForPlan(userPlan, allModels);
    const expensiveModel = availableModels.find(m => m.id === expensiveModelId);
    
    if (!expensiveModel) {
      throw new Error(`Model ${expensiveModelId} not found`);
    }

    const request: OptimizationRequest = {
      task: 'General text generation task',
      requiredCapabilities: expensiveModel.capabilities || ['text'],
      maxCost,
      qualityPreference: 'balanced',
      userPlan: userPlan as any
    };

    const alternatives = availableModels.filter(model => 
      model.id !== expensiveModelId &&
      this.meetsRequirements(model, request)
    );

    const comparisons = await Promise.all(
      alternatives.map(model => this.analyzeModel(model, request))
    );

    return comparisons
      .filter(c => c.estimatedCost <= maxCost)
      .sort((a, b) => b.costEfficiencyScore - a.costEfficiencyScore);
  }
}

// Export singleton instance
export const costOptimizer = CostOptimizer.getInstance();