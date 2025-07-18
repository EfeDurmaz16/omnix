/**
 * Model Performance Analytics System for OmniX
 * Tracks usage, performance, and cost metrics across 319+ models
 */

export interface ModelUsageEvent {
  id: string;
  userId: string;
  modelId: string;
  provider: string;
  timestamp: Date;
  requestType: 'text' | 'image' | 'video' | 'audio' | 'multimodal';
  tokensUsed: number;
  responseTime: number; // milliseconds
  success: boolean;
  error?: string;
  cost: number; // USD
  inputLength: number;
  outputLength: number;
  quality?: string;
  mode?: string; // flash, think, ultra-think, etc.
  contextWindow?: number;
  metadata?: Record<string, any>;
}

export interface ModelPerformanceMetrics {
  modelId: string;
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  totalCost: number;
  averageCost: number;
  totalTokens: number;
  averageTokensPerRequest: number;
  lastUsed: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  costTrend: 'increasing' | 'decreasing' | 'stable';
  performanceTrend: 'improving' | 'declining' | 'stable';
}

export interface CostAnalysis {
  totalSpent: number;
  topCostlyModels: Array<{
    modelId: string;
    cost: number;
    percentage: number;
  }>;
  costByProvider: Record<string, number>;
  costByDay: Array<{
    date: string;
    cost: number;
  }>;
  projectedMonthlyCost: number;
  costOptimizationOpportunities: Array<{
    type: 'model_switch' | 'usage_reduction' | 'plan_change';
    description: string;
    potentialSavings: number;
    confidence: number;
  }>;
}

export interface PerformanceReport {
  period: 'hour' | 'day' | 'week' | 'month';
  timeRange: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  totalCost: number;
  averageResponseTime: number;
  systemSuccessRate: number;
  topModels: ModelPerformanceMetrics[];
  slowestModels: ModelPerformanceMetrics[];
  costliestModels: ModelPerformanceMetrics[];
  mostReliableModels: ModelPerformanceMetrics[];
  modelRecommendations: Array<{
    modelId: string;
    reason: string;
    score: number;
  }>;
}

export class ModelAnalytics {
  private events: ModelUsageEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events in memory
  private metricsCache = new Map<string, ModelPerformanceMetrics>();
  private lastCacheUpdate = new Date(0);
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Record a model usage event
   */
  recordEvent(event: Omit<ModelUsageEvent, 'id' | 'timestamp'>): void {
    const usageEvent: ModelUsageEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.events.push(usageEvent);

    // Maintain maximum event count
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Invalidate cache for affected model
    this.metricsCache.delete(event.modelId);

    console.log(`📊 Recorded analytics event: ${event.modelId} (${event.responseTime}ms, $${event.cost.toFixed(4)})`);
  }

  /**
   * Get performance metrics for a specific model
   */
  getModelMetrics(modelId: string, timeRangeHours = 24): ModelPerformanceMetrics | null {
    const cacheKey = `${modelId}_${timeRangeHours}h`;
    
    // Check cache first
    if (this.metricsCache.has(cacheKey) && 
        Date.now() - this.lastCacheUpdate.getTime() < this.cacheValidityMs) {
      return this.metricsCache.get(cacheKey)!;
    }

    const now = new Date();
    const startTime = new Date(now.getTime() - (timeRangeHours * 60 * 60 * 1000));
    
    const modelEvents = this.events.filter(
      event => event.modelId === modelId && 
               event.timestamp >= startTime
    );

    if (modelEvents.length === 0) {
      return null;
    }

    const successfulEvents = modelEvents.filter(e => e.success);
    const responseTimes = modelEvents.map(e => e.responseTime).sort((a, b) => a - b);
    
    const metrics: ModelPerformanceMetrics = {
      modelId,
      provider: modelEvents[0].provider,
      totalRequests: modelEvents.length,
      successfulRequests: successfulEvents.length,
      failedRequests: modelEvents.length - successfulEvents.length,
      successRate: (successfulEvents.length / modelEvents.length) * 100,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      medianResponseTime: responseTimes[Math.floor(responseTimes.length / 2)],
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
      totalCost: modelEvents.reduce((sum, e) => sum + e.cost, 0),
      averageCost: modelEvents.reduce((sum, e) => sum + e.cost, 0) / modelEvents.length,
      totalTokens: modelEvents.reduce((sum, e) => sum + e.tokensUsed, 0),
      averageTokensPerRequest: modelEvents.reduce((sum, e) => sum + e.tokensUsed, 0) / modelEvents.length,
      lastUsed: new Date(Math.max(...modelEvents.map(e => e.timestamp.getTime()))),
      timeRange: {
        start: startTime,
        end: now
      },
      costTrend: this.calculateCostTrend(modelEvents),
      performanceTrend: this.calculatePerformanceTrend(modelEvents)
    };

    // Cache the result
    this.metricsCache.set(cacheKey, metrics);
    this.lastCacheUpdate = new Date();

    return metrics;
  }

  /**
   * Get cost analysis for the specified time period
   */
  getCostAnalysis(timeRangeHours = 24): CostAnalysis {
    const now = new Date();
    const startTime = new Date(now.getTime() - (timeRangeHours * 60 * 60 * 1000));
    
    const recentEvents = this.events.filter(event => event.timestamp >= startTime);
    const totalCost = recentEvents.reduce((sum, e) => sum + e.cost, 0);

    // Cost by model
    const costByModel = new Map<string, number>();
    recentEvents.forEach(event => {
      costByModel.set(event.modelId, (costByModel.get(event.modelId) || 0) + event.cost);
    });

    const topCostlyModels = Array.from(costByModel.entries())
      .map(([modelId, cost]) => ({
        modelId,
        cost,
        percentage: (cost / totalCost) * 100
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Cost by provider
    const costByProvider: Record<string, number> = {};
    recentEvents.forEach(event => {
      costByProvider[event.provider] = (costByProvider[event.provider] || 0) + event.cost;
    });

    // Daily cost breakdown
    const costByDay = this.getDailyCostBreakdown(recentEvents);

    // Project monthly cost
    const dailyAverage = totalCost / (timeRangeHours / 24);
    const projectedMonthlyCost = dailyAverage * 30;

    return {
      totalSpent: totalCost,
      topCostlyModels,
      costByProvider,
      costByDay,
      projectedMonthlyCost,
      costOptimizationOpportunities: this.generateCostOptimizations(recentEvents)
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): PerformanceReport {
    const hours = { hour: 1, day: 24, week: 168, month: 720 }[period];
    const now = new Date();
    const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    const recentEvents = this.events.filter(event => event.timestamp >= startTime);
    
    // Get metrics for all models that were used
    const uniqueModels = [...new Set(recentEvents.map(e => e.modelId))];
    const allMetrics = uniqueModels
      .map(modelId => this.getModelMetrics(modelId, hours))
      .filter(metrics => metrics !== null) as ModelPerformanceMetrics[];

    // Sort models by different criteria
    const topModels = [...allMetrics]
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 5);

    const slowestModels = [...allMetrics]
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, 5);

    const costliestModels = [...allMetrics]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    const mostReliableModels = [...allMetrics]
      .filter(m => m.totalRequests >= 5) // Minimum requests for reliability
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    return {
      period,
      timeRange: { start: startTime, end: now },
      totalRequests: recentEvents.length,
      totalCost: recentEvents.reduce((sum, e) => sum + e.cost, 0),
      averageResponseTime: recentEvents.reduce((sum, e) => sum + e.responseTime, 0) / recentEvents.length,
      systemSuccessRate: (recentEvents.filter(e => e.success).length / recentEvents.length) * 100,
      topModels,
      slowestModels,
      costliestModels,
      mostReliableModels,
      modelRecommendations: this.generateModelRecommendations(allMetrics)
    };
  }

  /**
   * Get real-time statistics
   */
  getRealTimeStats() {
    const lastHourEvents = this.events.filter(
      event => event.timestamp > new Date(Date.now() - 60 * 60 * 1000)
    );

    const activeModels = new Set(lastHourEvents.map(e => e.modelId)).size;
    const totalCost = lastHourEvents.reduce((sum, e) => sum + e.cost, 0);
    const averageResponseTime = lastHourEvents.length > 0 
      ? lastHourEvents.reduce((sum, e) => sum + e.responseTime, 0) / lastHourEvents.length 
      : 0;

    return {
      timestamp: new Date(),
      requestsLastHour: lastHourEvents.length,
      activeModels,
      costLastHour: totalCost,
      averageResponseTime: Math.round(averageResponseTime),
      successRate: lastHourEvents.length > 0 
        ? (lastHourEvents.filter(e => e.success).length / lastHourEvents.length) * 100 
        : 100,
      totalEventsTracked: this.events.length
    };
  }

  /**
   * Clear old data to prevent memory issues
   */
  cleanup(): void {
    const cutoffTime = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days
    this.events = this.events.filter(event => event.timestamp > cutoffTime);
    this.metricsCache.clear();
    console.log(`🧹 Analytics cleanup: ${this.events.length} events retained`);
  }

  /**
   * Export analytics data for backup or analysis
   */
  exportData(): {
    events: ModelUsageEvent[];
    exportedAt: Date;
    eventCount: number;
  } {
    return {
      events: [...this.events],
      exportedAt: new Date(),
      eventCount: this.events.length
    };
  }

  // Private helper methods

  private calculateCostTrend(events: ModelUsageEvent[]): 'increasing' | 'decreasing' | 'stable' {
    if (events.length < 4) return 'stable';
    
    const sorted = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, e) => sum + e.cost, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, e) => sum + e.cost, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  private calculatePerformanceTrend(events: ModelUsageEvent[]): 'improving' | 'declining' | 'stable' {
    if (events.length < 4) return 'stable';
    
    const sorted = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const firstAvgTime = firstHalf.reduce((sum, e) => sum + e.responseTime, 0) / firstHalf.length;
    const secondAvgTime = secondHalf.reduce((sum, e) => sum + e.responseTime, 0) / secondHalf.length;
    
    const change = ((secondAvgTime - firstAvgTime) / firstAvgTime) * 100;
    
    if (change > 20) return 'declining'; // Slower = declining performance
    if (change < -20) return 'improving'; // Faster = improving performance
    return 'stable';
  }

  private getDailyCostBreakdown(events: ModelUsageEvent[]): Array<{ date: string; cost: number }> {
    const costByDate = new Map<string, number>();
    
    events.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0];
      costByDate.set(date, (costByDate.get(date) || 0) + event.cost);
    });
    
    return Array.from(costByDate.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private generateCostOptimizations(events: ModelUsageEvent[]): Array<{
    type: 'model_switch' | 'usage_reduction' | 'plan_change';
    description: string;
    potentialSavings: number;
    confidence: number;
  }> {
    const optimizations: Array<{
      type: 'model_switch' | 'usage_reduction' | 'plan_change';
      description: string;
      potentialSavings: number;
      confidence: number;
    }> = [];

    // Find expensive models with possible cheaper alternatives
    const costByModel = new Map<string, number>();
    events.forEach(event => {
      costByModel.set(event.modelId, (costByModel.get(event.modelId) || 0) + event.cost);
    });

    const expensiveModels = Array.from(costByModel.entries())
      .filter(([, cost]) => cost > 1) // Models costing more than $1
      .sort((a, b) => b[1] - a[1]);

    expensiveModels.forEach(([modelId, cost]) => {
      if (modelId.includes('gpt-4') && cost > 5) {
        optimizations.push({
          type: 'model_switch',
          description: `Consider using GPT-4o mini instead of ${modelId} for simple tasks`,
          potentialSavings: cost * 0.3, // Estimated 30% savings
          confidence: 0.8
        });
      }
    });

    return optimizations;
  }

  private generateModelRecommendations(metrics: ModelPerformanceMetrics[]): Array<{
    modelId: string;
    reason: string;
    score: number;
  }> {
    return metrics
      .filter(m => m.totalRequests >= 3) // Minimum usage for recommendations
      .map(m => {
        let score = 0;
        const reasons: string[] = [];

        // High success rate
        if (m.successRate > 95) {
          score += 30;
          reasons.push('high reliability');
        }

        // Good performance
        if (m.averageResponseTime < 2000) {
          score += 25;
          reasons.push('fast response time');
        }

        // Cost effective
        if (m.averageCost < 0.01) {
          score += 20;
          reasons.push('cost effective');
        }

        // Improving trend
        if (m.performanceTrend === 'improving') {
          score += 15;
          reasons.push('improving performance');
        }

        // Stable costs
        if (m.costTrend === 'stable') {
          score += 10;
          reasons.push('stable pricing');
        }

        return {
          modelId: m.modelId,
          reason: reasons.join(', '),
          score
        };
      })
      .filter(r => r.score > 50) // Only recommend models with good scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
}

// Singleton instance
export const modelAnalytics = new ModelAnalytics();