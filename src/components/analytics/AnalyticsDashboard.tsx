'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Activity, 
  DollarSign, 
  Zap, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Cpu,
  Database,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  realTimeStats: {
    requestsLastHour: number;
    activeModels: number;
    costLastHour: number;
    averageResponseTime: number;
    successRate: number;
    totalEventsTracked: number;
  };
  costAnalysis: {
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
      type: string;
      description: string;
      potentialSavings: number;
      confidence: number;
    }>;
  };
  performanceReport: {
    period: string;
    totalRequests: number;
    totalCost: number;
    averageResponseTime: number;
    systemSuccessRate: number;
    topModels: Array<{
      modelId: string;
      provider: string;
      totalRequests: number;
      successRate: number;
      averageResponseTime: number;
      totalCost: number;
    }>;
    modelRecommendations: Array<{
      modelId: string;
      reason: string;
      score: number;
    }>;
  };
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [realtimeRes, costRes, reportRes] = await Promise.all([
        fetch('/api/analytics?action=realtime'),
        fetch('/api/analytics?action=cost&timeRange=24'),
        fetch(`/api/analytics?action=report&period=${period}`)
      ]);

      if (!realtimeRes.ok || !costRes.ok || !reportRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [realtime, cost, report] = await Promise.all([
        realtimeRes.json(),
        costRes.json(),
        reportRes.json()
      ]);

      setAnalyticsData({
        realTimeStats: realtime.data,
        costAnalysis: cost.data,
        performanceReport: report.data
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [period]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatNumber = (num: number) => 
    new Intl.NumberFormat('en-US').format(num);

  if (loading && !analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Failed to load analytics: {error}</p>
          <Button onClick={fetchAnalytics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  const { realTimeStats, costAnalysis, performanceReport } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Model performance and cost insights
            {lastUpdated && (
              <span className="ml-2">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchAnalytics} disabled={loading} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests (1h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(realTimeStats.requestsLastHour)}</div>
            <p className="text-xs text-muted-foreground">
              {realTimeStats.activeModels} active models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost (1h)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(realTimeStats.costLastHour)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(costAnalysis.projectedMonthlyCost)} projected monthly
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeStats.averageResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeStats.successRate.toFixed(1)}%</div>
            <Progress value={realTimeStats.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(realTimeStats.totalEventsTracked)}</div>
            <p className="text-xs text-muted-foreground">
              Tracked events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(performanceReport.totalRequests)}</div>
            <p className="text-xs text-muted-foreground">
              {period} period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Cost Trend</CardTitle>
                <CardDescription>Spending over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={costAnalysis.costByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Cost']} />
                    <Line type="monotone" dataKey="cost" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Provider Costs */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Provider</CardTitle>
                <CardDescription>Spending distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(costAnalysis.costByProvider).map(([provider, cost]) => ({
                        name: provider,
                        value: cost,
                        percentage: ((cost / costAnalysis.totalSpent) * 100).toFixed(1)
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(costAnalysis.costByProvider).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Cost']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm text-muted-foreground">Time period:</span>
            {['hour', 'day', 'week', 'month'].map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p as any)}
              >
                {p}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Models by Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Top Models by Usage</CardTitle>
                <CardDescription>Most frequently used models</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceReport.topModels.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="modelId" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalRequests" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Model Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Model Performance</CardTitle>
                <CardDescription>Response time vs success rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceReport.topModels.slice(0, 5).map((model, index) => (
                    <div key={model.modelId} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <div>
                          <p className="font-medium">{model.modelId}</p>
                          <p className="text-sm text-muted-foreground">{model.provider}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="text-sm font-medium">{model.averageResponseTime.toFixed(0)}ms</p>
                            <p className="text-xs text-muted-foreground">avg response</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{model.successRate.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">success rate</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{formatCurrency(model.totalCost)}</p>
                            <p className="text-xs text-muted-foreground">total cost</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Costly Models */}
            <Card>
              <CardHeader>
                <CardTitle>Most Expensive Models</CardTitle>
                <CardDescription>Models with highest costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {costAnalysis.topCostlyModels.slice(0, 5).map((model, index) => (
                    <div key={model.modelId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{model.modelId}</p>
                          <p className="text-sm text-muted-foreground">{model.percentage.toFixed(1)}% of total</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(model.cost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cost Optimization */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization Opportunities</CardTitle>
                <CardDescription>Potential savings identified</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {costAnalysis.costOptimizationOpportunities.map((opportunity, index) => (
                    <div key={index} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="capitalize">
                          {opportunity.type.replace('_', ' ')}
                        </Badge>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(opportunity.potentialSavings)}</p>
                          <p className="text-xs text-muted-foreground">{(opportunity.confidence * 100).toFixed(0)}% confidence</p>
                        </div>
                      </div>
                      <p className="text-sm">{opportunity.description}</p>
                    </div>
                  ))}
                  {costAnalysis.costOptimizationOpportunities.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No optimization opportunities found at this time.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Recommendations</CardTitle>
              <CardDescription>AI-powered suggestions for optimal model selection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performanceReport.modelRecommendations.map((rec, index) => (
                  <div key={rec.modelId} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{rec.modelId}</h3>
                      <Badge variant="secondary">
                        Score: {rec.score}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                  </div>
                ))}
                {performanceReport.modelRecommendations.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recommendations available yet.</p>
                    <p className="text-sm">Use the system more to generate personalized recommendations.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}