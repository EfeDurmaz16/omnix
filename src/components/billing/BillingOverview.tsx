'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface BillingOverviewProps {
  subscription: any;
  isTeamBilling?: boolean;
  teamId?: string;
}

interface BillingStats {
  currentMonthSpend: number;
  lastMonthSpend: number;
  yearToDateSpend: number;
  creditsRemaining: number;
  totalCredits: number;
  daysUntilRenewal: number;
  averageDailySpend: number;
  projectedMonthlySpend: number;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    status: string;
  }>;
  upcomingCharges: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
}

export function BillingOverview({ subscription, isTeamBilling, teamId }: BillingOverviewProps) {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingStats();
  }, [subscription?.id, isTeamBilling, teamId]);

  const fetchBillingStats = async () => {
    try {
      setLoading(true);
      const url = isTeamBilling && teamId 
        ? `/api/billing/stats?teamId=${teamId}`
        : '/api/billing/stats';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch billing stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch billing stats:', error);
      // Mock data for development
      setStats({
        currentMonthSpend: 245.80,
        lastMonthSpend: 189.50,
        yearToDateSpend: 2847.60,
        creditsRemaining: 7500,
        totalCredits: 10000,
        daysUntilRenewal: 12,
        averageDailySpend: 8.19,
        projectedMonthlySpend: 253.89,
        recentTransactions: [
          { id: '1', description: 'Monthly subscription', amount: 100.00, date: '2024-01-01', status: 'PAID' },
          { id: '2', description: 'Additional credits', amount: 50.00, date: '2024-01-15', status: 'PAID' },
          { id: '3', description: 'Overage charges', amount: 25.80, date: '2024-01-20', status: 'PENDING' }
        ],
        upcomingCharges: [
          { description: 'Monthly subscription', amount: 100.00, date: '2024-02-01' },
          { description: 'Estimated overage', amount: 15.50, date: '2024-02-01' }
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
    return <div>Failed to load billing statistics</div>;
  }

  const spendChange = ((stats.currentMonthSpend - stats.lastMonthSpend) / stats.lastMonthSpend) * 100;
  const creditUsagePercentage = ((stats.totalCredits - stats.creditsRemaining) / stats.totalCredits) * 100;
  const isOverBudget = stats.projectedMonthlySpend > (subscription?.nextInvoiceAmount || 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">This Month</p>
                <p className="text-2xl font-bold">${stats.currentMonthSpend.toFixed(2)}</p>
                <div className="flex items-center space-x-1 mt-1">
                  {spendChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                  <span className={`text-xs ${spendChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {Math.abs(spendChange).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Year to Date</p>
                <p className="text-2xl font-bold">${stats.yearToDateSpend.toFixed(2)}</p>
                <p className="text-xs text-cultural-text-secondary mt-1">
                  Avg: ${(stats.yearToDateSpend / 12).toFixed(0)}/month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Credits Remaining</p>
                <p className="text-2xl font-bold">{stats.creditsRemaining.toLocaleString()}</p>
                <p className="text-xs text-cultural-text-secondary mt-1">
                  {creditUsagePercentage.toFixed(1)}% used
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Next Renewal</p>
                <p className="text-2xl font-bold">{stats.daysUntilRenewal} days</p>
                <p className="text-xs text-cultural-text-secondary mt-1">
                  {new Date(subscription?.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Usage & Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credit Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Used: {(stats.totalCredits - stats.creditsRemaining).toLocaleString()}</span>
              <span className="text-sm">Total: {stats.totalCredits.toLocaleString()}</span>
            </div>
            <Progress value={creditUsagePercentage} className="w-full" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-cultural-text-secondary">Remaining</p>
                <p className="font-semibold text-green-600">{stats.creditsRemaining.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-cultural-text-secondary">Daily Usage</p>
                <p className="font-semibold">{Math.round(stats.creditsRemaining / stats.daysUntilRenewal).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spending Projection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Monthly Projection</span>
              {isOverBudget && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Current Spend</span>
                <span className="font-semibold">${stats.currentMonthSpend.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Projected Total</span>
                <span className={`font-semibold ${isOverBudget ? 'text-yellow-600' : ''}`}>
                  ${stats.projectedMonthlySpend.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Daily Average</span>
                <span className="font-semibold">${stats.averageDailySpend.toFixed(2)}</span>
              </div>
            </div>
            
            {isOverBudget && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  You're projected to exceed your plan limit by ${(stats.projectedMonthlySpend - (subscription?.nextInvoiceAmount || 0)).toFixed(2)} this month.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-cultural-text-secondary">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${transaction.amount.toFixed(2)}</p>
                    <Badge 
                      className={`${
                        transaction.status === 'PAID' ? 'bg-green-500' : 
                        transaction.status === 'PENDING' ? 'bg-yellow-500' : 'bg-red-500'
                      } text-white`}
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Charges */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.upcomingCharges.map((charge, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{charge.description}</p>
                    <p className="text-sm text-cultural-text-secondary">
                      {new Date(charge.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${charge.amount.toFixed(2)}</p>
                    <Badge className="bg-blue-500 text-white">
                      SCHEDULED
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t">
              <div className="flex justify-between font-semibold">
                <span>Total Due</span>
                <span>${stats.upcomingCharges.reduce((sum, charge) => sum + charge.amount, 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">
              <DollarSign className="h-4 w-4 mr-2" />
              Add Credits
            </Button>
            <Button variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              Update Payment Method
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Change Billing Cycle
            </Button>
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}