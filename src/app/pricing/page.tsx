'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Check, 
  Star, 
  Zap, 
  CreditCard, 
  Infinity, 
  ArrowRight,
  MessageSquare,
  Image,
  Video,
  Brain,
  Sparkles,
  Crown
} from 'lucide-react';
import Link from 'next/link';

const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for trying out Omnix AI',
    features: [
      '5 messages per day',
      'Access to GPT-3.5 Turbo',
      'Basic text generation',
      'Community support',
      'Rate limited usage'
    ],
    limits: {
      messages: 5,
      images: 0,
      videos: 0
    },
    badge: null,
    buttonText: 'Current Plan',
    disabled: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 20,
    period: 'month',
    description: 'For professionals and creators',
    features: [
      'Unlimited text chat',
      'All text models (GPT-4, Claude, Gemini)',
      '50 image generations/month',
      '10 video generations/month',
      'File upload support',
      'Priority processing',
      'Email support'
    ],
    limits: {
      messages: -1, // unlimited
      images: 50,
      videos: 10
    },
    badge: 'Most Popular',
    buttonText: 'Upgrade to Pro',
    popular: true
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: 50,
    period: 'month',
    description: 'For power users and teams',
    features: [
      'Everything in Pro',
      'All premium models (Imagen, Veo, Seedance)',
      'Unlimited image generations',
      'Unlimited video generations',
      'Advanced prompt modes',
      'API access',
      'Priority support',
      'Custom model imports'
    ],
    limits: {
      messages: -1,
      images: -1,
      videos: -1
    },
    badge: 'Best Value',
    buttonText: 'Upgrade to Ultra'
  }
];

const creditPackages = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 100,
    price: 10,
    description: 'Perfect for occasional use',
    bonus: null,
    bestFor: 'Light usage'
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits: 500,
    price: 40,
    description: 'Most cost-effective option',
    bonus: '25% bonus credits',
    bestFor: 'Regular users',
    popular: true
  },
  {
    id: 'power',
    name: 'Power Pack',
    credits: 1000,
    price: 70,
    description: 'For heavy users',
    bonus: '43% bonus credits',
    bestFor: 'Power users'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits: 5000,
    price: 300,
    description: 'Maximum value for teams',
    bonus: '67% bonus credits',
    bestFor: 'Teams & businesses'
  }
];

const creditUsage = [
  { action: 'Text message', cost: '1-5 credits', icon: MessageSquare },
  { action: 'Image generation', cost: '10-50 credits', icon: Image },
  { action: 'Video generation', cost: '50-200 credits', icon: Video },
  { action: 'Advanced models', cost: '+50% cost', icon: Brain }
];

export default function PricingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push('/signup');
      return;
    }

    setLoading(planId);
    
    try {
      // TODO: Implement Stripe checkout for subscriptions
      console.log('Subscribing to plan:', planId);
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to success or dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleBuyCredits = async (packageId: string) => {
    if (!user) {
      router.push('/signup');
      return;
    }

    setLoading(packageId);
    
    try {
      // TODO: Implement Stripe checkout for credits
      console.log('Buying credits package:', packageId);
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to success or dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Credit purchase error:', error);
    } finally {
      setLoading(null);
    }
  };

  const annualDiscount = 0.2; // 20% discount for annual

  return (
    <div className="min-h-screen bg-animated-gradient floating-particles">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-lg glow-purple"></div>
            <Badge className="relative glass-morphism-light border-purple-400/30 text-purple-200 font-light px-6 py-3 glow-purple">
              <CreditCard className="mr-2 h-4 w-4" />
              Flexible Pricing
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-light mb-6 text-white">
            Choose Your <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">AI Journey</span>
          </h1>
          
          <p className="text-xl text-slate-300 font-light max-w-3xl mx-auto">
            Start free, upgrade when you need more. Pay-as-you-go with credits or subscribe for unlimited access.
          </p>
        </div>

        {/* Pricing Tabs */}
        <Tabs defaultValue="subscriptions" className="max-w-6xl mx-auto">
          <div className="flex justify-center mb-12">
            <TabsList className="glass-morphism-light border-white/20 rounded-2xl p-2">
              <TabsTrigger value="subscriptions" className="flex items-center space-x-3 px-6 py-3 rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300 transition-all duration-300">
                <Crown className="h-5 w-5" />
                <span className="font-light">Subscriptions</span>
              </TabsTrigger>
              <TabsTrigger value="credits" className="flex items-center space-x-3 px-6 py-3 rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300 transition-all duration-300">
                <Zap className="h-5 w-5" />
                <span className="font-light">Credits</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Subscription Plans */}
          <TabsContent value="subscriptions" className="space-y-8">
            {/* Annual Toggle */}
            <div className="flex justify-center items-center space-x-4 mb-8">
              <span className={`text-sm ${!isAnnual ? 'text-white font-medium' : 'text-slate-400'}`}>Monthly</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  isAnnual ? 'bg-purple-500' : 'bg-slate-600'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                  isAnnual ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
              <span className={`text-sm ${isAnnual ? 'text-white font-medium' : 'text-slate-400'}`}>
                Annual 
                <Badge variant="outline" className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
                  Save 20%
                </Badge>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {subscriptionPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative glass-morphism-heavy ${
                    plan.popular ? 'ring-2 ring-purple-400/50 glow-purple' : ''
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1">
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-light text-white mb-2">
                      {plan.name}
                    </CardTitle>
                    <div className="mb-4">
                      <span className="text-4xl font-light text-white">
                        ${isAnnual && plan.price > 0 ? Math.round(plan.price * (1 - annualDiscount)) : plan.price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-slate-400">
                          /{isAnnual ? 'year' : plan.period}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm">{plan.description}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-3">
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={plan.disabled || loading === plan.id}
                      className={`w-full ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600' 
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      {loading === plan.id ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        plan.buttonText
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Credit Packages */}
          <TabsContent value="credits" className="space-y-8">
            {/* Credit Usage Guide */}
            <Card className="glass-morphism-light mb-8">
              <CardHeader>
                <CardTitle className="text-xl font-light text-white text-center">
                  How Credits Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {creditUsage.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={index} className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-white font-medium mb-1">{item.action}</h3>
                        <p className="text-slate-400 text-sm">{item.cost}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {creditPackages.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={`relative glass-morphism-heavy ${
                    pkg.popular ? 'ring-2 ring-purple-400/50 glow-purple' : ''
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl font-light text-white mb-2">
                      {pkg.name}
                    </CardTitle>
                    <div className="mb-2">
                      <span className="text-3xl font-light text-white">
                        {pkg.credits.toLocaleString()}
                      </span>
                      <span className="text-slate-400 ml-1">credits</span>
                    </div>
                    {pkg.bonus && (
                      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 mb-2">
                        {pkg.bonus}
                      </Badge>
                    )}
                    <p className="text-slate-300 text-sm">{pkg.description}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <span className="text-2xl font-light text-white">${pkg.price}</span>
                      <p className="text-slate-400 text-xs">{pkg.bestFor}</p>
                    </div>
                    
                    <Button
                      onClick={() => handleBuyCredits(pkg.id)}
                      disabled={loading === pkg.id}
                      className={`w-full ${
                        pkg.popular 
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600' 
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      {loading === pkg.id ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <>
                          Buy Credits
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* FAQ or Additional Info */}
        <div className="text-center mt-16">
          <h2 className="text-2xl font-light text-white mb-6">Questions?</h2>
          <p className="text-slate-300 mb-8">
            Start with our free plan and upgrade anytime. No hidden fees, cancel anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button variant="outline" className="border-slate-500 text-slate-300 hover:bg-slate-800">
                Try Free Chat
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                <Star className="mr-2 h-4 w-4" />
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 