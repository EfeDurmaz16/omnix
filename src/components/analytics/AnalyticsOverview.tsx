'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface AnalyticsOverviewData {
  requestsLastHour: number;
  costLastHour: number;
  averageResponseTime: number;
  successRate: number;
  totalEventsTracked: number;
  projectedMonthlyCost: number;
  topModel: {
    modelId: string;
    requests: number;
  };
  recommendations: Array<{
    modelId: string;
    reason: string;
    score: number;
  }>;
}

export function AnalyticsOverview() {
  const [data, setData] = useState<AnalyticsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real-time stats and basic analytics
      const [realtimeRes, reportRes] = await Promise.all([
        fetch('/api/analytics?action=realtime'),
        fetch('/api/analytics?action=report&period=day')
      ]);

      if (!realtimeRes.ok || !reportRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [realtime, report] = await Promise.all([
        realtimeRes.json(),
        reportRes.json()
      ]);

      // Get cost data
      const costRes = await fetch('/api/analytics?action=cost&timeRange=24');
      const cost = costRes.ok ? await costRes.json() : { data: { projectedMonthlyCost: 0 } };

      const topModel = report.data.topModels?.[0] || { modelId: 'None', totalRequests: 0 };

      setData({
        requestsLastHour: realtime.data.requestsLastHour,
        costLastHour: realtime.data.costLastHour,
        averageResponseTime: realtime.data.averageResponseTime,
        successRate: realtime.data.successRate,
        totalEventsTracked: realtime.data.totalEventsTracked,
        projectedMonthlyCost: cost.data.projectedMonthlyCost,
        topModel: {
          modelId: topModel.modelId,
          requests: topModel.totalRequests
        },
        recommendations: report.data.modelRecommendations?.slice(0, 3) || []
      });
    } catch (error) {
      console.error('Failed to fetch analytics overview:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchOverview, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatNumber = (num: number) => 
    new Intl.NumberFormat('en-US').format(num);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Analytics Overview</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              <span>Loading analytics...</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error && !data) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Analytics Overview</span>
            </CardTitle>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Failed to load analytics: {error}</p>
                <Button onClick={fetchOverview} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      }

      if (!data) return null;

      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Analytics Overview</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={fetchOverview} size="sm" variant="ghost">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/analytics">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Full Dashboard
                  </Link>
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Model performance and cost insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-2xl font-bold text-blue-600">
                  <Activity className="h-5 w-5" />
                  <span>{formatNumber(data.requestsLastHour)}</span>
                </div>
                <p className="text-sm text-muted-foreground">Requests (1h)</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-2xl font-bold text-green-600">
                  <DollarSign className="h-5 w-5" />
                  <span>{formatCurrency(data.costLastHour)}</span>
                </div>
                <p className="text-sm text-muted-foreground">Cost (1h)</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-2xl font-bold text-orange-600">
                  <Clock className="h-5 w-5" />
                  <span>{data.averageResponseTime}ms</span>
                </div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-2xl font-bold text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>{data.successRate.toFixed(1)}%</span>
                </div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>

            {/* Success Rate Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">System Reliability</span>
                <span className="text-sm text-muted-foreground">{data.successRate.toFixed(1)}%</span>
              </div>
              <Progress value={data.successRate} className="h-2" />
            </div>

            {/* Cost Projection */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Monthly Projection</p>
                <p className="text-sm text-muted-foreground">Based on current usage</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(data.projectedMonthlyCost)}</p>
                <div className="flex items-center space-x-1 text-sm">
                  {data.projectedMonthlyCost > 100 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-red-500" />
                      <span className="text-red-600">High usage</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-500" />
                      <span className="text-green-600">Efficient</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Top Model */}
            <div>
              <h4 className="font-medium mb-2">Most Used Model</h4>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{data.topModel.modelId}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(data.topModel.requests)} requests today
                  </p>
                </div>
                <Badge variant="secondary">Top Choice</Badge>
              </div>
            </div>

            {/* Quick Recommendations */}
            {data.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">AI Recommendations</h4>
                <div className="space-y-2">
                  {data.recommendations.map((rec, index) => (
                    <div key={rec.modelId} className="flex items-center justify-between p-2 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{rec.modelId}</p>
                        <p className="text-xs text-muted-foreground">{rec.reason}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Score: {rec.score}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Tracking {formatNumber(data.totalEventsTracked)} total events
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }