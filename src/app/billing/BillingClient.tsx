'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Zap, Users, Building2 } from 'lucide-react';

export default function BillingClient() {
  const { userPlan, updatePlan } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>(userPlan || 'pro');

  // Sync with auth context
  useEffect(() => {
    setCurrentPlan(userPlan);
  }, [userPlan]);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Users,
      price: 0,
      period: '/month',
      description: 'Perfect for trying out the platform',
      features: [
        'Access to GPT-3.5 Turbo',
        'Basic image generation',
        '100 credits/month',
        'Community support'
      ],
      videoModels: ['None'],
      textModels: ['GPT-3.5', 'Claude Haiku', 'Gemini Flash'],
      gradient: 'from-gray-500 to-gray-600'
    },
    {
      id: 'pro',
      name: 'Pro',
      icon: Zap,
      price: 29,
      period: '/month',
      description: 'For power users and businesses',
      features: [
        'Access to GPT-4, Claude Opus',
        'Advanced image generation',
        'Seedance video generation',
        '1,000 credits/month',
        'Priority support'
      ],
      videoModels: ['Seedance V1 Pro I2V'],
      textModels: ['GPT-4', 'Claude Opus', 'Gemini Pro', 'All others'],
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'ultra',
      name: 'Ultra',
      icon: Crown,
      price: 99,
      period: '/month',
      description: 'Maximum power and unlimited access',
      features: [
        'Access to ALL AI models',
        'Google Veo video generation',
        'Custom model fine-tuning',
        '5,000 credits/month',
        '24/7 priority support',
        'Early access to new models'
      ],
      videoModels: ['Veo 2.0', 'Veo 3.0', 'Seedance', 'All video models'],
      textModels: ['All GPT models', 'All Claude models', 'All Gemini models', 'Everything'],
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: Building2,
      price: 'Custom',
      period: '',
      description: 'For large organizations',
      features: [
        'Everything in Ultra',
        'Dedicated infrastructure',
        'Custom SLA',
        'On-premise deployment',
        'Volume discounts'
      ],
      videoModels: ['All models + custom'],
      textModels: ['All models + custom'],
      gradient: 'from-gray-700 to-gray-800'
    }
  ];

  const handleUpgrade = async (planId: string) => {
    try {
      // Update plan using AuthContext
      updatePlan(planId);
      setCurrentPlan(planId);
      
      // Show success message
      const plan = plans.find(p => p.id === planId);
      alert(
        `🎉 Plan Upgraded Successfully!\n\n` +
        `You are now on the ${plan?.name} plan.\n\n` +
        `New access:\n` +
        `• Video models: ${plan?.videoModels.join(', ')}\n` +
        `• Text models: ${plan?.textModels.join(', ')}\n\n` +
        `${planId === 'ultra' ? '🚀 You now have access to Google Veo models for video generation!' : ''}\n\n` +
        `Go to the Dashboard to try your new models!`
      );
      
      // Trigger a page reload to refresh model access
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
      alert('Failed to upgrade plan. Please try again.');
    }
  };

  const billingData = {
    currentPlan: {
      name: plans.find(p => p.id === currentPlan)?.name || 'Pro Plan',
      price: plans.find(p => p.id === currentPlan)?.price || 29,
      billingCycle: 'monthly',
      nextBilling: '2025-01-16',
      status: 'active'
    },
    paymentMethod: {
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiryMonth: 12,
      expiryYear: 2026
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing & Subscription</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Manage your subscription and upgrade to access more AI models.
        </p>
      </div>

      {/* Current Plan Status */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Current Plan
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {billingData.currentPlan.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Billed {billingData.currentPlan.billingCycle}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${billingData.currentPlan.price}{billingData.currentPlan.price !== 'Custom' ? '/month' : ''}
            </p>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              {billingData.currentPlan.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Upgrade Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${currentPlan === plan.id ? 'ring-2 ring-blue-500' : ''}`}>
            <CardHeader className="text-center">
              <div className={`w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-r ${plan.gradient} flex items-center justify-center`}>
                <plan.icon className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="text-2xl font-bold">
                {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                <span className="text-sm font-normal text-gray-500">{plan.period}</span>
              </div>
              <p className="text-sm text-gray-600">{plan.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Features:</h4>
                  <ul className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Video Models:</h4>
                  <div className="flex flex-wrap gap-1">
                    {plan.videoModels.map((model, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Text Models:</h4>
                  <div className="flex flex-wrap gap-1">
                    {plan.textModels.slice(0, 2).map((model, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                    {plan.textModels.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{plan.textModels.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={currentPlan === plan.id}
                  className="w-full"
                  variant={currentPlan === plan.id ? "outline" : "default"}
                >
                  {currentPlan === plan.id ? 'Current Plan' : 
                   plan.id === 'enterprise' ? 'Contact Sales' : 
                   `Upgrade to ${plan.name}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Model Access Info */}
      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">🎬 Video Model Access by Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-300">Pro Plan</h4>
            <p>• Seedance V1 Pro I2V (Image-to-Video)</p>
            <p>• Basic video generation</p>
          </div>
          <div>
            <h4 className="font-medium text-purple-800 dark:text-purple-300">Ultra Plan</h4>
            <p>• Google Veo 2.0 & 3.0 Generate</p>
            <p>• All Seedance models</p>
            <p>• Advanced video generation</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-300">Enterprise</h4>
            <p>• All video models</p>
            <p>• Custom model access</p>
            <p>• Dedicated infrastructure</p>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded border-l-4 border-yellow-500">
          <p className="text-sm">
            <strong>⚠️ Important:</strong> Veo models require special Google Cloud API access. 
            Even with Ultra plan, you need to request Veo API access from Google Cloud Console.
          </p>
        </div>
      </div>
    </div>
  );
} 