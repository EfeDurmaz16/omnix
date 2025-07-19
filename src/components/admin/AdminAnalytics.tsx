'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  CreditCard, 
  Activity,
  DollarSign,
  Zap,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    totalCreditsUsed: number;
    averageSessionTime: number;
    conversionRate: number;
  };
  userGrowth: {
    period: string;
    newUsers: number;
    churn: number;
    growth: number;
  }[];
  planDistribution: {
    plan: string;
    users: number;
    revenue: number;
    percentage: number;
  }[];
  modelUsage: {
    model: string;
    requests: number;
    credits: number;
    percentage: number;
  }[];
  revenueMetrics: {
    period: string;
    revenue: number;
    growth: number;
  }[];
  topUsers: {
    id: string;
    name: string;
    email: string;
    plan: string;
    creditsUsed: number;
    requests: number;
  }[];
}

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Mock data for development
      setAnalytics({
        overview: {
          totalUsers: 1247,
          activeUsers: 892,
          totalRevenue: 18750,
          totalCreditsUsed: 2450000,
          averageSessionTime: 24.5,
          conversionRate: 12.8
        },
        userGrowth: [
          { period: 'Week 1', newUsers: 45, churn: 3, growth: 93.3 },
          { period: 'Week 2', newUsers: 52, churn: 5, growth: 90.4 },
          { period: 'Week 3', newUsers: 38, churn: 7, growth: 81.6 },
          { period: 'Week 4', newUsers: 61, churn: 4, growth: 93.4 }
        ],
        planDistribution: [
          { plan: 'FREE', users: 867, revenue: 0, percentage: 69.5 },
          { plan: 'PRO', users: 285, revenue: 5700, percentage: 22.9 },
          { plan: 'ULTRA', users: 78, revenue: 3900, percentage: 6.3 },
          { plan: 'TEAM', users: 17, revenue: 9150, percentage: 1.4 }
        ],
        modelUsage: [
          { model: 'gpt-4o', requests: 15420, credits: 308400, percentage: 28.5 },
          { model: 'claude-3-5-sonnet-20241022', requests: 12350, credits: 247000, percentage: 22.8 },
          { model: 'gpt-4o-mini', requests: 8900, credits: 89000, percentage: 16.4 },
          { model: 'gemini-1.5-pro', requests: 6780, credits: 135600, percentage: 12.5 },
          { model: 'dall-e-3', requests: 4230, credits: 169200, percentage: 7.8 }
        ],
        revenueMetrics: [
          { period: 'Jan', revenue: 12400, growth: 15.2 },
          { period: 'Feb', revenue: 14800, growth: 19.4 },
          { period: 'Mar', revenue: 16200, growth: 9.5 },
          { period: 'Apr', revenue: 18750, growth: 15.7 }
        ],
        topUsers: [
          { id: '1', name: 'John Smith', email: 'john@company.com', plan: 'TEAM', creditsUsed: 45000, requests: 890 },
          { id: '2', name: 'Sarah Johnson', email: 'sarah@startup.io', plan: 'ULTRA', creditsUsed: 38500, requests: 756 },
          { id: '3', name: 'Mike Chen', email: 'mike@agency.com', plan: 'PRO', creditsUsed: 28000, requests: 620 },
          { id: '4', name: 'Emily Davis', email: 'emily@corp.com', plan: 'ULTRA', creditsUsed: 25000, requests: 580 },
          { id: '5', name: 'Alex Rodriguez', email: 'alex@dev.com', plan: 'PRO', creditsUsed: 22000, requests: 510 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'FREE': return 'bg-gray-500';
      case 'PRO': return 'bg-blue-500';
      case 'ULTRA': return 'bg-purple-500';
      case 'TEAM': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cultural-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-cultural-text-secondary">Comprehensive platform metrics and insights</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Total Users</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.overview.totalUsers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Active Users</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.overview.activeUsers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.overview.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Credits Used</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.overview.totalCreditsUsed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Avg Session</p>
                <p className="text-2xl font-bold">{analytics.overview.averageSessionTime}m</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Conversion</p>
                <p className="text-2xl font-bold">{analytics.overview.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Plan Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.planDistribution.map((plan) => (
                <div key={plan.plan} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge className={`${getPlanBadgeColor(plan.plan)} text-white`}>
                      {plan.plan}
                    </Badge>
                    <span className="text-sm">{plan.users} users ({plan.percentage}%)</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(plan.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Revenue Growth</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.revenueMetrics.map((metric) => (
                <div key={metric.period} className="flex items-center justify-between">
                  <span className="text-sm">{metric.period}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{formatCurrency(metric.revenue)}</span>
                    <div className="flex items-center space-x-1">
                      {metric.growth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${metric.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {metric.growth > 0 ? '+' : ''}{metric.growth}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Usage & Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Top Models</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.modelUsage.map((model) => (
                  <TableRow key={model.model}>
                    <TableCell className="font-medium">{model.model}</TableCell>
                    <TableCell>{formatNumber(model.requests)}</TableCell>
                    <TableCell>{formatNumber(model.credits)}</TableCell>
                    <TableCell>{model.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Top Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Requests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-cultural-text-secondary">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getPlanBadgeColor(user.plan)} text-white`}>
                        {user.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatNumber(user.creditsUsed)}</TableCell>
                    <TableCell>{formatNumber(user.requests)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}