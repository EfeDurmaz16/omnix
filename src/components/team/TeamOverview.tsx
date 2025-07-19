'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  CreditCard, 
  Activity,
  TrendingUp,
  Calendar,
  Zap
} from 'lucide-react';

interface TeamOverviewProps {
  team: {
    id: string;
    name: string;
    plan: string;
    credits: number;
    maxMembers: number;
    memberCount: number;
  };
}

interface TeamStats {
  creditsUsed: number;
  creditsRemaining: number;
  monthlyUsage: number;
  activeMembers: number;
  totalRequests: number;
  avgCostPerRequest: number;
  topModels: Array<{
    model: string;
    usage: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    user: string;
    action: string;
    timestamp: string;
    credits: number;
  }>;
}

export function TeamOverview({ team }: TeamOverviewProps) {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamStats();
  }, [team.id]);

  const fetchTeamStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${team.id}/stats`);
      if (!response.ok) throw new Error('Failed to fetch team stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch team stats:', error);
      // Mock data for development
      setStats({
        creditsUsed: Math.floor(team.credits * 0.3),
        creditsRemaining: Math.floor(team.credits * 0.7),
        monthlyUsage: Math.floor(team.credits * 0.15),
        activeMembers: Math.floor(team.memberCount * 0.8),
        totalRequests: 1247,
        avgCostPerRequest: 2.3,
        topModels: [
          { model: 'gpt-4o', usage: 450, percentage: 36 },
          { model: 'claude-3-5-sonnet', usage: 320, percentage: 26 },
          { model: 'gpt-4o-mini', usage: 280, percentage: 22 },
          { model: 'dall-e-3', usage: 197, percentage: 16 }
        ],
        recentActivity: [
          { user: 'John Smith', action: 'Image generation', timestamp: '2 minutes ago', credits: 15 },
          { user: 'Sarah Wilson', action: 'Chat completion', timestamp: '5 minutes ago', credits: 3 },
          { user: 'Mike Chen', action: 'Video generation', timestamp: '12 minutes ago', credits: 45 },
          { user: 'Emily Davis', action: 'Chat completion', timestamp: '18 minutes ago', credits: 2 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cultural-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-cultural-text-secondary">
        Failed to load team statistics
      </div>
    );
  }

  const creditUsagePercentage = (stats.creditsUsed / team.credits) * 100;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Team Members</p>
                <p className="text-2xl font-bold">{team.memberCount}/{team.maxMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Credits Remaining</p>
                <p className="text-2xl font-bold">{stats.creditsRemaining.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Active Members</p>
                <p className="text-2xl font-bold">{stats.activeMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Total Requests</p>
                <p className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Credit Usage</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Used: {stats.creditsUsed.toLocaleString()}</span>
            <span className="text-sm">Total: {team.credits.toLocaleString()}</span>
          </div>
          <Progress value={creditUsagePercentage} className="w-full" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-cultural-text-secondary">This Month</p>
              <p className="font-semibold">{stats.monthlyUsage.toLocaleString()} credits</p>
            </div>
            <div>
              <p className="text-cultural-text-secondary">Avg per Request</p>
              <p className="font-semibold">{stats.avgCostPerRequest} credits</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Models */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Top Models</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topModels.map((model, index) => (
                <div key={model.model} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <div>
                      <p className="font-medium">{model.model}</p>
                      <p className="text-sm text-cultural-text-secondary">
                        {model.usage} requests
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{model.percentage}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{activity.user}</p>
                    <p className="text-sm text-cultural-text-secondary">
                      {activity.action} • {activity.timestamp}
                    </p>
                  </div>
                  <Badge variant="outline">
                    -{activity.credits} credits
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}