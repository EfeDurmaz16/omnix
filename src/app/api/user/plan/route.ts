import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Plan } from '@prisma/client';

// In-memory store for user plans (fallback only)
const userPlans = new Map<string, {
  plan: 'FREE' | 'PRO' | 'ULTRA' | 'ENTERPRISE';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: Date;
  updatedAt: Date;
}>();

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Try to get user from database first
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId }
      });

      if (dbUser) {
        console.log('📋 Retrieved user plan from DATABASE:', { userId, plan: dbUser.plan });
        
        return NextResponse.json({
          success: true,
          data: {
            plan: dbUser.plan,
            subscriptionStatus: 'active', // You might want to add this to the DB schema
            currentPeriodEnd: undefined, // You might want to add this to the DB schema
            updatedAt: dbUser.updatedAt
          }
        });
      } else {
        console.log('👤 User not found in database, creating with FREE plan');
        
        // Create user in database with FREE plan
        const newUser = await prisma.user.create({
          data: {
            clerkId: userId,
            email: 'unknown@example.com', // You'll want to get this from Clerk
            plan: Plan.FREE
          }
        });

        return NextResponse.json({
          success: true,
          data: {
            plan: newUser.plan,
            subscriptionStatus: undefined,
            currentPeriodEnd: undefined,
            updatedAt: newUser.updatedAt
          }
        });
      }

    } catch (dbError) {
      console.error('❌ Database error, falling back to in-memory store:', dbError);
      
      // Fallback to in-memory store
      const userPlan = userPlans.get(userId) || {
        plan: 'FREE' as const,
        updatedAt: new Date()
      };

      console.log('📋 Retrieved user plan from MEMORY:', { userId, plan: userPlan.plan });

      return NextResponse.json({
        success: true,
        data: {
          plan: userPlan.plan,
          subscriptionStatus: userPlan.subscriptionStatus,
          currentPeriodEnd: userPlan.currentPeriodEnd,
          updatedAt: userPlan.updatedAt
        }
      });
    }

  } catch (error) {
    console.error('❌ Get user plan error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get user plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for webhook auth header first
    const webhookUserId = request.headers.get('x-clerk-user-id');
    let userId = webhookUserId;

    // If no webhook header, use regular auth
    if (!webhookUserId) {
      const auth_result = await auth();
      userId = auth_result.userId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      plan, 
      stripeCustomerId, 
      stripeSubscriptionId, 
      subscriptionStatus,
      currentPeriodEnd 
    } = body;

    // Validate plan
    const validPlans = ['FREE', 'PRO', 'ULTRA', 'ENTERPRISE'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` }, 
        { status: 400 }
      );
    }

    try {
      // Try to update user in database first
      const updatedUser = await prisma.user.upsert({
        where: { clerkId: userId },
        update: {
          plan: plan as Plan
        },
        create: {
          clerkId: userId,
          email: 'unknown@example.com', // You'll want to get this from Clerk
          plan: plan as Plan
        }
      });

      console.log('✅ Updated user plan in DATABASE:', { userId, plan, updatedAt: updatedUser.updatedAt });

      return NextResponse.json({
        success: true,
        data: {
          plan: updatedUser.plan,
          subscriptionStatus: subscriptionStatus,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : undefined,
          updatedAt: updatedUser.updatedAt
        }
      });

    } catch (dbError) {
      console.error('❌ Database error, falling back to in-memory store:', dbError);
      
      // Fallback to in-memory store
      const userPlan = {
        plan: plan as 'FREE' | 'PRO' | 'ULTRA' | 'ENTERPRISE',
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : undefined,
        updatedAt: new Date()
      };

      userPlans.set(userId, userPlan);

      console.log('✅ Updated user plan in MEMORY:', { userId, plan, subscriptionStatus });

      return NextResponse.json({
        success: true,
        data: {
          plan: userPlan.plan,
          subscriptionStatus: userPlan.subscriptionStatus,
          currentPeriodEnd: userPlan.currentPeriodEnd,
          updatedAt: userPlan.updatedAt
        }
      });
    }

  } catch (error) {
    console.error('❌ Update user plan error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export the userPlans Map for access from webhook
export { userPlans };