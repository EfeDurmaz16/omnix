'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  Lightbulb, 
  AlertTriangle,
  BarChart3,
  Zap,
  Target,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { costOptimizer, OptimizationResult, ModelCostComparison } from '@/lib/optimization/CostOptimizer';
import { costAnalytics, CostAnalytics, OptimizationOpportunity, CostAlert } from '@/lib/analytics/CostAnalytics';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';

interface CostOptimizationPanelProps {
  currentTask?: string;
  currentModel?: string;
  onModelRecommendation?: (modelId: string) => void;
}

export default function CostOptimizationPanel({ 
  currentTask, 
  currentModel, 
  onModelRecommendation 
}: CostOptimizationPanelProps) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<CostAnalytics | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [opportunities, setOpportunities] = useState<OptimizationOpportunity[]>([]);
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'optimization' | 'opportunities' | 'alerts'>('overview');

  useEffect(() => {
    if (user?.id) {
      costAnalytics.setUserId(user.id);
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load analytics data
      const analyticsData = await costAnalytics.getCostAnalytics('month');
      setAnalytics(analyticsData);
      
      // Load optimization opportunities
      const opportunitiesData = await costAnalytics.getOptimizationOpportunities();
      setOpportunities(opportunitiesData);
      
      // Load alerts
      const alertsData = await costAnalytics.getCostAlerts();
      setAlerts(alertsData);
      
      // Load optimization for current task if available
      if (currentTask && user) {
        const optimizationResult = await costOptimizer.optimizeModelSelection({
          task: currentTask,
          requiredCapabilities: ['text'],
          qualityPreference: 'balanced',
          currentModel,
          userPlan: user.plan || 'free'
        });
        setOptimization(optimizationResult);
      }
      
    } catch (error) {
      console.error('Failed to load cost optimization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyOptimization = (modelId: string) => {
    if (onModelRecommendation) {
      onModelRecommendation(modelId);
    }
  };

  if (loading) {
    return (
      <Card className="cultural-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 cultural-text-primary">Loading optimization data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="cultural-card">
        <CardHeader>
          <CardTitle className="flex items-center cultural-text-primary">
            <Target className="mr-2 h-5 w-5" />
            Cost Optimization Dashboard
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 cultural-card rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'optimization', label: 'Smart Suggestions', icon: Lightbulb },
          { id: 'opportunities', label: 'Opportunities', icon: TrendingDown },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            className={`flex-1 ${activeTab === tab.id ? 'cultural-primary' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.label}
            {tab.id === 'alerts' && alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {alerts.length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Budget Status */}
          <Card className="cultural-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium cultural-text-primary">Monthly Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold cultural-text-primary">
                ${analytics.budgetStatus.spent.toFixed(2)} / ${analytics.budgetStatus.monthlyBudget.toFixed(2)}
              </div>
              <Progress 
                value={analytics.budgetStatus.percentUsed} 
                className="mt-2"
                indicatorClassName={
                  analytics.budgetStatus.status === 'critical' ? 'bg-red-500' :
                  analytics.budgetStatus.status === 'over' ? 'bg-orange-500' :
                  'bg-green-500'
                }
              />
              <p className="text-xs text-muted-foreground mt-2">
                {analytics.budgetStatus.percentUsed.toFixed(1)}% used • 
                ${analytics.budgetStatus.remaining.toFixed(2)} remaining
              </p>
            </CardContent>
          </Card>

          {/* Average Cost */}
          <Card className="cultural-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium cultural-text-primary">Avg Cost/Request</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold cultural-text-primary">
                ${analytics.avgCostPerRequest.toFixed(4)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {analytics.topModels.length > 0 && (
                  <>Most used: {analytics.topModels[0].modelName}</>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Potential Savings */}
          <Card className="cultural-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium cultural-text-primary">Potential Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${analytics.potentialSavings.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Through optimization
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'optimization' && optimization && (
        <div className="space-y-4">
          {/* Current Optimization */}
          <Card className="cultural-card">
            <CardHeader>
              <CardTitle className="cultural-text-primary">Recommended Model</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg cultural-text-primary">
                    {optimization.recommendedModel.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Estimated cost: ${optimization.estimatedCost.toFixed(4)}
                  </p>
                </div>
                <Button 
                  onClick={() => handleApplyOptimization(optimization.recommendedModel.id)}
                  className="cultural-primary"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Apply
                </Button>
              </div>
              <p className="text-sm cultural-text-primary mb-4">
                {optimization.reasoning}
              </p>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="cultural-border">
                  {optimization.budgetImpact.toUpperCase()} Impact
                </Badge>
                {optimization.potentialSavings > 0 && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    ${optimization.potentialSavings.toFixed(4)} savings
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alternative Models */}
          {optimization.alternatives.length > 0 && (
            <Card className="cultural-card">
              <CardHeader>
                <CardTitle className="cultural-text-primary">Alternative Models</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {optimization.alternatives.map((alt, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg cultural-bg border cultural-border">
                      <div>
                        <h4 className="font-medium cultural-text-primary">{alt.model.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ${alt.estimatedCost.toFixed(4)} • Quality: {alt.qualityScore.toFixed(1)}/10
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="cultural-border">
                          {alt.recommendation}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleApplyOptimization(alt.model.id)}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="space-y-4">
          {opportunities.length === 0 ? (
            <Card className="cultural-card">
              <CardContent className="p-6 text-center">
                <Zap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="cultural-text-primary">No optimization opportunities found</p>
                <p className="text-sm text-muted-foreground">Your usage is already well optimized!</p>
              </CardContent>
            </Card>
          ) : (
            opportunities.map((opportunity, index) => (
              <Card key={index} className="cultural-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="cultural-text-primary">{opportunity.description}</CardTitle>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ${opportunity.estimatedSavings.toFixed(2)} savings
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Type: {opportunity.type.replace('-', ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Effort: {opportunity.effort}
                      </p>
                    </div>
                    <Button variant="outline" className="cultural-border">
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <Card className="cultural-card">
              <CardContent className="p-6 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <p className="cultural-text-primary">No active alerts</p>
                <p className="text-sm text-muted-foreground">Your usage is within normal parameters</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert, index) => (
              <Card key={index} className="cultural-card">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    {alert.severity === 'critical' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : alert.severity === 'high' ? (
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    ) : (
                      <Lightbulb className="h-5 w-5 text-blue-500" />
                    )}
                    <CardTitle className="cultural-text-primary">{alert.title}</CardTitle>
                    <Badge 
                      variant="outline" 
                      className={
                        alert.severity === 'critical' ? 'border-red-500 text-red-500' :
                        alert.severity === 'high' ? 'border-orange-500 text-orange-500' :
                        'border-blue-500 text-blue-500'
                      }
                    >
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm cultural-text-primary mb-2">{alert.message}</p>
                  {alert.recommendation && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Recommendation:</strong> {alert.recommendation}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}