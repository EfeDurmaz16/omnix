'use client';

import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  Zap, 
  Brain, 
  DollarSign, 
  Clock, 
  Target,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { autoRouter, RoutingResult } from '@/lib/routing/AutoRouter';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';

interface AutoRoutingControlsProps {
  onSettingsChange?: (settings: AutoRoutingSettings) => void;
  onRouteRecommendation?: (result: RoutingResult) => void;
  currentQuery?: string;
  className?: string;
}

export interface AutoRoutingSettings {
  enabled: boolean;
  preference: 'cost' | 'balanced' | 'quality' | 'speed';
  autoApply: boolean;
  showRecommendations: boolean;
  redirectToSpecializedPages: boolean;
}

export default function AutoRoutingControls({ 
  onSettingsChange, 
  onRouteRecommendation,
  currentQuery,
  className = "" 
}: AutoRoutingControlsProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AutoRoutingSettings>({
    enabled: true,
    preference: 'balanced',
    autoApply: false,
    showRecommendations: true,
    redirectToSpecializedPages: true
  });
  
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('aspendos-auto-routing-settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('aspendos-auto-routing-settings', JSON.stringify(settings));
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  // Analyze current query when it changes
  useEffect(() => {
    if (currentQuery && settings.enabled && settings.showRecommendations) {
      analyzeQuery(currentQuery);
    }
  }, [currentQuery, settings.enabled, settings.showRecommendations]);

  const analyzeQuery = async (query: string) => {
    if (!query.trim() || !user) return;

    setIsAnalyzing(true);
    try {
      const result = await autoRouter.routeQuery({
        query,
        userPlan: user.plan || 'free',
        userPreference: settings.preference,
        hasAutoRouting: settings.enabled
      });

      setRoutingResult(result);
      onRouteRecommendation?.(result);
    } catch (error) {
      console.error('Failed to analyze query for routing:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateSettings = (key: keyof AutoRoutingSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyRecommendation = () => {
    if (routingResult && onRouteRecommendation) {
      onRouteRecommendation(routingResult);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Toggle */}
      <Card className="cultural-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 cultural-text-primary" />
              <CardTitle className="text-lg cultural-text-primary">Auto-Routing</CardTitle>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSettings('enabled', checked)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Automatically route your queries to the most suitable AI model based on content analysis.
          </p>
          
          {settings.enabled && (
            <div className="space-y-4">
              {/* Preference Selection */}
              <div>
                <label className="text-sm font-medium cultural-text-primary mb-2 block">
                  Optimization Preference
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: 'cost', label: 'Cost', icon: DollarSign, desc: 'Cheapest models' },
                    { id: 'speed', label: 'Speed', icon: Zap, desc: 'Fastest responses' },
                    { id: 'quality', label: 'Quality', icon: Target, desc: 'Best outputs' },
                    { id: 'balanced', label: 'Balanced', icon: Settings, desc: 'Optimal mix' }
                  ].map((pref) => (
                    <Button
                      key={pref.id}
                      variant={settings.preference === pref.id ? 'default' : 'outline'}
                      size="sm"
                      className={`h-auto p-3 flex flex-col items-center space-y-1 ${
                        settings.preference === pref.id ? 'cultural-primary' : 'cultural-border'
                      }`}
                      onClick={() => updateSettings('preference', pref.id)}
                    >
                      <pref.icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{pref.label}</span>
                      <span className="text-xs text-muted-foreground">{pref.desc}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Additional Settings */}
              <div className="space-y-3 pt-2 border-t cultural-border">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium cultural-text-primary">Auto-Apply</label>
                    <p className="text-xs text-muted-foreground">Automatically switch models without asking</p>
                  </div>
                  <Switch
                    checked={settings.autoApply}
                    onCheckedChange={(checked) => updateSettings('autoApply', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium cultural-text-primary">Show Recommendations</label>
                    <p className="text-xs text-muted-foreground">Display routing suggestions</p>
                  </div>
                  <Switch
                    checked={settings.showRecommendations}
                    onCheckedChange={(checked) => updateSettings('showRecommendations', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium cultural-text-primary">Page Redirects</label>
                    <p className="text-xs text-muted-foreground">Redirect to image/video pages when appropriate</p>
                  </div>
                  <Switch
                    checked={settings.redirectToSpecializedPages}
                    onCheckedChange={(checked) => updateSettings('redirectToSpecializedPages', checked)}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Routing Recommendation */}
      {settings.enabled && settings.showRecommendations && routingResult && (
        <Card className="cultural-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium cultural-text-primary">
                Routing Recommendation
              </CardTitle>
              <Badge 
                variant="outline" 
                className={`${
                  routingResult.confidence > 0.8 ? 'border-green-500 text-green-600' :
                  routingResult.confidence > 0.6 ? 'border-yellow-500 text-yellow-600' :
                  'border-red-500 text-red-600'
                }`}
              >
                {Math.round(routingResult.confidence * 100)}% confident
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isAnalyzing ? (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Analyzing query...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium cultural-text-primary">
                      {routingResult.recommendedModel.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {routingResult.routingReason}
                    </p>
                  </div>
                  {routingResult.shouldRedirect ? (
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>

                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-3 w-3" />
                    <span>${routingResult.estimatedCost.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>~{routingResult.estimatedSpeed.toFixed(1)}s</span>
                  </div>
                </div>

                {routingResult.shouldRedirect && (
                  <div className="p-2 rounded cultural-accent cultural-border">
                    <p className="text-sm cultural-text-primary">
                      <Info className="inline h-4 w-4 mr-1" />
                      This query should be handled on the {routingResult.redirectPage} page for best results.
                    </p>
                  </div>
                )}

                {!settings.autoApply && !routingResult.shouldRedirect && (
                  <Button
                    size="sm"
                    onClick={applyRecommendation}
                    className="w-full cultural-primary"
                  >
                    Apply Recommendation
                  </Button>
                )}

                {routingResult.alternativeModels.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer cultural-text-primary font-medium">
                      Alternative Models ({routingResult.alternativeModels.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                      {routingResult.alternativeModels.map((model, index) => (
                        <div key={index} className="text-muted-foreground">
                          • {model.name}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}