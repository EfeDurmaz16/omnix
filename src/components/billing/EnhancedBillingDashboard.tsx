"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Zap, 
  TrendingUp, 
  History,
  Star,
  ArrowUpRight,
  RefreshCw,
  DollarSign,
  Calendar,
  Users
} from 'lucide-react';
import { BILLING_PLANS, CREDIT_PACKAGES, createCheckoutSession } from '@/lib/stripe';
import { prismaStripeCreditManager } from '@/lib/credits/PrismaStripeCreditManager';

interface UserData {
  credits: number;
  plan: string;
  transactions: any[];
  subscription?: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
}

export function EnhancedBillingDashboard() {
  const { user } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      
      // Get credits
      const credits = await prismaStripeCreditManager.getCredits(user.id);
      
      // Get transaction history
      const transactions = await prismaStripeCreditManager.getTransactionHistory(user.id, 20);
      
      // Get user plan and subscription info
      const response = await fetch('/api/user/profile');
      const profileData = await response.json();
      
      setUserData({
        credits,
        plan: profileData.plan || 'FREE',
        transactions,
        subscription: profileData.subscription
      });
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const handlePlanUpgrade = async (priceId: string) => {
    try {
      setLoading(true);
      await createCheckoutSession(priceId, 'subscription');
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setLoading(false);
    }
  };

  const handleCreditPurchase = async (priceId: string) => {
    try {
      setLoading(true);
      await createCheckoutSession(priceId, 'payment');
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setLoading(false);
    }
  };

  if (loading && !userData) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading billing information...
      </div>
    );
  }

  const currentPlan = BILLING_PLANS.find(plan => plan.id === userData?.plan.toLowerCase()) || BILLING_PLANS[0];
  const isFreePlan = userData?.plan === 'FREE';
  
  // Calculate credit usage progress (assume 30-day cycle)
  const maxCreditsForPlan = isFreePlan ? 100 : 10000; // Adjust based on plan
  const creditUsagePercentage = Math.min((userData?.credits || 0) / maxCreditsForPlan * 100, 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Usage</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and monitor usage
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchUserData}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Current Plan & Credits */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPlan.name}</div>
            <p className="text-xs text-muted-foreground">
              ${currentPlan.monthlyPrice}/month
            </p>
            <Badge variant={isFreePlan ? "secondary" : "default"} className="mt-2">
              {userData?.subscription?.status || 'Free'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData?.credits?.toLocaleString() || 0}</div>
            <div className="mt-2">
              <Progress value={creditUsagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {creditUsagePercentage.toFixed(1)}% of monthly allowance
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userData?.transactions?.filter(t => t.type === 'USAGE').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              API calls made
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Upgrade Plan</TabsTrigger>
          <TabsTrigger value="credits">Buy Credits</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {BILLING_PLANS.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {userData?.plan.toLowerCase() === plan.id && (
                      <Badge variant="secondary">Current</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold">${plan.monthlyPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={userData?.plan.toLowerCase() === plan.id ? "outline" : "default"}
                    disabled={userData?.plan.toLowerCase() === plan.id || loading}
                    onClick={() => handlePlanUpgrade(plan.stripePriceIdMonthly)}
                  >
                    {userData?.plan.toLowerCase() === plan.id ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="credits" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {CREDIT_PACKAGES.map((pkg) => (
              <Card key={pkg.id} className={`relative ${pkg.popular ? 'ring-2 ring-primary' : ''}`}>
                {pkg.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    Best Value
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold">{pkg.credits.toLocaleString()}</span>
                    <span className="text-muted-foreground"> credits</span>
                  </div>
                  <div className="text-lg font-semibold">${pkg.price}</div>
                  {pkg.bonus && (
                    <Badge variant="secondary">{pkg.bonus}</Badge>
                  )}
                  <Button
                    className="w-full"
                    disabled={loading}
                    onClick={() => handleCreditPurchase(pkg.stripePriceId)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase Credits
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Transaction History
              </CardTitle>
              <CardDescription>
                Your recent credit transactions and usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData?.transactions?.length ? (
                <div className="space-y-3">
                  {userData.transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          transaction.type === 'PURCHASE' ? 'bg-green-500' : 
                          transaction.type === 'USAGE' ? 'bg-blue-500' : 'bg-gray-500'
                        }`} />
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`font-bold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Subscription Info */}
      {userData?.subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={userData.subscription.status === 'active' ? 'default' : 'secondary'}>
                  {userData.subscription.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next billing date</p>
                <p className="font-medium">
                  {new Date(userData.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auto-renewal</p>
                <p className="font-medium">
                  {userData.subscription.cancelAtPeriodEnd ? 'Disabled' : 'Enabled'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}