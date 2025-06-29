'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import { STRIPE_PRICE_IDS } from '../../../stripe-prices.generated';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Zap, Users, Building2, CreditCard, DollarSign } from 'lucide-react';

export default function BillingClient() {
  const { user, addCredits, usageStats } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>('pro'); // Default plan
  const [loading, setLoading] = useState<string | null>(null);

  // Handle success/error messages from Stripe checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    const type = urlParams.get('type');

    if (success) {
      if (type === 'credits') {
        // Handle successful credit purchase
        handleCreditPurchaseSuccess();
      } else {
        // Handle successful subscription purchase
        alert('🎉 Payment successful! Your plan has been updated.');
      }
      // Clean URL
      window.history.replaceState({}, document.title, '/billing');
    } else if (canceled) {
      alert('Payment was canceled. You can try again anytime.');
      // Clean URL
      window.history.replaceState({}, document.title, '/billing');
    }
  }, []);

  const handleCreditPurchaseSuccess = () => {
    // Get the actual credit amount from localStorage
    const pendingCredits = localStorage.getItem('pendingCreditPurchase');
    const creditAmount = pendingCredits ? parseInt(pendingCredits) : 100;
    
    console.log('🎉 Credit purchase success! Adding credits:', creditAmount);
    console.log('🎉 Current auth state:', { user: !!user, usageStats: !!usageStats });
    
    // Clear the pending purchase
    localStorage.removeItem('pendingCreditPurchase');
    
    // Show success message
    alert(`🎉 Credits purchased successfully! ${creditAmount} credits have been added to your account.`);
    
    // Multiple attempts to ensure user context is ready
    const attemptCreditAddition = (attempts = 0) => {
      if (attempts > 10) {
        console.error('❌ Failed to add credits after 10 attempts');
        alert('Credits purchased but there was an issue adding them. Please refresh the page.');
        return;
      }
      
      if (user && usageStats) {
        console.log(`🕐 Attempt ${attempts + 1}: Adding credits now`);
        addCredits(creditAmount);
      } else {
        console.log(`🕐 Attempt ${attempts + 1}: User context not ready, retrying...`);
        setTimeout(() => attemptCreditAddition(attempts + 1), 500);
      }
    };
    
    // Start the credit addition process
    attemptCreditAddition();
    
    console.log('✅ Credits addition process started');
  };

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
      culturalStyle: 'cultural-card',
      iconColor: 'text-muted-foreground'
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
      culturalStyle: 'cultural-primary',
      iconColor: 'text-white'
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
      culturalStyle: 'cultural-secondary',
      iconColor: 'text-white'
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
      culturalStyle: 'cultural-accent',
      iconColor: 'text-foreground'
    }
  ];

  const handleUpgrade = async (planId: string) => {
    if (planId === 'enterprise') {
      // For enterprise, just show contact info
      alert('Contact us at enterprise@aspendos.ai for custom pricing and setup.');
      return;
    }

    try {
      setLoading(planId);
      
      // Map plan IDs to real Stripe price IDs
      const priceIdMap: { [key: string]: string } = {
        'free': '', // Free plan doesn't need a price ID
        'pro': STRIPE_PRICE_IDS.pro_monthly,
        'ultra': STRIPE_PRICE_IDS.team_monthly, // Ultra maps to team
      };
      
      const priceId = priceIdMap[planId];
      if (!priceId) {
        throw new Error('Invalid plan ID');
      }
      
      // Call the real Stripe checkout API
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          mode: 'subscription',
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = url;
      
    } catch (error: unknown) {
      console.error('Failed to create checkout session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start checkout: ${errorMessage}`);
    } finally {
      setLoading(null);
    }
  };

  const handleBuyCredits = async (amount: number) => {
    try {
      setLoading(`credits-${amount}`);
      
      // Map amount to priceId and credit amount
      const creditPackages = [
        { amount: 5, priceId: STRIPE_PRICE_IDS.credits_5, credits: 100 },
        { amount: 15, priceId: STRIPE_PRICE_IDS.credits_15, credits: 350 },
        { amount: 40, priceId: STRIPE_PRICE_IDS.credits_40, credits: 1000 },
        { amount: 100, priceId: STRIPE_PRICE_IDS.credits_100, credits: 2500 }
      ];
      
      const package_ = creditPackages.find(p => p.amount === amount);
      if (!package_) {
        throw new Error('Invalid credit amount');
      }
      
      // Store the credit amount for when the user returns from Stripe
      localStorage.setItem('pendingCreditPurchase', package_.credits.toString());
      
      // Call the real Stripe checkout API for credits
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: package_.priceId,
          mode: 'payment',
          successUrl: `${window.location.origin}/billing?success=true&type=credits`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = url;
      
    } catch (error: unknown) {
      console.error('Failed to create checkout session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start checkout: ${errorMessage}`);
      // Clear the pending purchase if there was an error
      localStorage.removeItem('pendingCreditPurchase');
    } finally {
      setLoading(null);
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
        <h1 className="text-3xl font-bold cultural-text-primary">Billing & Subscription</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your subscription and upgrade to access more AI models.
        </p>
      </div>

      {/* Current Plan Status - Simple Display */}
      <div className="mb-8 rounded-lg cultural-card p-6">
        <h2 className="text-xl font-semibold cultural-text-primary mb-4">
          Current Plan
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold cultural-text-primary">
              Plan: {currentPlan}
            </h3>
            <p className="text-sm text-muted-foreground">
              Active subscription • Billed monthly
            </p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="cultural-accent text-lg px-4 py-2">
              ✅ Active
            </Badge>
          </div>
        </div>
      </div>

      {/* Upgrade Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative cultural-card cultural-border ${currentPlan === plan.id ? 'ring-2 cultural-border' : ''}`}>
            <CardHeader className="text-center">
              <div className={`w-12 h-12 mx-auto mb-4 rounded-lg ${plan.culturalStyle} cultural-hover flex items-center justify-center transition-all duration-300`}>
                <plan.icon className={`w-6 h-6 ${plan.iconColor}`} />
              </div>
              <CardTitle className="text-xl cultural-text-primary">{plan.name}</CardTitle>
              <div className="text-2xl font-bold cultural-text-primary">
                {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2 cultural-text-primary">Features:</h4>
                  <ul className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-accent mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-2 cultural-text-primary">Video Models:</h4>
                  <div className="flex flex-wrap gap-1">
                    {plan.videoModels.map((model, index) => (
                      <Badge key={index} variant="outline" className="text-xs cultural-border">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2 cultural-text-primary">Text Models:</h4>
                  <div className="flex flex-wrap gap-1">
                    {plan.textModels.slice(0, 2).map((model, index) => (
                      <Badge key={index} variant="outline" className="text-xs cultural-border">
                        {model}
                      </Badge>
                    ))}
                    {plan.textModels.length > 2 && (
                      <Badge variant="outline" className="text-xs cultural-border">
                        +{plan.textModels.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={currentPlan === plan.id || loading === plan.id}
                  className={`w-full cultural-hover transition-all duration-300 ${currentPlan === plan.id ? 'cultural-card' : 'cultural-primary'}`}
                  variant={currentPlan === plan.id ? "outline" : "default"}
                >
                  {loading === plan.id ? 'Processing...' :
                   currentPlan === plan.id ? 'Current Plan' : 
                   plan.id === 'enterprise' ? 'Contact Sales' : 
                   `Upgrade to ${plan.name}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Credit Packages */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold cultural-text-primary mb-4">
          <CreditCard className="inline mr-2" />
          Buy Credits
        </h2>
        <p className="text-muted-foreground mb-6">
          Need more flexibility? Purchase credits that work with any plan.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { amount: 5, credits: 100, bonus: 0 },
            { amount: 15, credits: 350, bonus: 50 },
            { amount: 40, credits: 1000, bonus: 200 },
            { amount: 100, credits: 2500, bonus: 500 }
          ].map((pack) => (
            <Card key={pack.amount} className="relative cultural-card cultural-border">
              <CardHeader className="text-center pb-2">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg cultural-accent cultural-hover flex items-center justify-center transition-all duration-300">
                  <DollarSign className="w-5 h-5 cultural-text-accent" />
                </div>
                <CardTitle className="text-lg cultural-text-primary">${pack.amount}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {pack.credits} credits
                  {pack.bonus > 0 && (
                    <div className="cultural-text-accent font-medium">
                      +{pack.bonus} bonus!
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <Button
                  onClick={() => handleBuyCredits(pack.amount)}
                  disabled={loading === `credits-${pack.amount}`}
                  className="w-full cultural-secondary cultural-hover transition-all duration-300"
                  variant="outline"
                >
                  {loading === `credits-${pack.amount}` ? 'Processing...' : 'Buy Credits'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Model Access Info */}
      <div className="cultural-card rounded-lg p-6">
        <h3 className="text-lg font-semibold cultural-text-primary mb-4">🎬 Video Model Access by Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium cultural-text-primary">Pro Plan</h4>
            <p className="text-muted-foreground">• Seedance V1 Pro I2V (Image-to-Video)</p>
            <p className="text-muted-foreground">• Basic video generation</p>
          </div>
          <div>
            <h4 className="font-medium cultural-text-accent">Ultra Plan</h4>
            <p className="text-muted-foreground">• Google Veo 2.0 & 3.0 Generate</p>
            <p className="text-muted-foreground">• All Seedance models</p>
            <p className="text-muted-foreground">• Advanced video generation</p>
          </div>
          <div>
            <h4 className="font-medium cultural-text-primary">Enterprise</h4>
            <p className="text-muted-foreground">• All video models</p>
            <p className="text-muted-foreground">• Custom model access</p>
            <p className="text-muted-foreground">• Dedicated infrastructure</p>
          </div>
        </div>
        
        <div className="mt-4 p-4 cultural-accent rounded cultural-border">
          <p className="text-sm">
            <strong>⚠️ Important:</strong> Veo models require special Google Cloud API access. 
            Even with Ultra plan, you need to request Veo API access from Google Cloud Console.
          </p>
        </div>
      </div>
    </div>
  );
} 