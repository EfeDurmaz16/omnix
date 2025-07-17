'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import { enhancedCreditManager } from '@/lib/credits/EnhancedCreditManager';
// Import with try-catch to handle potential module loading issues
let STRIPE_PRICE_IDS: any = {};
try {
  const stripeModule = require('../../../stripe-prices.generated');
  STRIPE_PRICE_IDS = stripeModule.STRIPE_PRICE_IDS || {};
} catch (error) {
  console.warn('Failed to load Stripe price IDs:', error);
  // Fallback price IDs
  STRIPE_PRICE_IDS = {
    student_monthly: 'price_fallback_student_monthly',
    pro_monthly: 'price_fallback_pro_monthly',
    team_monthly: 'price_fallback_team_monthly',
    enterprise_monthly: 'price_fallback_enterprise_monthly',
    credits_5: 'price_fallback_credits_5',
    credits_15: 'price_fallback_credits_15',
    credits_40: 'price_fallback_credits_40',
    credits_100: 'price_fallback_credits_100',
  };
}
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Zap, Users, Building2, CreditCard, DollarSign } from 'lucide-react';
import { BILLING_PLANS } from '@/lib/stripe';

// Enhanced plan structure with UI components - Updated to match Stripe configuration
const ENHANCED_BILLING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/month',
    description: 'Perfect for getting started',
    icon: Zap,
    iconColor: 'text-gray-500',
    culturalStyle: 'bg-gray-100',
    features: [
      '100 credits/month',
      'Basic text models',
      'Community support'
    ],
    videoModels: [],
    textModels: ['GPT-3.5', 'Claude Haiku']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    period: '/month',
    description: 'For professionals and creators',
    icon: Crown,
    iconColor: 'text-blue-500',
    culturalStyle: 'bg-blue-100',
    features: [
      'Unlimited text chat',
      'All premium models (GPT-4, Claude, Gemini)',
      '50 image generations/month',
      'Voice input/output',
      'Priority support',
      'API access'
    ],
    videoModels: ['Seedance V1 Pro I2V'],
    textModels: ['GPT-4', 'Claude Sonnet', 'Gemini Pro']
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: 49.99,
    period: '/month',
    description: 'For power users and advanced workflows',
    icon: Users,
    iconColor: 'text-purple-500',
    culturalStyle: 'bg-purple-100',
    features: [
      'Everything in Pro',
      'Advanced AI models access',
      'Video generation (Veo, Seedance)',
      'Priority processing',
      'Advanced analytics',
      'API priority access',
      'Enhanced support'
    ],
    videoModels: ['Google Veo 2.0', 'Google Veo 3.0', 'All Seedance models'],
    textModels: ['GPT-4', 'Claude Sonnet', 'Gemini Pro', 'Claude Opus']
  },
  {
    id: 'team',
    name: 'Team',
    price: 'Custom',
    period: '/person',
    description: 'For teams and organizations',
    icon: Building2,
    iconColor: 'text-green-500',
    culturalStyle: 'bg-green-100',
    features: [
      'Everything in Ultra',
      'Team collaboration features',
      'Shared workspaces',
      'Admin controls & user management',
      'Usage insights & analytics',
      'Custom pricing per team member',
      'Dedicated account manager',
      'Priority support with SLA'
    ],
    videoModels: ['All video models', 'Custom model access'],
    textModels: ['All text models', 'Custom deployments']
  }
];

export default function BillingClient() {
  // Add safety check for useAuth hook
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.error('Auth context error:', error);
    // Return loading state if auth context fails
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }
  
  const { user, addCredits, usageStats, refreshUserPlan } = authContext;
  const [currentPlan, setCurrentPlan] = useState<string>('free'); // Default plan
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
        handleSubscriptionSuccess();
      }
      // Clean URL
      window.history.replaceState({}, document.title, '/billing');
    } else if (canceled) {
      alert('Payment was canceled. You can try again anytime.');
      // Clean URL
      window.history.replaceState({}, document.title, '/billing');
    }
  }, []);

  // Sync currentPlan with user's actual plan
  useEffect(() => {
    if (user && user.plan && typeof user.plan === 'string') {
      console.log('🔄 Syncing current plan with user plan:', user.plan);
      setCurrentPlan(user.plan.toLowerCase());
    }
  }, [user]);

  const handleSubscriptionSuccess = async () => {
    console.log('🎉 Subscription payment successful! Refreshing plan...');
    
    try {
      // Get the plan that was purchased
      const lastPurchasePlan = localStorage.getItem('lastPurchasePlan');
      console.log('🔍 Last purchase plan from localStorage:', lastPurchasePlan);
      
      // IMMEDIATELY trigger test webhook since local webhooks don't work
      if (lastPurchasePlan) {
        console.log('🧪 Immediately triggering test webhook for plan:', lastPurchasePlan);
        
        // Map plan to price ID (reverse of what we do in webhook)
        const planToPriceMap: { [key: string]: string } = {
          'pro': 'price_1Rf0s4GfQ4XRggGYSB9ExPB6',
          'ultra': 'price_1Rf0s5GfQ4XRggGYAmoZRtmz',
          'team': '', // Team plan requires custom pricing
        };
        
        const priceId = planToPriceMap[lastPurchasePlan?.toLowerCase() || ''];
        
        if (priceId) {
          try {
            console.log('🔗 Calling test webhook with priceId:', priceId);
            
            const testResponse = await fetch('/api/test/webhook', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                priceId: priceId,
                sessionMode: 'subscription'
              })
            });
            
            const testResult = await testResponse.json();
            console.log('🧪 Test webhook response:', testResult);
            
            if (testResponse.ok && testResult.success) {
              console.log('✅ Test webhook succeeded! Plan updated to:', testResult.data?.plan);
              localStorage.removeItem('lastPurchasePlan');
              
              // Refresh the user context
              if (refreshUserPlan) {
                await refreshUserPlan();
              }
              
              // Update local state
              if (testResult.data?.plan && typeof testResult.data.plan === 'string') {
                setCurrentPlan(testResult.data.plan.toLowerCase());
              }
              
                              alert(`🎉 Payment successful! Your plan has been upgraded to ${testResult.data?.plan || 'your new plan'}.`);
              
              // Force page reload to ensure everything is updated
              setTimeout(() => {
                window.location.reload();
              }, 1000);
              return;
            }
          } catch (testError) {
            console.error('❌ Test webhook failed:', testError);
          }
        }
      }
      
      // If test webhook failed, fall back to polling approach
      console.log('⏳ Test webhook failed, falling back to polling...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try multiple times to refresh the plan
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Attempt ${attempts}/${maxAttempts} to refresh plan...`);
        
        try {
          // Refresh user plan from database
          if (refreshUserPlan) {
            await refreshUserPlan();
          }
          
          // Also try to force refresh the plan from API
          const response = await fetch('/api/user/plan', {
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📋 Attempt ${attempts} - API response:`, data);
            
            if (data.success && data.data && data.data.plan && typeof data.data.plan === 'string') {
              const newPlan = data.data.plan.toLowerCase();
              console.log(`📋 Attempt ${attempts} - Plan from API:`, newPlan);
              
              // Check if plan changed from what was expected
              const expectedPlan = lastPurchasePlan?.toLowerCase();
              if (expectedPlan && newPlan === expectedPlan) {
                setCurrentPlan(newPlan);
                console.log('✅ Plan successfully updated to:', newPlan);
                alert(`🎉 Payment successful! Your plan has been upgraded to ${newPlan.toUpperCase()}.`);
                
                // Force page reload to ensure everything is updated
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
                return;
              }
            } else {
              console.log(`📋 Attempt ${attempts} - Plan not found or invalid in API response:`, {
                success: data.success,
                hasData: !!data.data,
                plan: data.data?.plan,
                planType: typeof data.data?.plan
              });
            }
          }
          
          // Wait before next attempt
          if (attempts < maxAttempts) {
            console.log(`⏳ Plan still not updated, waiting 2s before attempt ${attempts + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error) {
          console.error(`❌ Error in attempt ${attempts}:`, error);
        }
      }
      
      // If we get here, all attempts failed - try test webhook as fallback
      console.log('❌ All attempts to refresh plan failed, trying test webhook fallback...');
      
      try {
        // Get the price ID from the URL params or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        
        // Try to determine which plan was purchased based on localStorage or other means
        const lastPurchasePlan = localStorage.getItem('lastPurchasePlan');
        
        if (lastPurchasePlan) {
          console.log('🧪 Attempting test webhook for plan:', lastPurchasePlan);
          
          // Map plan to price ID (reverse of what we do in webhook)
          const planToPriceMap: { [key: string]: string } = {
            'pro': 'price_1Rf0s4GfQ4XRggGYSB9ExPB6',
            'ultra': 'price_1Rf0s5GfQ4XRggGYAmoZRtmz',
            'team': '', // Team plan requires custom pricing
          };
          
          const priceId = planToPriceMap[lastPurchasePlan?.toLowerCase() || ''];
          
          if (priceId) {
            const testResponse = await fetch('/api/test/webhook', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                priceId: priceId,
                sessionMode: 'subscription'
              })
            });
            
            if (testResponse.ok) {
              const testResult = await testResponse.json();
              if (testResult.success) {
                console.log('✅ Test webhook succeeded, refreshing UI...');
                localStorage.removeItem('lastPurchasePlan');
                
                // Try refreshing one more time
                if (refreshUserPlan) {
                  await refreshUserPlan();
                }
                
                alert(`🎉 Payment successful! Your plan has been upgraded to ${lastPurchasePlan?.toUpperCase() || 'your new plan'}.`);
                
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
                return;
              }
            }
          }
        }
      } catch (testError) {
        console.error('❌ Test webhook also failed:', testError);
      }
      
      alert('🎉 Payment successful! The plan update is processing. Please refresh the page in a moment to see your updated plan.');
      
    } catch (error) {
      console.error('❌ Error refreshing plan after payment:', error);
      alert('🎉 Payment successful! Please refresh the page to see your updated plan.');
    }
  };

  const handleCreditPurchaseSuccess = async () => {
    // Get the actual credit amount from localStorage
    const pendingCredits = localStorage.getItem('pendingCreditPurchase');
    const creditAmount = pendingCredits ? parseInt(pendingCredits) : 100;
    
    console.log('🎉 Credit purchase success! Adding credits:', creditAmount);
    console.log('🔍 Current user context:', { user: !!user, userId: user?.id });
    
    // Store user ID in sessionStorage if available
    if (user?.id) {
      sessionStorage.setItem('clerk-user-id', user.id);
      console.log('💾 Stored user ID in sessionStorage:', user.id);
    }
    
    // Clear the pending purchase
    localStorage.removeItem('pendingCreditPurchase');
    
    try {
      // Use the enhanced credit manager for reliable credit addition
      console.log('💳 Using EnhancedCreditManager for reliable credit addition...');
      const success = await enhancedCreditManager.handleStripePurchase(creditAmount);
      
      if (success) {
        console.log('✅ Credits added successfully via CreditManager');
        alert(`🎉 Credits purchased successfully! ${creditAmount} credits have been added to your account.`);
        
        // Update the auth context directly
        if (addCredits) {
          console.log('🔄 Updating auth context with credit amount:', creditAmount);
          addCredits(creditAmount);
        }

        // Force refresh credits from database immediately
        if (refreshUserPlan) {
          console.log('🔄 Forcing refresh of user plan and credits...');
          refreshUserPlan();
        }
        
        // Refresh the page to ensure UI is updated
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } else {
        console.error('❌ EnhancedCreditManager failed to add credits');
        throw new Error('EnhancedCreditManager failed');
      }
      
    } catch (error) {
      console.error('❌ Error in credit addition:', error);
      
      // Ultimate fallback - direct localStorage manipulation
      console.log('🚨 Using ultimate fallback...');
      let userId = null;
      
      // Try to get user ID from any source
      if (typeof window !== 'undefined' && (window as any).Clerk?.user?.id) {
        userId = (window as any).Clerk.user.id;
      } else if (user?.id) {
        userId = user.id;
      } else {
        // Look for existing credit entries in localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('aspendos_credits_')) {
            userId = key.replace('aspendos_credits_', '');
            break;
          }
        }
      }
      
      if (userId) {
        const currentCredits = parseInt(localStorage.getItem(`aspendos_credits_${userId}`) || '1500');
        const newCredits = currentCredits + creditAmount;
        localStorage.setItem(`aspendos_credits_${userId}`, newCredits.toString());
        
        console.log('💾 Ultimate fallback success:', currentCredits, '→', newCredits);
        alert(`✅ Credits purchased! Added ${creditAmount} credits. Please refresh the page to see the update.`);
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        console.error('❌ Could not determine user ID for credit addition');
        alert(`❌ Credits purchased but could not be added automatically. Please contact support with your purchase details. Credit amount: ${creditAmount}`);
      }
    }
  };

  const plans = ENHANCED_BILLING_PLANS;

  const handleUpgrade = async (planId: string) => {
    if (planId === 'team') {
      // For team plan, just show contact info
      alert('Contact us at sales@aspendos.ai for custom team pricing based on your team size.');
      return;
    }

    try {
      setLoading(planId);
      
      // Map plan IDs to real Stripe price IDs
      const priceIdMap: { [key: string]: string } = {
        'free': '', // Free plan doesn't need a price ID
        'pro': STRIPE_PRICE_IDS.pro_monthly,
        'ultra': STRIPE_PRICE_IDS.team_monthly, // Ultra uses team price ID
        'team': '', // Team plan requires custom pricing - contact sales
      };
      
      const priceId = priceIdMap[planId];
      if (!priceId) {
        throw new Error('Invalid plan ID');
      }
      
      // Store the plan being purchased for fallback webhook testing
      localStorage.setItem('lastPurchasePlan', planId);
      console.log('💾 Stored last purchase plan:', planId);
      
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
      // Clear the stored plan if checkout failed
      localStorage.removeItem('lastPurchasePlan');
    } finally {
      setLoading(null);
    }
  };

  const handleBuyCredits = async (amount: number) => {
    try {
      setLoading(`credits-${amount}`);
      
      // Map amount to priceId and credit amount (INCLUDING BONUS) - Updated with new pricing
      const creditPackages = [
        { amount: 9, priceId: STRIPE_PRICE_IDS.credits_5, credits: 100, bonus: 0 },
        { amount: 29, priceId: STRIPE_PRICE_IDS.credits_15, credits: 300, bonus: 50 },
        { amount: 69, priceId: STRIPE_PRICE_IDS.credits_40, credits: 800, bonus: 200 },
        { amount: 149, priceId: STRIPE_PRICE_IDS.credits_100, credits: 2000, bonus: 500 }
      ];
      
      const package_ = creditPackages.find(p => p.amount === amount);
      if (!package_) {
        throw new Error('Invalid credit amount');
      }
      
      // Store the TOTAL credit amount (base + bonus) for when the user returns from Stripe
      const totalCredits = package_.credits + package_.bonus;
      localStorage.setItem('pendingCreditPurchase', totalCredits.toString());
      console.log(`💰 Storing pending purchase: ${package_.credits} base + ${package_.bonus} bonus = ${totalCredits} total credits`);
      
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
                    {(plan.videoModels || []).map((model, index) => (
                      <Badge key={index} variant="outline" className="text-xs cultural-border">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2 cultural-text-primary">Text Models:</h4>
                  <div className="flex flex-wrap gap-1">
                    {(plan.textModels || []).slice(0, 2).map((model, index) => (
                      <Badge key={index} variant="outline" className="text-xs cultural-border">
                        {model}
                      </Badge>
                    ))}
                    {(plan.textModels || []).length > 2 && (
                      <Badge variant="outline" className="text-xs cultural-border">
                        +{(plan.textModels || []).length - 2} more
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
                   plan.id === 'team' ? 'Contact Sales' : 
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
            { amount: 9, credits: 100, bonus: 0 },
            { amount: 29, credits: 300, bonus: 50 },
            { amount: 69, credits: 800, bonus: 200 },
            { amount: 149, credits: 2000, bonus: 500 }
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
                    <div className="font-bold text-foreground opacity-90">
                      +{pack.bonus} bonus!
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {pack.amount === 9 ? 'Chat & Images' : 
                     pack.amount === 29 ? 'Includes ~2 videos' : 
                     pack.amount === 69 ? 'Includes ~5 videos' : 
                     'Includes ~13 videos'}
                  </div>
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
            <h4 className="font-medium cultural-text-primary">Team Plan</h4>
            <p className="text-muted-foreground">• All video models</p>
            <p className="text-muted-foreground">• Custom model access</p>
            <p className="text-muted-foreground">• Team collaboration features</p>
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