/**
 * Production-ready Stripe Credit Manager with Prisma Database Integration
 * Handles real payments and database persistence
 */

import { prisma } from '@/lib/db';
import { Plan, TransactionType } from '@prisma/client';
import { currentUser } from '@clerk/nextjs/server';

export interface CreditResult {
  success: boolean;
  credits?: number;
  error?: string;
  newBalance?: number;
  transactionId?: string;
}

export interface StripeWebhookData {
  stripeSessionId?: string;
  stripeCustomerId?: string;
  priceId?: string;
  purchaseType: 'subscription' | 'one-time';
  planName?: string;
  timestamp: string;
}

export class PrismaStripeCreditManager {
  private static instance: PrismaStripeCreditManager;

  static getInstance(): PrismaStripeCreditManager {
    if (!PrismaStripeCreditManager.instance) {
      PrismaStripeCreditManager.instance = new PrismaStripeCreditManager();
    }
    return PrismaStripeCreditManager.instance;
  }

  /**
   * Get user credits from database
   */
  async getCredits(clerkUserId?: string): Promise<number> {
    try {
      let userId = clerkUserId;
      
      if (!userId) {
        const user = await currentUser();
        if (!user) {
          console.warn('No user found for credit lookup');
          return 0;
        }
        userId = user.id;
      }

      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { credits: true }
      });

      return user?.credits || 0;
    } catch (error) {
      console.error('Error getting credits from database:', error);
      return 0;
    }
  }

  /**
   * Add credits with database transaction
   */
  async addCredits(
    amount: number,
    description: string,
    metadata: StripeWebhookData,
    clerkUserId?: string
  ): Promise<CreditResult> {
    try {
      let userId = clerkUserId;
      
      if (!userId) {
        const user = await currentUser();
        if (!user) {
          return { success: false, error: 'No user found' };
        }
        userId = user.id;
      }

      // Use database transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Get current user
        const user = await tx.user.findUnique({
          where: { clerkId: userId! },
          select: { id: true, credits: true, email: true }
        });

        if (!user) {
          throw new Error('User not found in database');
        }

        const newBalance = (user.credits || 0) + amount;

        // Update user credits
        await tx.user.update({
          where: { clerkId: userId! },
          data: { credits: newBalance }
        });

        // Create transaction record
        const transaction = await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount,
            type: TransactionType.PURCHASE,
            description,
            metadata: metadata as any
          }
        });

        return { user, newBalance, transaction };
      });

      console.log(`✅ Credits added successfully:`, {
        userId,
        amount,
        newBalance: result.newBalance,
        transactionId: result.transaction.id
      });

      return {
        success: true,
        credits: amount,
        newBalance: result.newBalance,
        transactionId: result.transaction.id
      };

    } catch (error) {
      console.error('Error adding credits:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Deduct credits with database transaction
   */
  async deductCredits(
    amount: number,
    description: string,
    metadata: any = {},
    clerkUserId?: string
  ): Promise<CreditResult> {
    try {
      let userId = clerkUserId;
      
      if (!userId) {
        const user = await currentUser();
        if (!user) {
          return { success: false, error: 'No user found' };
        }
        userId = user.id;
      }

      // Use database transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Get current user
        const user = await tx.user.findUnique({
          where: { clerkId: userId! },
          select: { id: true, credits: true }
        });

        if (!user) {
          throw new Error('User not found in database');
        }

        if ((user.credits || 0) < amount) {
          throw new Error(`Insufficient credits: ${user.credits} < ${amount}`);
        }

        const newBalance = (user.credits || 0) - amount;

        // Update user credits
        await tx.user.update({
          where: { clerkId: userId! },
          data: { credits: newBalance }
        });

        // Create transaction record
        const transaction = await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: -amount,
            type: TransactionType.USAGE,
            description,
            metadata: metadata as any
          }
        });

        return { user, newBalance, transaction };
      });

      console.log(`💳 Credits deducted successfully:`, {
        userId,
        amount,
        newBalance: result.newBalance,
        transactionId: result.transaction.id
      });

      return {
        success: true,
        credits: amount,
        newBalance: result.newBalance,
        transactionId: result.transaction.id
      };

    } catch (error) {
      console.error('Error deducting credits:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update user plan from Stripe webhook
   */
  async updateUserPlan(
    clerkUserId: string,
    planName: Plan,
    subscriptionData?: {
      stripeCustomerId: string;
      stripeSubscriptionId: string;
      subscriptionStatus: string;
      currentPeriodEnd: string;
    }
  ): Promise<CreditResult> {
    try {
      // Use database transaction
      const result = await prisma.$transaction(async (tx) => {
        // Find or create user
        let user = await tx.user.findUnique({
          where: { clerkId: clerkUserId },
          select: { id: true, credits: true, plan: true }
        });

        if (!user) {
          // Create user if doesn't exist (from Clerk webhook)
          const clerkUser = await currentUser();
          user = await tx.user.create({
            data: {
              clerkId: clerkUserId,
              email: clerkUser?.emailAddresses[0]?.emailAddress || `${clerkUserId}@unknown.com`,
              name: clerkUser?.fullName || 'Unknown User',
              plan: planName,
              credits: this.getPlanCredits(planName)
            },
            select: { id: true, credits: true, plan: true }
          });
        } else {
          // Update existing user
          user = await tx.user.update({
            where: { clerkId: clerkUserId },
            data: {
              plan: planName,
              credits: this.getPlanCredits(planName) // Set plan-appropriate credits
            },
            select: { id: true, credits: true, plan: true }
          });
        }

        // Create or update subscription record if provided
        if (subscriptionData) {
          await tx.subscription.upsert({
            where: { stripeSubscriptionId: subscriptionData.stripeSubscriptionId },
            create: {
              userId: user.id,
              stripeCustomerId: subscriptionData.stripeCustomerId,
              stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
              plan: planName,
              status: subscriptionData.subscriptionStatus as any,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(subscriptionData.currentPeriodEnd)
            },
            update: {
              plan: planName,
              status: subscriptionData.subscriptionStatus as any,
              currentPeriodEnd: new Date(subscriptionData.currentPeriodEnd)
            }
          });
        }

        // Log plan change transaction
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: 0, // Plan changes don't directly affect credits
            type: TransactionType.ADJUSTMENT,
            description: `Plan updated to ${planName}`,
            metadata: {
              oldPlan: user.plan,
              newPlan: planName,
              subscriptionData
            } as any
          }
        });

        return { user };
      });

      console.log(`✅ User plan updated successfully:`, {
        clerkUserId,
        planName,
        newCredits: result.user.credits
      });

      return {
        success: true,
        newBalance: result.user.credits
      };

    } catch (error) {
      console.error('Error updating user plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get credit allowance for plan
   */
  private getPlanCredits(plan: Plan): number {
    switch (plan) {
      case 'FREE':
        return 100;
      case 'PRO':
        return 2000;
      case 'ULTRA':
        return 5000;
      case 'TEAM':
        return 10000;
      default:
        return 100;
    }
  }

  /**
   * Get user transaction history
   */
  async getTransactionHistory(clerkUserId?: string, limit: number = 50): Promise<any[]> {
    try {
      let userId = clerkUserId;
      
      if (!userId) {
        const user = await currentUser();
        if (!user) return [];
        userId = user.id;
      }

      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true }
      });

      if (!user) return [];

      const transactions = await prisma.creditTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          amount: true,
          type: true,
          description: true,
          metadata: true,
          createdAt: true
        }
      });

      return transactions;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Handle Stripe webhook credit purchase
   */
  async handleStripeCreditPurchase(
    clerkUserId: string,
    priceId: string,
    sessionId: string
  ): Promise<CreditResult> {
    // Map Stripe price IDs to credit amounts
    const priceToCreditsMap: Record<string, number> = {
      'price_1Rf0s6GfQ4XRggGY0MDCg4Yw': 100,   // $5 pack
      'price_1Rf0s7GfQ4XRggGYV43Z1A3z': 350,   // $15 pack
      'price_1Rf0s7GfQ4XRggGYamxizg5m': 1000,  // $40 pack
      'price_1Rf0s7GfQ4XRggGYrAsvxiKB': 2500,  // $100 pack
    };

    const creditAmount = priceToCreditsMap[priceId];
    
    if (!creditAmount) {
      return {
        success: false,
        error: `Unknown price ID: ${priceId}`
      };
    }

    return await this.addCredits(
      creditAmount,
      `Stripe credit purchase - ${creditAmount} credits`,
      {
        stripeSessionId: sessionId,
        priceId: priceId,
        purchaseType: 'one-time',
        timestamp: new Date().toISOString()
      },
      clerkUserId
    );
  }

  /**
   * Create or find user from Clerk
   */
  async ensureUserExists(clerkUserId: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      let user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true }
      });

      if (!user) {
        // Try to get user info from Clerk
        const clerkUser = await currentUser();
        
        user = await prisma.user.create({
          data: {
            clerkId: clerkUserId,
            email: clerkUser?.emailAddresses[0]?.emailAddress || `${clerkUserId}@unknown.com`,
            name: clerkUser?.fullName || 'Unknown User',
            plan: 'FREE',
            credits: 100
          },
          select: { id: true }
        });

        console.log(`✅ Created new user in database:`, { clerkUserId, databaseId: user.id });
      }

      return { success: true, userId: user.id };
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const prismaStripeCreditManager = PrismaStripeCreditManager.getInstance();