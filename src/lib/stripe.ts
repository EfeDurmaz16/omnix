import { loadStripe } from '@stripe/stripe-js';

// Environment variable validation
if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  console.error('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
}

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const STRIPE_PRICE_IDS = {
  // Subscription Plans
  student_monthly: 'price_1Rf0s3GfQ4XRggGYLyPcWhKs',
  pro_monthly: 'price_1Rf0s4GfQ4XRggGYSB9ExPB6',
  team_monthly: 'price_1Rf0s5GfQ4XRggGYAmoZRtmz',
  enterprise_monthly: 'price_1Rf0s5GfQ4XRggGYNWPGsCZ7',
  
  // Annual Plans (20% discount)
  student_annual: 'price_1Rf0s4GfQ4XRggGYQGzx0EUS',
  pro_annual: 'price_1Rf0s4GfQ4XRggGYyjhDkBNw',
  team_annual: 'price_1Rf0s5GfQ4XRggGY5Q7ueU19',
  enterprise_annual: 'price_1Rf0s6GfQ4XRggGYm1of3Nci',

  // Credit Packages
  credits_5: 'price_1Rf0s6GfQ4XRggGY0MDCg4Yw',
  credits_15: 'price_1Rf0s7GfQ4XRggGYV43Z1A3z',
  credits_40: 'price_1Rf0s7GfQ4XRggGYamxizg5m',
  credits_100: 'price_1Rf0s7GfQ4XRggGYrAsvxiKB',
} as const;

export interface PlanInfo {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  popular?: boolean;
}

export const BILLING_PLANS: PlanInfo[] = [
  {
    id: 'student',
    name: 'Student',
    description: 'Perfect for students and learning',
    monthlyPrice: 4.99,
    yearlyPrice: 47.99, // 20% discount
    features: [
      '500 credits/month',
      'All text models access',
      'Basic image generation (10/month)',
      'File upload support',
      'Email support'
    ],
    stripePriceIdMonthly: STRIPE_PRICE_IDS.student_monthly,
    stripePriceIdYearly: STRIPE_PRICE_IDS.student_annual,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For professionals and creators',
    monthlyPrice: 19.99,
    yearlyPrice: 191.99, // 20% discount
    features: [
      'Unlimited text chat',
      'All premium models (GPT-4, Claude, Gemini)',
      '50 image generations/month',
      'Voice input/output',
      'Priority support',
      'API access'
    ],
    stripePriceIdMonthly: STRIPE_PRICE_IDS.pro_monthly,
    stripePriceIdYearly: STRIPE_PRICE_IDS.pro_annual,
    popular: true,
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For teams and collaborations',
    monthlyPrice: 49.99,
    yearlyPrice: 479.99, // 20% discount
    features: [
      'Everything in Pro',
      'Team collaboration features',
      'Shared agent library',
      'Admin controls',
      'Usage insights',
      'Priority support with SLA'
    ],
    stripePriceIdMonthly: STRIPE_PRICE_IDS.team_monthly,
    stripePriceIdYearly: STRIPE_PRICE_IDS.team_annual,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    monthlyPrice: 199.99,
    yearlyPrice: 1919.99, // 20% discount
    features: [
      'Everything in Team',
      'Custom model deployments',
      'On-premise options',
      'Advanced security',
      'Dedicated support',
      'Custom integrations'
    ],
    stripePriceIdMonthly: STRIPE_PRICE_IDS.enterprise_monthly,
    stripePriceIdYearly: STRIPE_PRICE_IDS.enterprise_annual,
  },
];

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  stripePriceId: string;
  description?: string;
  bestFor?: string;
  popular?: boolean;
  bonus?: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'credits_5',
    name: 'Starter Pack',
    credits: 100,
    price: 5,
    stripePriceId: STRIPE_PRICE_IDS.credits_5,
    description: 'Perfect for occasional use',
    bestFor: 'Light usage'
  },
  {
    id: 'credits_15',
    name: 'Popular Pack',
    credits: 350,
    price: 15,
    stripePriceId: STRIPE_PRICE_IDS.credits_15,
    description: 'Most cost-effective option',
    bestFor: 'Regular users',
    popular: true,
    bonus: '25% bonus credits'
  },
  {
    id: 'credits_40',
    name: 'Power Pack',
    credits: 1000,
    price: 40,
    stripePriceId: STRIPE_PRICE_IDS.credits_40,
    description: 'For heavy users',
    bestFor: 'Power users',
    bonus: '43% bonus credits'
  },
  {
    id: 'credits_100',
    name: 'Enterprise Pack',
    credits: 2500,
    price: 100,
    stripePriceId: STRIPE_PRICE_IDS.credits_100,
    description: 'Maximum value for teams',
    bestFor: 'Teams & businesses',
    bonus: '67% bonus credits'
  },
];

export async function createCheckoutSession(priceId: string, mode: 'subscription' | 'payment' = 'subscription') {
  try {
    const response = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        mode,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing/cancel`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const { sessionId, url } = await response.json();
    
    if (url) {
      // Redirect to Stripe Checkout
      window.location.href = url;
    } else {
      throw new Error('No checkout URL received');
    }

  } catch (error: any) {
    console.error('❌ Checkout error:', error);
    throw error;
  }
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);
}

export function calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  const monthlyTotal = monthlyPrice * 12;
  return monthlyTotal - yearlyPrice;
}

// Helper function to get plan by ID
export function getPlanById(planId: string) {
  return BILLING_PLANS.find(plan => plan.id === planId);
}

// Helper function to get credit package by ID  
export function getCreditPackageById(packageId: string) {
  return CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
} 