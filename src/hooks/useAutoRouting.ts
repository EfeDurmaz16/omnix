'use client';

import { useState, useCallback, useEffect } from 'react';
import { RoutingResult } from '@/lib/routing/AutoRouter';
import { AutoRoutingSettings } from '@/components/routing/AutoRoutingControls';

interface UseAutoRoutingOptions {
  enabled?: boolean;
  onModelChange?: (modelId: string) => void;
  onRedirect?: (page: 'image' | 'video' | 'chat') => void;
  userPlan?: string;
}

interface AutoRoutingState {
  lastResult: RoutingResult | null;
  isAnalyzing: boolean;
  settings: AutoRoutingSettings;
  error: string | null;
  shouldShowSuggestion: boolean;
}

export function useAutoRouting(options: UseAutoRoutingOptions = {}) {
  const [state, setState] = useState<AutoRoutingState>({
    lastResult: null,
    isAnalyzing: false,
    settings: {
      enabled: options.enabled ?? true,
      preference: 'balanced',
      autoApply: false,
      showRecommendations: true,
      redirectToSpecializedPages: true
    },
    error: null,
    shouldShowSuggestion: false
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('aspendos-auto-routing-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setState(prev => ({ ...prev, settings: parsed }));
      } catch (error) {
        console.warn('Failed to load auto-routing settings:', error);
      }
    }
  }, []);

  // Route a query to the optimal model
  const routeQuery = useCallback(async (
    query: string,
    currentModel?: string
  ): Promise<RoutingResult | null> => {
    if (!state.settings.enabled || !query.trim()) {
      return null;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const response = await fetch('/api/auto-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'route',
          query,
          userPlan: options.userPlan || 'free',
          userPreference: state.settings.preference,
          hasAutoRouting: state.settings.enabled,
          currentModel
        })
      });

      if (!response.ok) {
        throw new Error('Failed to route query');
      }

      const result: RoutingResult = await response.json();
      
      setState(prev => ({
        ...prev,
        lastResult: result,
        isAnalyzing: false,
        shouldShowSuggestion: result.confidence > 0.7 && 
          (result.recommendedModel.id !== currentModel || result.shouldRedirect)
      }));

      // Handle auto-apply
      if (state.settings.autoApply && result.confidence > 0.8) {
        if (result.shouldRedirect && state.settings.redirectToSpecializedPages) {
          options.onRedirect?.(result.redirectPage!);
        } else if (options.onModelChange) {
          options.onModelChange(result.recommendedModel.id);
        }
      }

      return result;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error.message
      }));
      return null;
    }
  }, [state.settings, options]);

  // Analyze query without routing (for preview)
  const analyzeQuery = useCallback(async (query: string) => {
    if (!query.trim()) return null;

    try {
      const response = await fetch('/api/auto-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          query
        })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to analyze query:', error);
    }

    return null;
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AutoRoutingSettings>) => {
    setState(prev => {
      const updatedSettings = { ...prev.settings, ...newSettings };
      
      // Save to localStorage
      localStorage.setItem('aspendos-auto-routing-settings', JSON.stringify(updatedSettings));
      
      return {
        ...prev,
        settings: updatedSettings
      };
    });
  }, []);

  // Apply the current routing recommendation
  const applyRecommendation = useCallback(() => {
    if (!state.lastResult) return false;

    if (state.lastResult.shouldRedirect && state.settings.redirectToSpecializedPages) {
      options.onRedirect?.(state.lastResult.redirectPage!);
    } else if (options.onModelChange) {
      options.onModelChange(state.lastResult.recommendedModel.id);
    }

    setState(prev => ({ ...prev, shouldShowSuggestion: false }));
    return true;
  }, [state.lastResult, state.settings.redirectToSpecializedPages, options]);

  // Dismiss the current suggestion
  const dismissSuggestion = useCallback(() => {
    setState(prev => ({ ...prev, shouldShowSuggestion: false }));
  }, []);

  // Get routing statistics
  const getRoutingStats = useCallback(async () => {
    try {
      const response = await fetch('/api/auto-routing?type=stats');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to get routing stats:', error);
    }
    return null;
  }, []);

  // Get available models for current plan
  const getAvailableModels = useCallback(async () => {
    try {
      const response = await fetch(`/api/auto-routing?type=models&plan=${options.userPlan || 'free'}`);
      if (response.ok) {
        const data = await response.json();
        return data.models;
      }
    } catch (error) {
      console.warn('Failed to get available models:', error);
    }
    return [];
  }, [options.userPlan]);

  // Helper functions
  const shouldSuggestModel = useCallback((currentModel?: string) => {
    return state.shouldShowSuggestion && 
           state.lastResult &&
           state.lastResult.recommendedModel.id !== currentModel;
  }, [state.shouldShowSuggestion, state.lastResult]);

  const getEstimatedSavings = useCallback((currentModelCost?: number) => {
    if (!state.lastResult || !currentModelCost) return 0;
    return Math.max(0, currentModelCost - state.lastResult.estimatedCost);
  }, [state.lastResult]);

  const isRedirectRecommended = useCallback(() => {
    return state.lastResult?.shouldRedirect && state.settings.redirectToSpecializedPages;
  }, [state.lastResult, state.settings.redirectToSpecializedPages]);

  return {
    // State
    ...state,
    
    // Actions
    routeQuery,
    analyzeQuery,
    updateSettings,
    applyRecommendation,
    dismissSuggestion,
    getRoutingStats,
    getAvailableModels,
    
    // Helpers
    shouldSuggestModel,
    getEstimatedSavings,
    isRedirectRecommended
  };
}

// Hook for simple auto-routing integration
export function useSimpleAutoRouting(currentModel?: string, userPlan?: string) {
  const [lastRecommendation, setLastRecommendation] = useState<RoutingResult | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  const checkForBetterModel = useCallback(async (query: string) => {
    if (!isEnabled || !query.trim()) return null;

    try {
      const response = await fetch('/api/auto-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'route',
          query,
          userPlan: userPlan || 'free',
          userPreference: 'balanced',
          hasAutoRouting: true,
          currentModel
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLastRecommendation(result);
        return result;
      }
    } catch (error) {
      console.warn('Auto-routing check failed:', error);
    }

    return null;
  }, [currentModel, userPlan, isEnabled]);

  const shouldSwitchModel = useCallback(() => {
    return lastRecommendation && 
           lastRecommendation.confidence > 0.7 &&
           lastRecommendation.recommendedModel.id !== currentModel &&
           !lastRecommendation.shouldRedirect;
  }, [lastRecommendation, currentModel]);

  const shouldRedirect = useCallback(() => {
    return lastRecommendation?.shouldRedirect;
  }, [lastRecommendation]);

  return {
    checkForBetterModel,
    lastRecommendation,
    shouldSwitchModel: shouldSwitchModel(),
    shouldRedirect: shouldRedirect(),
    isEnabled,
    setIsEnabled
  };
}