import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

// Plan hierarchy and credits
const PLAN_HIERARCHY = ['FREE', 'PRO', 'ULTRA', 'TEAM'];
const PLAN_CREDITS = {
  FREE: 1500,
  PRO: 5000,
  ULTRA: 15000,
  TEAM: 50000
};

interface DowngradeRequest {
  targetPlan: 'FREE' | 'PRO' | 'ULTRA';
  effectiveDate?: 'immediate' | 'end_of_period';
  reason?: string;
  feedback?: string;
  dataRetention?: boolean; // Whether to retain data during downgrade
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body: DowngradeRequest = await req.json();
    const { 
      targetPlan, 
      effectiveDate = 'end_of_period', 
      reason, 
      feedback,
      dataRetention = true 
    } = body;

    // Validate target plan
    if (!['FREE', 'PRO', 'ULTRA'].includes(targetPlan)) {
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
          select: { 
            id: true, 
            plan: true, 
            ownerId: true,
            members: { select: { id: true } }
          }
        }
      }
    });

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    const currentSubscription = user.subscriptions[0];
    const currentPlan = currentSubscription?.plan || user.plan;

    // Validate downgrade path
    const currentPlanIndex = PLAN_HIERARCHY.indexOf(currentPlan);
    const targetPlanIndex = PLAN_HIERARCHY.indexOf(targetPlan);

    if (targetPlanIndex >= currentPlanIndex) {
      return createErrorResponse('Cannot downgrade to a higher or same plan', 400);
    }

    // Handle team plan downgrade special case
    if (currentPlan === 'TEAM') {
      const teamDowngradeResult = await handleTeamDowngrade(
        user, 
        targetPlan, 
        effectiveDate, 
        reason, 
        feedback,
        dataRetention
      );
      return createSecureResponse(teamDowngradeResult);
    }

    // Handle individual plan downgrade
    const downgradeResult = await processIndividualDowngrade(
      user, 
      currentSubscription, 
      targetPlan, 
      effectiveDate, 
      reason, 
      feedback,
      dataRetention
    );

    return createSecureResponse(downgradeResult);

  } catch (error) {
    console.error('Plan downgrade error:', error);
    return createErrorResponse('Failed to process downgrade', 500);
  }
}

async function handleTeamDowngrade(
  user: any, 
  targetPlan: string, 
  effectiveDate: string,
  reason?: string,
  feedback?: string,
  dataRetention?: boolean
) {
  // Only team owner can downgrade team
  if (user.team.ownerId !== user.id) {
    throw new Error('Only team owner can downgrade team plan');
  }

  const teamMemberCount = user.team.members.length;

  // Determine what happens to team members
  const memberTransition = await planTeamMemberTransition(user.team.id, targetPlan);

  // Calculate any refunds or credits
  const refundInfo = await calculateRefund(user.subscriptions[0], effectiveDate);

  // Schedule the downgrade
  const downgradeSchedule = await scheduleTeamDowngrade(
    user,
    targetPlan,
    effectiveDate,
    memberTransition,
    dataRetention
  );

  // Record downgrade reason and feedback
  await recordDowngradeFeedback(user.id, 'TEAM', targetPlan, reason, feedback);

  return {
    success: true,
    type: 'team_downgrade',
    currentPlan: 'TEAM',
    targetPlan,
    effectiveDate: downgradeSchedule.effectiveDate,
    memberTransition,
    refundInfo,
    dataRetention,
    warnings: [
      `${teamMemberCount} team members will be affected`,
      'Team collaboration features will be disabled',
      'Shared team credits will be distributed or forfeited'
    ],
    message: effectiveDate === 'immediate' 
      ? `Team downgraded to ${targetPlan} immediately`
      : `Team downgrade to ${targetPlan} scheduled for end of billing period`
  };
}

async function processIndividualDowngrade(
  user: any,
  currentSubscription: any,
  targetPlan: string,
  effectiveDate: string,
  reason?: string,
  feedback?: string,
  dataRetention?: boolean
) {
  const currentPlan = currentSubscription?.plan || user.plan;

  // Calculate credit adjustment
  const creditAdjustment = calculateCreditAdjustment(currentPlan, targetPlan, user.credits);

  // Calculate any refunds
  const refundInfo = await calculateRefund(currentSubscription, effectiveDate);

  // Check for data that will be lost
  const dataImpact = await assessDataImpact(user.id, currentPlan, targetPlan);

  if (effectiveDate === 'immediate') {
    // Apply downgrade immediately
    await applyImmediateDowngrade(user, currentSubscription, targetPlan, creditAdjustment);
  } else {
    // Schedule downgrade for end of period
    await scheduleEndOfPeriodDowngrade(user, currentSubscription, targetPlan, creditAdjustment);
  }

  // Record downgrade reason and feedback
  await recordDowngradeFeedback(user.id, currentPlan, targetPlan, reason, feedback);

  return {
    success: true,
    type: 'individual_downgrade',
    currentPlan,
    targetPlan,
    effectiveDate: effectiveDate === 'immediate' ? new Date().toISOString() : currentSubscription?.currentPeriodEnd,
    creditAdjustment,
    refundInfo,
    dataImpact,
    dataRetention,
    warnings: generateDowngradeWarnings(currentPlan, targetPlan, dataImpact),
    message: effectiveDate === 'immediate' 
      ? `Plan downgraded to ${targetPlan} immediately`
      : `Plan downgrade to ${targetPlan} scheduled for ${new Date(currentSubscription?.currentPeriodEnd).toLocaleDateString()}`
  };
}

async function planTeamMemberTransition(teamId: string, targetPlan: string) {
  // Get all team members
  const members = await prisma.user.findMany({
    where: { teamId },
    select: { id: true, name: true, email: true, plan: true }
  });

  // Plan what happens to each member
  const transitions = members.map(member => ({
    userId: member.id,
    name: member.name,
    email: member.email,
    currentAccess: 'TEAM',
    newAccess: targetPlan === 'FREE' ? 'FREE' : targetPlan,
    action: targetPlan === 'FREE' ? 'downgrade_to_free' : 'maintain_individual_plan'
  }));

  return {
    memberCount: members.length,
    transitions,
    summary: {
      remaining_in_team: targetPlan !== 'FREE' ? members.length : 0,
      converted_to_individual: targetPlan === 'FREE' ? members.length : 0
    }
  };
}

function calculateCreditAdjustment(currentPlan: string, targetPlan: string, currentCredits: number) {
  const currentPlanCredits = PLAN_CREDITS[currentPlan as keyof typeof PLAN_CREDITS];
  const targetPlanCredits = PLAN_CREDITS[targetPlan as keyof typeof PLAN_CREDITS];

  // If user has more credits than target plan allows, calculate excess
  const excessCredits = Math.max(0, currentCredits - targetPlanCredits);
  
  // Calculate credit value (simplified: $0.001 per credit)
  const creditValue = 0.001;
  const refundValue = excessCredits * creditValue;

  return {
    currentCredits,
    targetPlanCredits,
    excessCredits,
    adjustedCredits: Math.min(currentCredits, targetPlanCredits),
    refundValue: refundValue > 0 ? refundValue : 0,
    action: excessCredits > 0 ? 'refund_excess' : 'maintain_credits'
  };
}

async function calculateRefund(subscription: any, effectiveDate: string) {
  if (!subscription || effectiveDate === 'end_of_period') {
    return {
      eligible: false,
      amount: 0,
      reason: effectiveDate === 'end_of_period' ? 'No refund for end-of-period downgrade' : 'No active subscription'
    };
  }

  // Calculate prorated refund for immediate downgrade
  const now = new Date();
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const totalPeriod = periodEnd.getTime() - new Date(subscription.currentPeriodStart).getTime();
  const remainingPeriod = periodEnd.getTime() - now.getTime();
  
  if (remainingPeriod <= 0) {
    return {
      eligible: false,
      amount: 0,
      reason: 'Billing period already ended'
    };
  }

  // Mock subscription amount (in real implementation, get from Stripe)
  const subscriptionAmount = subscription.billingCycle === 'YEARLY' ? 500 : 50;
  const refundAmount = (subscriptionAmount * remainingPeriod) / totalPeriod;

  return {
    eligible: true,
    amount: Math.round(refundAmount * 100) / 100,
    remainingDays: Math.ceil(remainingPeriod / (24 * 60 * 60 * 1000)),
    reason: 'Prorated refund for immediate downgrade'
  };
}

async function assessDataImpact(userId: string, currentPlan: string, targetPlan: string) {
  // Assess what data/features will be lost in the downgrade
  const dataLimits = {
    FREE: { conversations: 10, images: 5, videos: 0 },
    PRO: { conversations: 100, images: 50, videos: 5 },
    ULTRA: { conversations: 1000, images: 500, videos: 50 },
    TEAM: { conversations: -1, images: -1, videos: -1 } // unlimited
  };

  const currentLimits = dataLimits[currentPlan as keyof typeof dataLimits];
  const targetLimits = dataLimits[targetPlan as keyof typeof dataLimits];

  // Get current data counts
  const [conversationCount, imageCount, videoCount] = await Promise.all([
    prisma.conversation.count({ where: { userId } }),
    prisma.image.count({ where: { userId } }),
    prisma.video.count({ where: { userId } })
  ]);

  const impact = {
    conversations: {
      current: conversationCount,
      allowedAfterDowngrade: targetLimits.conversations === -1 ? conversationCount : targetLimits.conversations,
      willLose: Math.max(0, conversationCount - (targetLimits.conversations === -1 ? conversationCount : targetLimits.conversations))
    },
    images: {
      current: imageCount,
      allowedAfterDowngrade: targetLimits.images === -1 ? imageCount : targetLimits.images,
      willLose: Math.max(0, imageCount - (targetLimits.images === -1 ? imageCount : targetLimits.images))
    },
    videos: {
      current: videoCount,
      allowedAfterDowngrade: targetLimits.videos === -1 ? videoCount : targetLimits.videos,
      willLose: Math.max(0, videoCount - (targetLimits.videos === -1 ? videoCount : targetLimits.videos))
    }
  };

  return impact;
}

async function applyImmediateDowngrade(
  user: any,
  currentSubscription: any,
  targetPlan: string,
  creditAdjustment: any
) {
  // Update user plan
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: targetPlan,
      credits: creditAdjustment.adjustedCredits
    }
  });

  // Cancel current subscription
  if (currentSubscription) {
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: false
      }
    });
  }

  // Create credit transaction for downgrade
  if (creditAdjustment.excessCredits > 0) {
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: -creditAdjustment.excessCredits,
        type: 'ADJUSTMENT',
        description: `Plan downgrade credit adjustment`,
        metadata: {
          planDowngrade: true,
          fromPlan: currentSubscription?.plan || user.plan,
          toPlan: targetPlan,
          refundValue: creditAdjustment.refundValue
        }
      }
    });
  }
}

async function scheduleEndOfPeriodDowngrade(
  user: any,
  currentSubscription: any,
  targetPlan: string,
  creditAdjustment: any
) {
  // Mark subscription for cancellation at period end
  if (currentSubscription) {
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        cancelAtPeriodEnd: true,
        metadata: {
          ...currentSubscription.metadata,
          scheduledDowngrade: {
            targetPlan,
            scheduledDate: new Date().toISOString(),
            creditAdjustment
          }
        }
      }
    });
  }

  // In a real implementation, you would set up a scheduled job to apply the downgrade
  console.log(`Scheduled downgrade for user ${user.id} to ${targetPlan} at period end`);
}

async function scheduleTeamDowngrade(
  user: any,
  targetPlan: string,
  effectiveDate: string,
  memberTransition: any,
  dataRetention?: boolean
) {
  const effectiveDateTime = effectiveDate === 'immediate' 
    ? new Date() 
    : new Date(user.subscriptions[0]?.currentPeriodEnd || Date.now() + 30 * 24 * 60 * 60 * 1000);

  // In a real implementation, this would create scheduled jobs for:
  // 1. Downgrading the team
  // 2. Handling member transitions
  // 3. Data cleanup if retention is false

  return {
    effectiveDate: effectiveDateTime.toISOString(),
    scheduledJobs: [
      'team_plan_downgrade',
      'member_transition',
      dataRetention ? null : 'data_cleanup'
    ].filter(Boolean)
  };
}

async function recordDowngradeFeedback(
  userId: string,
  fromPlan: string,
  toPlan: string,
  reason?: string,
  feedback?: string
) {
  // In a real implementation, this would save to a feedback/analytics system
  console.log('Downgrade feedback recorded:', {
    userId,
    fromPlan,
    toPlan,
    reason,
    feedback,
    timestamp: new Date().toISOString()
  });
}

function generateDowngradeWarnings(currentPlan: string, targetPlan: string, dataImpact: any): string[] {
  const warnings: string[] = [];

  if (dataImpact.conversations.willLose > 0) {
    warnings.push(`${dataImpact.conversations.willLose} conversations will become read-only`);
  }

  if (dataImpact.images.willLose > 0) {
    warnings.push(`${dataImpact.images.willLose} images will be archived`);
  }

  if (dataImpact.videos.willLose > 0) {
    warnings.push(`${dataImpact.videos.willLose} videos will be archived`);
  }

  // Plan-specific warnings
  if (currentPlan === 'TEAM' && targetPlan !== 'TEAM') {
    warnings.push('Team collaboration features will be disabled');
    warnings.push('Team admin controls will be removed');
  }

  if (currentPlan === 'ULTRA' && !['ULTRA', 'TEAM'].includes(targetPlan)) {
    warnings.push('Priority processing will be disabled');
    warnings.push('Video generation access will be limited');
  }

  if (targetPlan === 'FREE') {
    warnings.push('Rate limits will be significantly reduced');
    warnings.push('Access to advanced AI models will be limited');
  }

  return warnings;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(req.url);
    const targetPlan = searchParams.get('targetPlan');

    if (!targetPlan || !['FREE', 'PRO', 'ULTRA'].includes(targetPlan)) {
      return createErrorResponse('Valid target plan is required', 400);
    }

    // Get current user info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    });

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    const currentPlan = user.subscriptions[0]?.plan || user.plan;

    // Calculate downgrade impact preview
    const creditAdjustment = calculateCreditAdjustment(currentPlan, targetPlan, user.credits);
    const dataImpact = await assessDataImpact(user.id, currentPlan, targetPlan);
    const refundInfo = await calculateRefund(user.subscriptions[0], 'immediate');

    return createSecureResponse({
      currentPlan,
      targetPlan,
      canDowngrade: PLAN_HIERARCHY.indexOf(targetPlan) < PLAN_HIERARCHY.indexOf(currentPlan),
      impact: {
        creditAdjustment,
        dataImpact,
        refundInfo,
        warnings: generateDowngradeWarnings(currentPlan, targetPlan, dataImpact)
      },
      options: {
        effectiveDate: ['immediate', 'end_of_period'],
        dataRetention: true
      }
    });

  } catch (error) {
    console.error('Downgrade preview error:', error);
    return createErrorResponse('Failed to get downgrade preview', 500);
  }
}