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
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Calendar, 
  User,
  Zap,
  TrendingUp,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UsageData {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  monthlyBreakdown: Array<{
    month: string;
    credits: number;
    requests: number;
  }>;
  memberUsage: Array<{
    userId: string;
    userName: string;
    credits: number;
    requests: number;
    percentage: number;
  }>;
  modelUsage: Array<{
    model: string;
    credits: number;
    requests: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    id: string;
    userName: string;
    model: string;
    requestType: string;
    credits: number;
    timestamp: string;
  }>;
}

interface TeamUsageProps {
  team: {
    id: string;
    name: string;
    credits: number;
  };
}

export function TeamUsage({ team }: TeamUsageProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchUsageData();
  }, [team.id, timeRange]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${team.id}/usage?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch usage data');
      const data = await response.json();
      setUsage(data.usage);
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
      // Mock data for development
      setUsage({
        totalCredits: team.credits,
        usedCredits: Math.floor(team.credits * 0.35),
        remainingCredits: Math.floor(team.credits * 0.65),
        monthlyBreakdown: [
          { month: 'Dec 2023', credits: 1200, requests: 340 },
          { month: 'Jan 2024', credits: 1450, requests: 420 },
          { month: 'Feb 2024', credits: 980, requests: 280 },
          { month: 'Mar 2024', credits: 1650, requests: 510 }
        ],
        memberUsage: [
          { userId: '1', userName: 'John Smith', credits: 850, requests: 120, percentage: 35 },
          { userId: '2', userName: 'Sarah Wilson', credits: 620, requests: 95, percentage: 25 },
          { userId: '3', userName: 'Mike Chen', credits: 480, requests: 75, percentage: 20 },
          { userId: '4', userName: 'Emily Davis', credits: 380, requests: 60, percentage: 15 },
          { userId: '5', userName: 'Alex Rodriguez', credits: 120, requests: 20, percentage: 5 }
        ],
        modelUsage: [
          { model: 'gpt-4o', credits: 980, requests: 145, percentage: 40 },
          { model: 'claude-3-5-sonnet', credits: 720, requests: 98, percentage: 29 },
          { model: 'gpt-4o-mini', credits: 450, requests: 180, percentage: 18 },
          { model: 'dall-e-3', credits: 320, requests: 25, percentage: 13 }
        ],
        recentActivity: [
          { id: '1', userName: 'John Smith', model: 'gpt-4o', requestType: 'chat', credits: 5, timestamp: '2 minutes ago' },
          { id: '2', userName: 'Sarah Wilson', model: 'dall-e-3', requestType: 'image', credits: 15, timestamp: '8 minutes ago' },
          { id: '3', userName: 'Mike Chen', model: 'claude-3-5-sonnet', requestType: 'chat', credits: 4, timestamp: '15 minutes ago' },
          { id: '4', userName: 'Emily Davis', model: 'gpt-4o-mini', requestType: 'chat', credits: 1, timestamp: '23 minutes ago' },
          { id: '5', userName: 'John Smith', model: 'gpt-4o', requestType: 'video', credits: 45, timestamp: '34 minutes ago' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const exportUsageData = () => {
    if (!usage) return;
    
    const csv = [
      ['Date', 'User', 'Model', 'Type', 'Credits'].join(','),
      ...usage.recentActivity.map(activity => [
        new Date().toLocaleDateString(),
        activity.userName,
        activity.model,
        activity.requestType,
        activity.credits
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${team.name}-usage-${timeRange}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cultural-primary"></div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="text-center text-cultural-text-secondary">
        Failed to load usage data
      </div>
    );
  }

  const usagePercentage = (usage.usedCredits / usage.totalCredits) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Team Usage Analytics</h2>
          <p className="text-cultural-text-secondary">
            Monitor credit consumption and model usage
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportUsageData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Credit Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Credit Usage Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Used: {usage.usedCredits.toLocaleString()}</span>
            <span className="text-sm">Total: {usage.totalCredits.toLocaleString()}</span>
          </div>
          <Progress value={usagePercentage} className="w-full" />
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-cultural-text-secondary">Used</p>
              <p className="font-semibold text-lg">{usage.usedCredits.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-cultural-text-secondary">Remaining</p>
              <p className="font-semibold text-lg text-green-600">{usage.remainingCredits.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-cultural-text-secondary">Usage Rate</p>
              <p className="font-semibold text-lg">{usagePercentage.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Usage by Member</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usage.memberUsage.map((member) => (
                <div key={member.userId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-cultural-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {member.userName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.userName}</p>
                      <p className="text-sm text-cultural-text-secondary">
                        {member.requests} requests
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{member.credits.toLocaleString()}</p>
                    <Badge variant="outline">{member.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Model Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Usage by Model</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usage.modelUsage.map((model, index) => (
                <div key={model.model} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <div>
                      <p className="font-medium">{model.model}</p>
                      <p className="text-sm text-cultural-text-secondary">
                        {model.requests} requests
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{model.credits.toLocaleString()}</p>
                    <Badge variant="outline">{model.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.recentActivity.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-cultural-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs">
                          {activity.userName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="font-medium">{activity.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{activity.model}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{activity.requestType}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{activity.credits}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-cultural-text-secondary">
                      {activity.timestamp}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Monthly Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {usage.monthlyBreakdown.map((month) => (
              <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{month.month}</p>
                  <p className="text-sm text-cultural-text-secondary">
                    {month.requests} requests
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{month.credits.toLocaleString()} credits</p>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-cultural-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(month.credits / Math.max(...usage.monthlyBreakdown.map(m => m.credits))) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}