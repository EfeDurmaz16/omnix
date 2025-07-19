'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Zap,
  Calendar,
  Download,
  Filter,
  Eye,
  MessageSquare,
  Image,
  Video,
  Code
} from 'lucide-react';

interface UsageData {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  dailyUsage: Array<{
    date: string;
    credits: number;
    cost: number;
    requests: number;
  }>;
  modelUsage: Array<{
    model: string;
    provider: string;
    requests: number;
    credits: number;
    cost: number;
    percentage: number;
  }>;
  typeBreakdown: Array<{
    type: string;
    requests: number;
    credits: number;
    cost: number;
    percentage: number;
  }>;
  topHours: Array<{
    hour: number;
    requests: number;
    credits: number;
  }>;
}

interface UsageAnalyticsProps {
  subscription: any;
  isTeamBilling?: boolean;
  teamId?: string;
}

export function UsageAnalytics({ subscription, isTeamBilling, teamId }: UsageAnalyticsProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedView, setSelectedView] = useState('overview');

  useEffect(() => {
    fetchUsageData();
  }, [subscription?.id, isTeamBilling, teamId, timeRange]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const url = isTeamBilling && teamId 
        ? `/api/billing/usage?teamId=${teamId}&range=${timeRange}`
        : `/api/billing/usage?range=${timeRange}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch usage data');
      const data = await response.json();
      setUsageData(data.usage);
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
      // Mock data for development
      setUsageData({
        totalCredits: 10000,
        usedCredits: 2500,
        remainingCredits: 7500,
        dailyUsage: [
          { date: '2024-01-15', credits: 120, cost: 0.60, requests: 45 },
          { date: '2024-01-16', credits: 89, cost: 0.45, requests: 32 },
          { date: '2024-01-17', credits: 156, cost: 0.78, requests: 58 },
          { date: '2024-01-18', credits: 203, cost: 1.02, requests: 71 },
          { date: '2024-01-19', credits: 178, cost: 0.89, requests: 64 },
          { date: '2024-01-20', credits: 134, cost: 0.67, requests: 49 },
          { date: '2024-01-21', credits: 92, cost: 0.46, requests: 33 }
        ],
        modelUsage: [
          { model: 'GPT-4', provider: 'OpenAI', requests: 156, credits: 780, cost: 3.90, percentage: 31.2 },
          { model: 'Claude-3.5-Sonnet', provider: 'Anthropic', requests: 134, credits: 670, cost: 3.35, percentage: 26.8 },
          { model: 'GPT-3.5-Turbo', provider: 'OpenAI', requests: 89, credits: 267, cost: 1.34, percentage: 10.7 },
          { model: 'DALL-E-3', provider: 'OpenAI', requests: 45, credits: 450, cost: 2.25, percentage: 18.0 },
          { model: 'Midjourney', provider: 'Midjourney', requests: 28, credits: 280, cost: 1.40, percentage: 11.2 },
          { model: 'Runway ML', provider: 'Runway', requests: 12, credits: 240, cost: 1.20, percentage: 9.6 }
        ],
        typeBreakdown: [
          { type: 'Chat', requests: 245, credits: 1225, cost: 6.13, percentage: 49.0 },
          { type: 'Image Generation', requests: 73, credits: 730, cost: 3.65, percentage: 29.2 },
          { type: 'Video Generation', requests: 12, credits: 240, cost: 1.20, percentage: 9.6 },
          { type: 'Code Analysis', requests: 52, credits: 156, cost: 0.78, percentage: 6.2 },
          { type: 'Document Processing', requests: 23, credits: 115, cost: 0.58, percentage: 4.6 }
        ],
        topHours: [
          { hour: 14, requests: 45, credits: 225 },
          { hour: 10, requests: 38, credits: 190 },
          { hour: 16, requests: 35, credits: 175 },
          { hour: 11, requests: 32, credits: 160 },
          { hour: 15, requests: 29, credits: 145 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      case 'image generation': return <Image className="h-4 w-4" />;
      case 'video generation': return <Video className="h-4 w-4" />;
      case 'code analysis': return <Code className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai': return 'bg-green-500';
      case 'anthropic': return 'bg-orange-500';
      case 'midjourney': return 'bg-purple-500';
      case 'runway': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const usagePercentage = usageData ? (usageData.usedCredits / usageData.totalCredits) * 100 : 0;
  const isNearLimit = usagePercentage > 80;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cultural-primary"></div>
      </div>
    );
  }

  if (!usageData) {
    return <div>Failed to load usage analytics</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Usage Analytics</h2>
          <p className="text-cultural-text-secondary">
            Track your AI model usage and spending patterns
          </p>
        </div>
        <div className="flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Credit Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Total Credits</p>
                <p className="text-2xl font-bold">{usageData.totalCredits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Used</p>
                <p className="text-2xl font-bold">{usageData.usedCredits.toLocaleString()}</p>
                <p className="text-xs text-cultural-text-secondary">
                  {usagePercentage.toFixed(1)}% of total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Remaining</p>
                <p className="text-2xl font-bold">{usageData.remainingCredits.toLocaleString()}</p>
                <p className="text-xs text-cultural-text-secondary">
                  {(100 - usagePercentage).toFixed(1)}% left
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Daily Average</p>
                <p className="text-2xl font-bold">
                  {Math.round(usageData.dailyUsage.reduce((sum, day) => sum + day.credits, 0) / usageData.dailyUsage.length)}
                </p>
                <p className="text-xs text-cultural-text-secondary">credits/day</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card className={isNearLimit ? 'border-yellow-300 bg-yellow-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Credit Usage</span>
            {isNearLimit && <Badge className="bg-yellow-500 text-white">Near Limit</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Used: {usageData.usedCredits.toLocaleString()}</span>
            <span className="text-sm">Total: {usageData.totalCredits.toLocaleString()}</span>
          </div>
          <Progress value={usagePercentage} className="w-full" />
          {isNearLimit && (
            <div className="p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                You've used {usagePercentage.toFixed(1)}% of your credits. Consider upgrading your plan or purchasing additional credits.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usageData.dailyUsage.map((day, index) => (
              <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-12 text-center">
                    <p className="text-sm font-medium">{new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}</p>
                    <p className="text-xs text-cultural-text-secondary">{new Date(day.date).getDate()}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{day.credits} credits</span>
                      <span className="text-sm text-cultural-text-secondary">${day.cost.toFixed(2)}</span>
                    </div>
                    <Progress value={(day.credits / Math.max(...usageData.dailyUsage.map(d => d.credits))) * 100} className="w-full" />
                    <p className="text-xs text-cultural-text-secondary mt-1">{day.requests} requests</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Usage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageData.modelUsage.map((model) => (
                <div key={`${model.model}-${model.provider}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getProviderColor(model.provider)} text-white text-xs`}>
                        {model.provider}
                      </Badge>
                      <span className="text-sm font-medium">{model.model}</span>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{model.credits} credits</p>
                      <p className="text-cultural-text-secondary">${model.cost.toFixed(2)}</p>
                    </div>
                  </div>
                  <Progress value={model.percentage} className="w-full" />
                  <div className="flex justify-between text-xs text-cultural-text-secondary">
                    <span>{model.requests} requests</span>
                    <span>{model.percentage.toFixed(1)}% of total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageData.typeBreakdown.map((type) => (
                <div key={type.type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(type.type)}
                      <span className="text-sm font-medium">{type.type}</span>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{type.credits} credits</p>
                      <p className="text-cultural-text-secondary">${type.cost.toFixed(2)}</p>
                    </div>
                  </div>
                  <Progress value={type.percentage} className="w-full" />
                  <div className="flex justify-between text-xs text-cultural-text-secondary">
                    <span>{type.requests} requests</span>
                    <span>{type.percentage.toFixed(1)}% of total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Usage Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {usageData.topHours.map((hour) => (
              <div key={hour.hour} className="text-center p-3 border rounded-lg">
                <p className="text-lg font-bold">{hour.hour}:00</p>
                <p className="text-sm text-cultural-text-secondary">{hour.requests} requests</p>
                <p className="text-sm text-cultural-text-secondary">{hour.credits} credits</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">Most Active Day</h3>
              </div>
              <p className="text-blue-800">
                {usageData.dailyUsage.reduce((max, day) => day.credits > max.credits ? day : max).date} with {usageData.dailyUsage.reduce((max, day) => day.credits > max.credits ? day : max).credits} credits used
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-900">Top Model</h3>
              </div>
              <p className="text-green-800">
                {usageData.modelUsage[0].model} accounts for {usageData.modelUsage[0].percentage.toFixed(1)}% of your usage
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <h3 className="font-medium text-purple-900">Primary Use Case</h3>
              </div>
              <p className="text-purple-800">
                {usageData.typeBreakdown[0].type} is your most common usage type ({usageData.typeBreakdown[0].percentage.toFixed(1)}%)
              </p>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <h3 className="font-medium text-orange-900">Peak Time</h3>
              </div>
              <p className="text-orange-800">
                You're most active at {usageData.topHours[0].hour}:00 with {usageData.topHours[0].requests} requests
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}