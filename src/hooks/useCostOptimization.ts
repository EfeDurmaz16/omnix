'use client';

import { useState, useCallback, useEffect } from 'react';
import { OptimizationResult, ModelCostComparison } from '@/lib/optimization/CostOptimizer';
import { CostAnalytics, OptimizationOpportunity, CostAlert } from '@/lib/analytics/CostAnalytics';

interface UseCostOptimizationOptions {
  autoOptimize?: boolean;
  trackUsage?: boolean;
  alertThreshold?: number;
}

interface CostOptimizationState {
  // Optimization data
  currentOptimization: OptimizationResult | null;
  modelComparisons: ModelCostComparison[];
  
  // Analytics data
  analytics: CostAnalytics | null;
  opportunities: OptimizationOpportunity[];
  alerts: CostAlert[];
  
  // UI state
  loading: boolean;
  error: string | null;
  showOptimizationSuggestion: boolean;
}

export function useCostOptimization(options: UseCostOptimizationOptions = {}) {
  const [state, setState] = useState<CostOptimizationState>({
    currentOptimization: null,
    modelComparisons: [],
    analytics: null,
    opportunities: [],
    alerts: [],
    loading: false,
    error: null,
    showOptimizationSuggestion: false
  });

  // Optimize model selection for a given task
  const optimizeForTask = useCallback(async (
    task: string,
    currentModel?: string,
    userPlan: string = 'free',
    qualityPreference: 'fast' | 'balanced' | 'high' = 'balanced'
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize',
          task,
          currentModel,
          userPlan,
          qualityPreference,
          requiredCapabilities: ['text']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get optimization');
      }

      const optimization: OptimizationResult = await response.json();
      
      setState(prev => ({
        ...prev,
        currentOptimization: optimization,
        loading: false,
        showOptimizationSuggestion: optimization.potentialSavings > 0.01 // Show if savings > 1 cent
      }));

      return optimization;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      return null;
    }
  }, []);

  // Compare multiple models for cost analysis
  const compareModels = useCallback(async (
    modelIds: string[],
    task: string,
    userPlan: string = 'free'
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compare',
          modelIds,
          task,
          userPlan
        })
      });

      if (!response.ok) {
        throw new Error('Failed to compare models');
      }

      const comparisons: ModelCostComparison[] = await response.json();
      
      setState(prev => ({
        ...prev,
        modelComparisons: comparisons,
        loading: false
      }));

      return comparisons;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      return [];
    }
  }, []);

  // Track usage for cost analytics
  const trackUsage = useCallback(async (usage: {
    modelId: string;
    modelName: string;
    cost: number;
    inputTokens: number;
    outputTokens: number;
    taskType: string;
    quality?: number;
    responseTime?: number;
  }) => {
    if (!options.trackUsage) return;

    try {
      await fetch('/api/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track-usage',
          ...usage
        })
      });
    } catch (error) {
      console.warn('Failed to track usage:', error);
    }
  }, [options.trackUsage]);

  // Load analytics data
  const loadAnalytics = useCallback(async (timeframe: 'day' | 'week' | 'month' | 'all' = 'month') => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [analyticsRes, opportunitiesRes, alertsRes] = await Promise.all([
        fetch(`/api/optimization?type=analytics&timeframe=${timeframe}`),
        fetch('/api/optimization?type=opportunities'),
        fetch('/api/optimization?type=alerts')
      ]);

      if (!analyticsRes.ok || !opportunitiesRes.ok || !alertsRes.ok) {
        throw new Error('Failed to load analytics data');
      }

      const [analytics, opportunities, alerts] = await Promise.all([
        analyticsRes.json(),
        opportunitiesRes.json(),
        alertsRes.json()
      ]);

      setState(prev => ({
        ...prev,
        analytics,
        opportunities,
        alerts,
        loading: false
      }));

      return { analytics, opportunities, alerts };
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      return null;
    }
  }, []);

  // Get budget-friendly alternatives
  const getBudgetAlternatives = useCallback(async (
    modelId: string,
    maxCost: number,
    userPlan: string = 'free'
  ) => {
    try {
      const response = await fetch('/api/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'alternatives',
          modelId,
          maxCost,
          userPlan
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get alternatives');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to get budget alternatives:', error);
      return [];
    }
  }, []);

  // Dismiss optimization suggestion
  const dismissOptimizationSuggestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      showOptimizationSuggestion: false
    }));
  }, []);

  // Accept optimization suggestion
  const acceptOptimizationSuggestion = useCallback(() => {
    dismissOptimizationSuggestion();
    return state.currentOptimization?.recommendedModel.id;
  }, [state.currentOptimization, dismissOptimizationSuggestion]);

  // Load initial data
  useEffect(() => {
    if (options.autoOptimize) {
      loadAnalytics();
    }
  }, [options.autoOptimize, loadAnalytics]);

  // Helper functions for common use cases
  const getCostSavings = useCallback(() => {
    return state.currentOptimization?.potentialSavings || 0;
  }, [state.currentOptimization]);

  const getBudgetStatus = useCallback(() => {
    return state.analytics?.budgetStatus;
  }, [state.analytics]);

  const hasHighSeverityAlerts = useCallback(() => {
    return state.alerts.some(alert => 
      alert.severity === 'high' || alert.severity === 'critical'
    );
  }, [state.alerts]);

  const getTopModelRecommendation = useCallback(() => {
    return state.currentOptimization?.recommendedModel;
  }, [state.currentOptimization]);

  const getCheapestAlternative = useCallback(() => {
    const alternatives = state.currentOptimization?.alternatives || [];
    return alternatives.reduce((cheapest, current) => 
      current.estimatedCost < cheapest.estimatedCost ? current : cheapest,
      alternatives[0]
    );
  }, [state.currentOptimization]);

  return {
    // State
    ...state,
    
    // Actions
    optimizeForTask,
    compareModels,
    trackUsage,
    loadAnalytics,
    getBudgetAlternatives,
    dismissOptimizationSuggestion,
    acceptOptimizationSuggestion,
    
    // Helpers
    getCostSavings,
    getBudgetStatus,
    hasHighSeverityAlerts,
    getTopModelRecommendation,
    getCheapestAlternative
  };
}

// Hook for simple model optimization in chat interfaces
export function useModelOptimization(currentModel?: string, userPlan: string = 'free') {
  const [lastOptimization, setLastOptimization] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeModel = useCallback(async (prompt: string) => {
    if (isOptimizing) return lastOptimization;

    setIsOptimizing(true);
    
    try {
      const response = await fetch('/api/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize',
          task: prompt,
          currentModel,
          userPlan,
          qualityPreference: 'balanced'
        })
      });

      if (response.ok) {
        const optimization = await response.json();
        setLastOptimization(optimization);
        return optimization;
      }
    } catch (error) {
      console.warn('Model optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }

    return lastOptimization;
  }, [currentModel, userPlan, isOptimizing, lastOptimization]);

  const shouldSuggestOptimization = useCallback(() => {
    return lastOptimization && 
           lastOptimization.potentialSavings > 0.01 &&
           lastOptimization.recommendedModel.id !== currentModel;
  }, [lastOptimization, currentModel]);

  return {
    optimizeModel,
    lastOptimization,
    isOptimizing,
    shouldSuggestOptimization: shouldSuggestOptimization()
  };
}