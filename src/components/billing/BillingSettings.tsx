'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Settings, 
  Calendar, 
  Bell,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Check,
  X,
  Mail,
  Smartphone,
  Building,
  Globe,
  Shield
} from 'lucide-react';

interface BillingSettingsProps {
  subscription: any;
  isTeamBilling?: boolean;
  onUpdate: () => void;
}

export function BillingSettings({ subscription, isTeamBilling, onUpdate }: BillingSettingsProps) {
  const [settings, setSettings] = useState({
    billingCycle: subscription?.billingCycle || 'MONTHLY',
    autoRenew: subscription?.autoRenew !== false,
    notifications: {
      email: true,
      sms: false,
      lowCredits: true,
      paymentSuccess: true,
      paymentFailure: true,
      invoiceGenerated: true,
      planExpiry: true
    },
    spendingLimits: {
      enabled: false,
      monthlyLimit: 500,
      alertThreshold: 80
    },
    taxSettings: {
      taxExempt: false,
      taxId: '',
      businessType: 'individual'
    }
  });
  const [loading, setLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [subscription?.id, isTeamBilling]);

  const fetchSettings = async () => {
    try {
      const url = isTeamBilling 
        ? `/api/billing/settings?teamId=${subscription?.teamId}`
        : '/api/billing/settings';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(prev => ({ ...prev, ...data.settings }));
    } catch (error) {
      console.error('Failed to fetch billing settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const url = isTeamBilling 
        ? `/api/billing/settings?teamId=${subscription?.teamId}`
        : '/api/billing/settings';
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      
      if (!response.ok) throw new Error('Failed to update settings');
      
      setPendingChanges(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update billing settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? This will take effect at the end of your current billing period.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/billing/subscription/cancel', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to cancel subscription');
      
      onUpdate();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/billing/subscription/reactivate', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to reactivate subscription');
      
      onUpdate();
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBillingCyclePrice = (cycle: string) => {
    const basePrice = 100; // PRO plan base price
    switch (cycle) {
      case 'MONTHLY': return basePrice;
      case 'QUARTERLY': return Math.round(basePrice * 3 * 0.95);
      case 'YEARLY': return Math.round(basePrice * 12 * 0.85);
      default: return basePrice;
    }
  };

  const getBillingCycleDiscount = (cycle: string) => {
    switch (cycle) {
      case 'QUARTERLY': return '5% off';
      case 'YEARLY': return '15% off';
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Billing Settings</h2>
          <p className="text-cultural-text-secondary">
            Manage your billing preferences and subscription settings
          </p>
        </div>
        {pendingChanges && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchSettings();
                setPendingChanges(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Billing Cycle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Billing Cycle</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['MONTHLY', 'QUARTERLY', 'YEARLY'].map((cycle) => (
              <div
                key={cycle}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  settings.billingCycle === cycle
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSettings(prev => ({ ...prev, billingCycle: cycle }));
                  setPendingChanges(true);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium capitalize">{cycle.toLowerCase()}</p>
                  {settings.billingCycle === cycle && (
                    <Check className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <p className="text-lg font-bold">${getBillingCyclePrice(cycle)}</p>
                {getBillingCycleDiscount(cycle) && (
                  <Badge className="bg-green-500 text-white text-xs mt-1">
                    {getBillingCycleDiscount(cycle)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Billing cycle changes will take effect at your next renewal date.
              You can change this setting once per billing cycle.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Renewal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Auto-Renewal</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Automatic Subscription Renewal</p>
              <p className="text-sm text-cultural-text-secondary">
                Automatically renew your subscription to avoid service interruption
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSettings(prev => ({ ...prev, autoRenew: !prev.autoRenew }));
                  setPendingChanges(true);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoRenew ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoRenew ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm">
                {settings.autoRenew ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {key === 'email' && <Mail className="h-4 w-4 text-gray-500" />}
                  {key === 'sms' && <Smartphone className="h-4 w-4 text-gray-500" />}
                  {!['email', 'sms'].includes(key) && <Bell className="h-4 w-4 text-gray-500" />}
                  <div>
                    <p className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-xs text-cultural-text-secondary">
                      {key === 'email' && 'Email notifications'}
                      {key === 'sms' && 'SMS notifications'}
                      {key === 'lowCredits' && 'When credits are running low'}
                      {key === 'paymentSuccess' && 'Successful payments'}
                      {key === 'paymentFailure' && 'Failed payments'}
                      {key === 'invoiceGenerated' && 'New invoices'}
                      {key === 'planExpiry' && 'Plan expiration reminders'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        [key]: !value
                      }
                    }));
                    setPendingChanges(true);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    value ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Spending Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Spending Limits</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Spending Limits</p>
              <p className="text-sm text-cultural-text-secondary">
                Set monthly spending limits to control costs
              </p>
            </div>
            <button
              onClick={() => {
                setSettings(prev => ({
                  ...prev,
                  spendingLimits: {
                    ...prev.spendingLimits,
                    enabled: !prev.spendingLimits.enabled
                  }
                }));
                setPendingChanges(true);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.spendingLimits.enabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.spendingLimits.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.spendingLimits.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Monthly Limit ($)</label>
                <Input
                  type="number"
                  value={settings.spendingLimits.monthlyLimit}
                  onChange={(e) => {
                    setSettings(prev => ({
                      ...prev,
                      spendingLimits: {
                        ...prev.spendingLimits,
                        monthlyLimit: parseInt(e.target.value) || 0
                      }
                    }));
                    setPendingChanges(true);
                  }}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Alert Threshold (%)</label>
                <Input
                  type="number"
                  value={settings.spendingLimits.alertThreshold}
                  onChange={(e) => {
                    setSettings(prev => ({
                      ...prev,
                      spendingLimits: {
                        ...prev.spendingLimits,
                        alertThreshold: parseInt(e.target.value) || 0
                      }
                    }));
                    setPendingChanges(true);
                  }}
                  min="0"
                  max="100"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Tax Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Business Type</label>
              <select
                value={settings.taxSettings.businessType}
                onChange={(e) => {
                  setSettings(prev => ({
                    ...prev,
                    taxSettings: {
                      ...prev.taxSettings,
                      businessType: e.target.value
                    }
                  }));
                  setPendingChanges(true);
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
                <option value="nonprofit">Non-profit</option>
                <option value="government">Government</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Tax ID / VAT Number</label>
              <Input
                value={settings.taxSettings.taxId}
                onChange={(e) => {
                  setSettings(prev => ({
                    ...prev,
                    taxSettings: {
                      ...prev.taxSettings,
                      taxId: e.target.value
                    }
                  }));
                  setPendingChanges(true);
                }}
                placeholder="Enter your tax ID"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Tax Exempt</p>
              <p className="text-sm text-cultural-text-secondary">
                Check if your organization is tax exempt
              </p>
            </div>
            <button
              onClick={() => {
                setSettings(prev => ({
                  ...prev,
                  taxSettings: {
                    ...prev.taxSettings,
                    taxExempt: !prev.taxSettings.taxExempt
                  }
                }));
                setPendingChanges(true);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.taxSettings.taxExempt ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.taxSettings.taxExempt ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Management */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Subscription Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.cancelAtPeriodEnd ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="font-medium text-yellow-800">Subscription Cancelled</p>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                You can reactivate it before then to continue service.
              </p>
              <Button
                onClick={handleReactivateSubscription}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Reactivate Subscription
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-cultural-text-secondary mb-4">
                If you need to cancel your subscription, you can do so here. Your subscription will remain active
                until the end of your current billing period.
              </p>
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Subscription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}