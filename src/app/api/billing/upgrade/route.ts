import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

// Plan hierarchy and pricing
const PLAN_HIERARCHY = ['FREE', 'PRO', 'ULTRA', 'TEAM'];
const PLAN_PRICING = {
  FREE: { monthly: 0, yearly: 0, credits: 1500 },
  PRO: { monthly: 20, yearly: 200, credits: 5000 },
  ULTRA: { monthly: 50, yearly: 500, credits: 15000 },
  TEAM: { monthly: 100, yearly: 1000, credits: 50000 }
};

interface UpgradeRequest {
  targetPlan: 'PRO' | 'ULTRA' | 'TEAM';
  billingCycle?: 'MONTHLY' | 'YEARLY';
  paymentMethodId?: string;
  promoCode?: string;
  teamSetup?: {
    teamName: string;
    maxMembers: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body: UpgradeRequest = await req.json();
    const { targetPlan, billingCycle = 'MONTHLY', paymentMethodId, promoCode, teamSetup } = body;

    // Validate target plan
    if (!['PRO', 'ULTRA', 'TEAM'].includes(targetPlan)) {
      return createErrorResponse('Invalid target plan', 400);
    }

    // Get current user and subscription info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        team: {
          select: { id: true, plan: true, ownerId: true }
        }
      }
    });

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    const currentSubscription = user.subscriptions[0];
    const currentPlan = currentSubscription?.plan || user.plan;

    // Validate upgrade path
    const currentPlanIndex = PLAN_HIERARCHY.indexOf(currentPlan);
    const targetPlanIndex = PLAN_HIERARCHY.indexOf(targetPlan);

    if (targetPlanIndex <= currentPlanIndex) {
      return createErrorResponse('Cannot upgrade to a lower or same plan', 400);
    }

    // Calculate pricing
    const pricing = calculateUpgradePricing(currentPlan, targetPlan, billingCycle, promoCode);

    // Handle team plan special case
    if (targetPlan === 'TEAM') {
      if (!teamSetup) {
        return createErrorResponse('Team setup information required for TEAM plan', 400);
      }
      
      // Create team if upgrading to TEAM plan
      const teamUpgradeResult = await handleTeamUpgrade(user, teamSetup, pricing, paymentMethodId);
      return createSecureResponse(teamUpgradeResult);
    }

    // Handle individual plan upgrade
    const upgradeResult = await processIndividualUpgrade(
      user, 
      currentSubscription, 
      targetPlan, 
      billingCycle, 
      pricing, 
      paymentMethodId
    );

    return createSecureResponse(upgradeResult);

  } catch (error) {
    console.error('Plan upgrade error:', error);
    return createErrorResponse('Failed to process upgrade', 500);
  }
}

function calculateUpgradePricing(
  currentPlan: string, 
  targetPlan: string, 
  billingCycle: string,
  promoCode?: string
) {
  const targetPricing = PLAN_PRICING[targetPlan as keyof typeof PLAN_PRICING];
  const baseAmount = billingCycle === 'YEARLY' ? targetPricing.yearly : targetPricing.monthly;
  
  let discount = 0;
  let discountReason = '';

  // Apply yearly discount
  if (billingCycle === 'YEARLY') {
    discount = baseAmount * 0.15; // 15% yearly discount
    discountReason = 'Annual billing discount';
  }

  // Apply promo code discount
  if (promoCode) {
    const promoDiscount = applyPromoCode(promoCode, baseAmount);
    if (promoDiscount.valid) {
      discount += promoDiscount.amount;
      discountReason += promoDiscount.reason ? `, ${promoDiscount.reason}` : '';
    }
  }

  // Calculate prorated amount if upgrading mid-cycle
  const prorationCredit = calculateProrationCredit(currentPlan, billingCycle);

  const finalAmount = Math.max(0, baseAmount - discount - prorationCredit);

  return {
    baseAmount,
    discount,
    discountReason,
    prorationCredit,
    finalAmount,
    currency: 'USD',
    billingCycle,
    nextBillingDate: calculateNextBillingDate(billingCycle)
  };
}

function applyPromoCode(promoCode: string, baseAmount: number) {
  // Mock promo code validation
  const promoCodes: Record<string, { discount: number; type: 'percentage' | 'fixed'; reason: string }> = {
    'WELCOME20': { discount: 20, type: 'percentage', reason: 'Welcome discount' },
    'SAVE50': { discount: 50, type: 'fixed', reason: 'Special promotion' },
    'STUDENT': { discount: 30, type: 'percentage', reason: 'Student discount' }
  };

  const promo = promoCodes[promoCode.toUpperCase()];
  if (!promo) {
    return { valid: false, amount: 0, reason: '' };
  }

  const discountAmount = promo.type === 'percentage' 
    ? baseAmount * (promo.discount / 100)
    : promo.discount;

  return {
    valid: true,
    amount: Math.min(discountAmount, baseAmount), // Cap at base amount
    reason: promo.reason
  };
}

function calculateProrationCredit(currentPlan: string, billingCycle: string) {
  // In a real implementation, this would calculate the remaining value of the current subscription
  if (currentPlan === 'FREE') return 0;
  
  const currentPricing = PLAN_PRICING[currentPlan as keyof typeof PLAN_PRICING];
  const currentAmount = billingCycle === 'YEARLY' ? currentPricing.yearly : currentPricing.monthly;
  
  // Mock: assume 50% of billing period remaining
  return currentAmount * 0.5;
}

function calculateNextBillingDate(billingCycle: string) {
  const now = new Date();
  if (billingCycle === 'YEARLY') {
    return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  } else {
    return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
}

async function handleTeamUpgrade(user: any, teamSetup: any, pricing: any, paymentMethodId?: string) {
  // Check if user already owns a team
  if (user.team && user.team.ownerId === user.id) {
    throw new Error('User already owns a team');
  }

  // Create team
  const team = await prisma.team.create({
    data: {
      name: teamSetup.teamName,
      slug: generateTeamSlug(teamSetup.teamName),
      plan: 'TEAM',
      maxMembers: teamSetup.maxMembers || 10,
      ownerId: user.id,
      credits: PLAN_PRICING.TEAM.credits
    }
  });

  // Update user to be part of the team
  await prisma.user.update({
    where: { id: user.id },
    data: {
      teamId: team.id,
      teamRole: 'OWNER',
      plan: 'TEAM'
    }
  });

  // Create subscription
  const subscription = await createSubscription(user.id, 'TEAM', pricing, paymentMethodId, team.id);

  // In a real implementation, this would:
  // 1. Process payment through Stripe
  // 2. Send confirmation emails
  // 3. Set up team billing
  // 4. Create audit logs

  return {
    success: true,
    type: 'team_upgrade',
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      plan: team.plan,
      maxMembers: team.maxMembers
    },
    subscription: {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      billingCycle: subscription.billingCycle
    },
    pricing,
    message: 'Successfully upgraded to TEAM plan and created team'
  };
}

async function processIndividualUpgrade(
  user: any, 
  currentSubscription: any, 
  targetPlan: string, 
  billingCycle: string, 
  pricing: any, 
  paymentMethodId?: string
) {
  // Cancel current subscription if exists
  if (currentSubscription) {
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: true
      }
    });
  }

  // Update user plan
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: targetPlan,
      credits: PLAN_PRICING[targetPlan as keyof typeof PLAN_PRICING].credits
    }
  });

  // Create new subscription
  const subscription = await createSubscription(user.id, targetPlan, pricing, paymentMethodId);

  // Create credit transaction for plan upgrade
  await prisma.creditTransaction.create({
    data: {
      userId: user.id,
      amount: PLAN_PRICING[targetPlan as keyof typeof PLAN_PRICING].credits,
      type: 'PURCHASE',
      description: `Plan upgrade to ${targetPlan}`,
      metadata: {
        planUpgrade: true,
        fromPlan: currentSubscription?.plan || user.plan,
        toPlan: targetPlan,
        subscriptionId: subscription.id
      }
    }
  });

  return {
    success: true,
    type: 'individual_upgrade',
    subscription: {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd
    },
    user: {
      plan: targetPlan,
      credits: PLAN_PRICING[targetPlan as keyof typeof PLAN_PRICING].credits
    },
    pricing,
    message: `Successfully upgraded to ${targetPlan} plan`
  };
}

async function createSubscription(
  userId: string, 
  plan: string, 
  pricing: any, 
  paymentMethodId?: string, 
  teamId?: string
) {
  const now = new Date();
  const periodEnd = pricing.billingCycle === 'YEARLY' 
    ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
    : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  return await prisma.subscription.create({
    data: {
      userId: teamId ? null : userId,
      teamId: teamId || null,
      plan: plan as any,
      status: 'ACTIVE',
      billingCycle: pricing.billingCycle as any,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      autoRenew: true,
      // In a real implementation, these would come from Stripe
      stripeCustomerId: `cus_mock_${userId}`,
      stripeSubscriptionId: `sub_mock_${Date.now()}`,
      stripePriceId: `price_mock_${plan.toLowerCase()}_${pricing.billingCycle.toLowerCase()}`,
      metadata: {
        upgradeTimestamp: now.toISOString(),
        finalAmount: pricing.finalAmount,
        paymentMethodId
      }
    }
  });
}

function generateTeamSlug(teamName: string): string {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 8);
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(req.url);
    const targetPlan = searchParams.get('targetPlan');
    const billingCycle = searchParams.get('billingCycle') || 'MONTHLY';

    if (!targetPlan || !['PRO', 'ULTRA', 'TEAM'].includes(targetPlan)) {
      return createErrorResponse('Valid target plan is required', 400);
    }

    // Get current user info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { plan: true, teamId: true }
    });

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    // Calculate upgrade pricing preview
    const pricing = calculateUpgradePricing(user.plan, targetPlan, billingCycle);
    
    // Get plan features comparison
    const features = getPlanFeatures(user.plan, targetPlan);

    return createSecureResponse({
      currentPlan: user.plan,
      targetPlan,
      billingCycle,
      pricing,
      features,
      canUpgrade: PLAN_HIERARCHY.indexOf(targetPlan) > PLAN_HIERARCHY.indexOf(user.plan),
      requirements: targetPlan === 'TEAM' ? ['Team name', 'Max members'] : []
    });

  } catch (error) {
    console.error('Upgrade preview error:', error);
    return createErrorResponse('Failed to get upgrade preview', 500);
  }
}

function getPlanFeatures(currentPlan: string, targetPlan: string) {
  const features = {
    FREE: {
      credits: 1500,
      modelsAccess: ['GPT-3.5', 'Basic Models'],
      features: ['Basic Chat', 'Limited Image Generation'],
      support: 'Community'
    },
    PRO: {
      credits: 5000,
      modelsAccess: ['GPT-4', 'Claude-3', 'Advanced Models'],
      features: ['Unlimited Chat', 'Advanced Image Generation', 'Code Analysis'],
      support: 'Email Support'
    },
    ULTRA: {
      credits: 15000,
      modelsAccess: ['GPT-4', 'Claude-3.5', 'All Models', 'Early Access'],
      features: ['All PRO Features', 'Video Generation', 'Priority Processing'],
      support: 'Priority Support'
    },
    TEAM: {
      credits: 50000,
      modelsAccess: ['All Models', 'Custom Models', 'Team Analytics'],
      features: ['All ULTRA Features', 'Team Collaboration', 'Admin Controls', 'Usage Analytics'],
      support: '24/7 Support'
    }
  };

  return {
    current: features[currentPlan as keyof typeof features],
    target: features[targetPlan as keyof typeof features]
  };
}