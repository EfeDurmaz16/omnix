'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  Check, 
  Zap, 
  Users, 
  Building2, 
  MessageSquare,
  Image,
  Video,
  Headphones
} from 'lucide-react';

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Free',
      icon: Users,
      price: 0,
      originalPrice: 0,
      period: '/month',
      description: 'Perfect for trying out the platform and small experiments',
      credits: '100 credits/month',
      gradient: 'from-slate-700 to-slate-800',
      glow: 'glow-slate',
      features: [
        'Access to GPT-3.5 Turbo',
        'Basic image generation (DALL-E 3)',
        'Community support',
        'Rate limits apply',
        'Basic usage analytics'
      ],
      cta: 'Get Started Free',
      popular: false
    },
    {
      name: 'Pro',
      icon: Zap,
      price: isAnnual ? 191.99 : 19.99,
      originalPrice: isAnnual ? 239.88 : 19.99,
      period: isAnnual ? '/year' : '/month',
      description: 'For professionals and creators',
      credits: 'Unlimited text chat',
      gradient: 'from-slate-500 to-slate-600',
      glow: 'glow-accent',
      features: [
        'All premium models (GPT-4, Claude, Gemini)',
        '50 image generations/month',
        'Voice input/output',
        'Priority support',
        'API access',
        'Advanced analytics'
      ],
      cta: 'Go Pro',
      popular: true
    },
    {
      name: 'Ultra',
      icon: Users,
      price: isAnnual ? 479.99 : 49.99,
      originalPrice: isAnnual ? 599.88 : 49.99,
      period: isAnnual ? '/year' : '/month',
      description: 'For power users and advanced workflows',
      credits: 'Everything in Pro + Advanced Features',
      gradient: 'from-slate-400 to-slate-500',
      glow: 'glow-accent',
      features: [
        'Advanced AI models access',
        'Video generation (Veo, Seedance)',
        'Priority processing',
        'Advanced analytics',
        'API priority access',
        'Enhanced support'
      ],
      cta: 'Go Ultra',
      popular: false
    },
    {
      name: 'Team',
      icon: Building2,
      price: 'Custom',
      originalPrice: 'Custom',
      period: '/person',
      description: 'For teams and organizations',
      credits: 'Custom per team size',
      gradient: 'from-slate-700 to-slate-800',
      glow: 'glow-slate',
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
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const faqs = [
    {
      question: 'What are credits and how do they work?',
      answer: 'Credits are our universal unit for all AI operations. Different models consume different amounts of credits based on their computational cost. You can see exact credit costs in your dashboard.'
    },
    {
      question: 'Can I switch between different AI models?',
      answer: 'Yes! You can switch between any available models in real-time. Each plan includes access to different tiers of models based on your subscription level.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'We offer a 30-day money-back guarantee for all paid plans. If you\'re not satisfied, contact our support team for a full refund.'
    },
    {
      question: 'Is there a free plan?',
      answer: 'Yes! Our free plan includes 100 credits per month with access to GPT-3.5 Turbo and basic image generation. Perfect for testing the platform before upgrading.'
    },
    {
      question: 'How does billing work?',
      answer: 'You\'re billed monthly or annually based on your chosen plan. Credits reset at the beginning of each billing cycle, and unused credits don\'t roll over.'
    },
    {
      question: 'Do you offer volume discounts?',
      answer: 'Yes! Enterprise customers can get custom pricing based on usage volume. Contact our sales team to discuss your specific needs.'
    }
  ];

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="glass-morphism-light border-slate-400/20 text-slate-200 px-4 py-2 mb-6 glow-slate">
            <Zap className="w-4 h-4 mr-2" />
            Simple Pricing
          </Badge>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Choose Your
            <br />
            <span className="bg-gradient-to-r from-slate-400 to-slate-600 bg-clip-text ">
              Perfect Plan
            </span>
          </h2>
          
          <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">
            Start with our free plan, then scale as you grow. All plans include access to multiple AI models 
            with transparent, usage-based pricing.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <span className={`text-sm ${!isAnnual ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${
                isAnnual ? 'bg-slate-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${isAnnual ? 'text-white' : 'text-slate-400'}`}>
              Annual <Badge className="ml-1 bg-slate-600/20 text-slate-300 text-xs">Save 20%</Badge>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {plans.map((plan, index) => (
            <div key={plan.name} className="relative group">
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-slate-600 text-white px-4 py-1 glow-accent">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 to-slate-700/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              
              <Card className={`relative glass-morphism rounded-2xl border border-slate-400/20 group-hover:glass-morphism-heavy transition-all duration-300 ${plan.glow} ${plan.popular ? 'ring-2 ring-slate-400/30' : ''}`}>
                <CardHeader className="text-center p-6">
                  <div className="relative mb-4">
                    <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} rounded-xl blur-sm ${plan.glow}`} />
                    <div className={`relative w-12 h-12 mx-auto bg-gradient-to-br ${plan.gradient} rounded-xl shadow-lg flex items-center justify-center`}>
                      <plan.icon className="w-6 h-6 text-white" strokeWidth={2} />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-300 mb-4">{plan.description}</p>
                  
                  <div className="mb-4">
                    {typeof plan.price === 'number' ? (
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold text-white">${plan.price}</span>
                        <span className="text-slate-400 ml-1">{plan.period}</span>
                      </div>
                    ) : (
                      <div className="text-3xl font-bold text-white">{plan.price}</div>
                    )}
                    {isAnnual && typeof plan.price === 'number' && plan.price > 0 && (
                      <div className="text-xs text-slate-400 mt-1">
                        ${(plan.price/12).toFixed(2)}/month billed annually
                      </div>
                    )}
                    {isAnnual && typeof plan.price === 'number' && plan.originalPrice !== plan.price && (
                      <div className="text-xs text-green-400 mt-1">
                        Save ${(plan.originalPrice - plan.price).toFixed(2)}/year
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-slate-300 mb-6">{plan.credits}</div>
                </CardHeader>
                
                <CardContent className="p-6 pt-0">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-4 h-4 text-slate-400 mr-3 mt-0.5 flex-shrink-0" strokeWidth={2} />
                        <span className="text-sm text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    asChild 
                    className={`w-full glass-button bg-gradient-to-br ${plan.gradient} hover:from-slate-500 hover:to-slate-600 text-white ${plan.glow} border-0`}
                  >
                    <Link href={plan.name === 'Team' ? '/contact' : plan.name === 'Free' ? '/signup' : '/billing'}>
                      {plan.cta}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="glass-morphism-light rounded-2xl p-8 glow-slate">
          <h3 className="text-2xl font-semibold text-white text-center mb-8">
            Frequently Asked Questions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <div key={index} className="space-y-3">
                <h4 className="text-lg font-medium text-white">{faq.question}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8 pt-8 border-t border-slate-500/20">
            <p className="text-slate-300 mb-4">Have more questions?</p>
            <Button 
              asChild 
              variant="outline" 
              className="glass-morphism-light border-slate-400/30 text-white hover:bg-slate-400/10"
            >
              <Link href="/contact" className="flex items-center">
                <Headphones className="w-4 h-4 mr-2" />
                Contact Support
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
} 