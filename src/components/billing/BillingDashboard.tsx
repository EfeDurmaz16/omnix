'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BillingOverview } from './BillingOverview';
import { InvoiceManager } from './InvoiceManager';
import { PaymentMethods } from './PaymentMethods';
import { UsageAnalytics } from './UsageAnalytics';
import { BillingSettings } from './BillingSettings';
import { EnterpriseControls } from './EnterpriseControls';
import { 
  CreditCard, 
  FileText, 
  BarChart3, 
  Settings,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  discountPercent?: number;
  customPrice?: number;
  nextInvoiceAmount: number;
  nextInvoiceDate: string;
}

interface BillingDashboardProps {
  isTeamBilling?: boolean;
  teamId?: string;
}

export function BillingDashboard({ isTeamBilling = false, teamId }: BillingDashboardProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSubscription();
  }, [isTeamBilling, teamId]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const url = isTeamBilling && teamId 
        ? `/api/billing/subscription?teamId=${teamId}`
        : '/api/billing/subscription';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch subscription');
      const data = await response.json();
      setSubscription(data.subscription);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      // Mock data for development
      setSubscription({
        id: 'sub_1',
        plan: 'TEAM',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        discountPercent: 10,
        nextInvoiceAmount: 90.00,
        nextInvoiceDate: '2024-02-01T00:00:00Z'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'TRIALING': return 'bg-blue-500';
      case 'PAST_DUE': return 'bg-yellow-500';
      case 'CANCELED': return 'bg-red-500';
      case 'PAUSED': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold cultural-text-primary">
            {isTeamBilling ? 'Team Billing' : 'Billing & Subscription'}
          </h1>
          <p className="text-cultural-text-secondary mt-2">
            Manage your subscription, payments, and billing preferences
          </p>
        </div>
      </div>

      {/* Subscription Overview */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Subscription</span>
              <div className="flex space-x-2">
                <Badge className={`${getPlanBadgeColor(subscription.plan)} text-white`}>
                  {subscription.plan}
                </Badge>
                <Badge className={`${getStatusBadgeColor(subscription.status)} text-white`}>
                  {subscription.status}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-cultural-text-secondary">Billing Cycle</p>
                  <p className="font-semibold capitalize">{subscription.billingCycle.toLowerCase()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-cultural-text-secondary">Next Invoice</p>
                  <p className="font-semibold">${subscription.nextInvoiceAmount}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-cultural-text-secondary">Next Bill Date</p>
                  <p className="font-semibold">
                    {new Date(subscription.nextInvoiceDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {subscription.discountPercent && (
                <div className="flex items-center space-x-3">
                  <Badge className="bg-orange-500 text-white">
                    {subscription.discountPercent}% Discount
                  </Badge>
                </div>
              )}
            </div>

            {subscription.cancelAtPeriodEnd && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Your subscription will cancel at the end of the current period ({new Date(subscription.currentPeriodEnd).toLocaleDateString()}).
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 cultural-card">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Payment Methods</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Usage</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="enterprise" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Enterprise</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <BillingOverview 
            subscription={subscription} 
            isTeamBilling={isTeamBilling}
            teamId={teamId}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceManager 
            subscription={subscription}
            isTeamBilling={isTeamBilling}
            teamId={teamId}
          />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentMethods 
            subscription={subscription}
            isTeamBilling={isTeamBilling}
          />
        </TabsContent>

        <TabsContent value="usage">
          <UsageAnalytics 
            subscription={subscription}
            isTeamBilling={isTeamBilling}
            teamId={teamId}
          />
        </TabsContent>

        <TabsContent value="settings">
          <BillingSettings 
            subscription={subscription}
            isTeamBilling={isTeamBilling}
            onUpdate={fetchSubscription}
          />
        </TabsContent>

        <TabsContent value="enterprise">
          <EnterpriseControls 
            subscription={subscription}
            isTeamBilling={isTeamBilling}
            onUpdate={fetchSubscription}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}