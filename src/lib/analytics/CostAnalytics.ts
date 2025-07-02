/**
 * Cost Analytics System
 * Track, analyze, and optimize AI model usage costs
 */

import { creditManager } from '../credits/CreditManager';

export interface CostAnalytics {
  totalSpent: number;
  avgCostPerRequest: number;
  topModels: ModelUsageStat[];
  costTrends: CostTrend[];
  potentialSavings: number;
  budgetStatus: BudgetStatus;
}

export interface ModelUsageStat {
  modelId: string;
  modelName: string;
  requestCount: number;
  totalCost: number;
  avgCost: number;
  costPercentage: number;
  efficiency: number; // cost per quality point
}

export interface CostTrend {
  date: string;
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
  topModel: string;
}

export interface BudgetStatus {
  monthlyBudget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  projectedMonthlySpend: number;
  status: 'under' | 'on-track' | 'over' | 'critical';
}

export interface CostAlert {
  type: 'budget' | 'spike' | 'inefficiency' | 'opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  recommendation?: string;
  timestamp: Date;
}

export interface OptimizationOpportunity {
  type: 'model-switch' | 'batch-processing' | 'caching' | 'prompt-optimization';
  currentModel: string;
  suggestedModel?: string;
  estimatedSavings: number;
  effort: 'low' | 'medium' | 'high';
  description: string;
}

export class CostAnalyticsManager {
  private static instance: CostAnalyticsManager;
  private userId: string | null = null;

  static getInstance(): CostAnalyticsManager {
    if (!CostAnalyticsManager.instance) {
      CostAnalyticsManager.instance = new CostAnalyticsManager();
    }
    return CostAnalyticsManager.instance;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Track a model usage event
   */
  async trackUsage(event: {
    modelId: string;
    modelName: string;
    cost: number;
    inputTokens: number;
    outputTokens: number;
    taskType: string;
    quality?: number; // 1-10 user rating
    responseTime?: number; // milliseconds
  }): Promise<void> {
    if (!this.userId) return;

    const usage = {
      ...event,
      userId: this.userId,
      timestamp: new Date(),
      id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Store in localStorage (would be database in production)
    const key = `aspendos_usage_${this.userId}`;
    const existingUsage = this.getStoredUsage();
    existingUsage.push(usage);

    // Keep only last 1000 entries to prevent storage bloat
    if (existingUsage.length > 1000) {
      existingUsage.splice(0, existingUsage.length - 1000);
    }

    localStorage.setItem(key, JSON.stringify(existingUsage));

    // Check for alerts
    this.checkForAlerts(usage);
  }

  /**
   * Get comprehensive cost analytics
   */
  async getCostAnalytics(timeframe: 'day' | 'week' | 'month' | 'all' = 'month'): Promise<CostAnalytics> {
    const usage = this.getStoredUsage();
    const filteredUsage = this.filterByTimeframe(usage, timeframe);

    const totalSpent = filteredUsage.reduce((sum, u) => sum + u.cost, 0);
    const avgCostPerRequest = filteredUsage.length > 0 ? totalSpent / filteredUsage.length : 0;

    const modelStats = this.calculateModelStats(filteredUsage);
    const costTrends = this.calculateCostTrends(filteredUsage);
    const potentialSavings = await this.calculatePotentialSavings(filteredUsage);
    const budgetStatus = await this.getBudgetStatus();

    return {
      totalSpent,
      avgCostPerRequest,
      topModels: modelStats,
      costTrends,
      potentialSavings,
      budgetStatus
    };
  }

  /**
   * Get cost optimization opportunities
   */
  async getOptimizationOpportunities(): Promise<OptimizationOpportunity[]> {
    const usage = this.getStoredUsage();
    const opportunities: OptimizationOpportunity[] = [];

    // Analyze model usage patterns
    const modelStats = this.calculateModelStats(usage);
    
    // Find expensive models with low efficiency
    for (const stat of modelStats) {
      if (stat.avgCost > 0.05 && stat.efficiency < 5 && stat.requestCount > 10) {
        opportunities.push({
          type: 'model-switch',
          currentModel: stat.modelId,
          suggestedModel: await this.findCheaperAlternative(stat.modelId),
          estimatedSavings: stat.totalCost * 0.3, // Conservative 30% savings
          effort: 'low',
          description: `Switch from ${stat.modelName} to a more cost-effective alternative for routine tasks`
        });
      }
    }

    // Find opportunities for batch processing
    const shortTasks = usage.filter(u => u.inputTokens < 100 && u.outputTokens < 200);
    if (shortTasks.length > 20) {
      opportunities.push({
        type: 'batch-processing',
        currentModel: 'multiple',
        estimatedSavings: shortTasks.reduce((sum, t) => sum + t.cost, 0) * 0.2,
        effort: 'medium',
        description: 'Batch small requests together to reduce per-request overhead'
      });
    }

    // Find caching opportunities
    const duplicatePrompts = this.findDuplicatePatterns(usage);
    if (duplicatePrompts.length > 0) {
      const cachingSavings = duplicatePrompts.reduce((sum, p) => sum + p.totalCost * 0.8, 0);
      opportunities.push({
        type: 'caching',
        currentModel: 'multiple',
        estimatedSavings: cachingSavings,
        effort: 'medium',
        description: 'Implement response caching for repeated queries'
      });
    }

    return opportunities.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }

  /**
   * Get cost alerts and warnings
   */
  async getCostAlerts(): Promise<CostAlert[]> {
    const alerts: CostAlert[] = JSON.parse(
      localStorage.getItem(`aspendos_alerts_${this.userId}`) || '[]'
    );

    // Return only recent alerts (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return alerts.filter(alert => new Date(alert.timestamp) > weekAgo);
  }

  /**
   * Get detailed model comparison
   */
  async getModelComparison(modelIds: string[]): Promise<{
    models: ModelUsageStat[];
    recommendation: string;
  }> {
    const usage = this.getStoredUsage();
    const modelUsage = usage.filter(u => modelIds.includes(u.modelId));
    const stats = this.calculateModelStats(modelUsage);

    // Find the most cost-effective model
    const bestModel = stats.reduce((best, current) => 
      current.efficiency > best.efficiency ? current : best
    );

    return {
      models: stats,
      recommendation: `${bestModel.modelName} offers the best cost-efficiency ratio (${bestModel.efficiency.toFixed(2)} quality points per dollar)`
    };
  }

  private getStoredUsage(): any[] {
    if (!this.userId) return [];
    
    const key = `aspendos_usage_${this.userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  private filterByTimeframe(usage: any[], timeframe: string): any[] {
    const now = new Date();
    let cutoff: Date;

    switch (timeframe) {
      case 'day':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return usage;
    }

    return usage.filter(u => new Date(u.timestamp) >= cutoff);
  }

  private calculateModelStats(usage: any[]): ModelUsageStat[] {
    const modelGroups = usage.reduce((groups, u) => {
      if (!groups[u.modelId]) {
        groups[u.modelId] = [];
      }
      groups[u.modelId].push(u);
      return groups;
    }, {} as { [key: string]: any[] });

    const totalCost = usage.reduce((sum, u) => sum + u.cost, 0);

    return Object.entries(modelGroups).map(([modelId, usageList]) => {
      const totalModelCost = usageList.reduce((sum, u) => sum + u.cost, 0);
      const requestCount = usageList.length;
      const avgCost = totalModelCost / requestCount;
      const avgQuality = usageList.filter(u => u.quality).reduce((sum, u) => sum + u.quality, 0) / 
                        usageList.filter(u => u.quality).length || 7; // Default quality score

      return {
        modelId,
        modelName: usageList[0].modelName,
        requestCount,
        totalCost: totalModelCost,
        avgCost,
        costPercentage: (totalModelCost / totalCost) * 100,
        efficiency: avgQuality / (avgCost * 1000) // Quality per dollar (scaled)
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
  }

  private calculateCostTrends(usage: any[]): CostTrend[] {
    const dailyGroups = usage.reduce((groups, u) => {
      const date = new Date(u.timestamp).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(u);
      return groups;
    }, {} as { [key: string]: any[] });

    return Object.entries(dailyGroups).map(([date, dayUsage]) => {
      const totalCost = dayUsage.reduce((sum, u) => sum + u.cost, 0);
      const topModel = this.calculateModelStats(dayUsage)[0];

      return {
        date,
        totalCost,
        requestCount: dayUsage.length,
        avgCostPerRequest: totalCost / dayUsage.length,
        topModel: topModel?.modelName || 'N/A'
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async calculatePotentialSavings(usage: any[]): Promise<number> {
    let savings = 0;

    // Calculate savings from switching expensive models
    const expensiveUsage = usage.filter(u => u.avgCost > 0.05);
    savings += expensiveUsage.reduce((sum, u) => sum + u.cost * 0.3, 0);

    // Calculate savings from caching
    const duplicatePatterns = this.findDuplicatePatterns(usage);
    savings += duplicatePatterns.reduce((sum, p) => sum + p.totalCost * 0.8, 0);

    return savings;
  }

  private async getBudgetStatus(): Promise<BudgetStatus> {
    const monthlyBudget = parseFloat(localStorage.getItem(`aspendos_budget_${this.userId}`) || '100');
    const usage = this.getStoredUsage();
    const monthUsage = this.filterByTimeframe(usage, 'month');
    const spent = monthUsage.reduce((sum, u) => sum + u.cost, 0);

    const remaining = monthlyBudget - spent;
    const percentUsed = (spent / monthlyBudget) * 100;

    // Project monthly spend based on daily average
    const dailyAvg = spent / 30;
    const daysInMonth = new Date().getDate();
    const projectedMonthlySpend = dailyAvg * 30;

    let status: BudgetStatus['status'] = 'under';
    if (percentUsed > 100) status = 'critical';
    else if (percentUsed > 90) status = 'over';
    else if (percentUsed > 75) status = 'on-track';

    return {
      monthlyBudget,
      spent,
      remaining,
      percentUsed,
      projectedMonthlySpend,
      status
    };
  }

  private findDuplicatePatterns(usage: any[]): any[] {
    // Simplified duplicate detection - would be more sophisticated in production
    const patterns = usage.reduce((groups, u) => {
      const pattern = u.taskType;
      if (!groups[pattern]) {
        groups[pattern] = [];
      }
      groups[pattern].push(u);
      return groups;
    }, {} as { [key: string]: any[] });

    return Object.entries(patterns)
      .filter(([, usageList]) => usageList.length > 5)
      .map(([pattern, usageList]) => ({
        pattern,
        count: usageList.length,
        totalCost: usageList.reduce((sum, u) => sum + u.cost, 0)
      }));
  }

  private async findCheaperAlternative(modelId: string): Promise<string> {
    // Simplified alternative finding - would use actual model comparison in production
    const alternatives: { [key: string]: string } = {
      'gpt-4': 'gpt-3.5-turbo',
      'claude-3-opus': 'claude-3-sonnet',
      'gemini-pro': 'gemini-flash'
    };

    return alternatives[modelId] || 'gpt-3.5-turbo';
  }

  private async checkForAlerts(usage: any): Promise<void> {
    const alerts: CostAlert[] = [];

    // Check for cost spikes
    if (usage.cost > 0.1) {
      alerts.push({
        type: 'spike',
        severity: 'medium',
        title: 'High Cost Request',
        message: `Request cost $${usage.cost.toFixed(4)} is above normal threshold`,
        recommendation: 'Consider using a more cost-effective model for similar tasks',
        timestamp: new Date()
      });
    }

    // Check budget status
    const budgetStatus = await this.getBudgetStatus();
    if (budgetStatus.percentUsed > 90 && budgetStatus.status !== 'under') {
      alerts.push({
        type: 'budget',
        severity: budgetStatus.percentUsed > 100 ? 'critical' : 'high',
        title: 'Budget Alert',
        message: `${budgetStatus.percentUsed.toFixed(1)}% of monthly budget used`,
        recommendation: 'Consider optimizing model usage or increasing budget',
        timestamp: new Date()
      });
    }

    // Store alerts
    if (alerts.length > 0) {
      const existingAlerts = await this.getCostAlerts();
      const allAlerts = [...existingAlerts, ...alerts];
      localStorage.setItem(`aspendos_alerts_${this.userId}`, JSON.stringify(allAlerts));
    }
  }
}

// Export singleton instance
export const costAnalytics = CostAnalyticsManager.getInstance();