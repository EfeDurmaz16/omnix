import { prisma } from '@/lib/db';
import { TransactionType } from '@prisma/client';

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description: string;
  metadata?: any;
  createdAt: Date;
}

export interface CreditDeductionResult {
  success: boolean;
  newBalance: number;
  transactionId?: string;
  error?: string;
}

export class PrismaCreditManager {
  private static instance: PrismaCreditManager;

  static getInstance(): PrismaCreditManager {
    if (!PrismaCreditManager.instance) {
      PrismaCreditManager.instance = new PrismaCreditManager();
    }
    return PrismaCreditManager.instance;
  }

  /**
   * Get user's current credit balance
   */
  async getCredits(userId: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { credits: true, plan: true }
      });

      if (!user) {
        console.log('User not found, creating new user with default credits');
        // Create user with default credits if not exists
        const defaultCredits = this.getDefaultCreditsForPlan('FREE');
        const newUser = await prisma.user.create({
          data: {
            clerkId: userId,
            email: `${userId}@temp.com`, // Temporary email, should be updated via webhook
            credits: defaultCredits,
            plan: 'FREE'
          },
          select: { credits: true }
        });
        return newUser.credits;
      }

      return user.credits;
    } catch (error) {
      console.error('Error getting credits from database:', error);
      // Return default credits if database is unavailable
      return this.getDefaultCreditsForPlan('FREE');
    }
  }

  /**
   * Get default credits based on user plan
   */
  private getDefaultCreditsForPlan(plan: string): number {
    const planCredits = {
      'FREE': 100,        // 100 credits = ~33-100 chats (enough for free tier)
      'PRO': 2000,        // 2000 credits = ~500-2000 chats (aligns with $20/month value)
      'ULTRA': 5000,      // 5000 credits = ~1250-5000 chats (premium tier)
      'ENTERPRISE': 10000 // 10000 credits = ~2500-10000 chats (enterprise tier)
    };
    
    return planCredits[plan as keyof typeof planCredits] || planCredits['FREE'];
  }

  /**
   * Add credits to user's account
   */
  async addCredits(
    amount: number,
    description: string,
    metadata?: any,
    userId?: string
  ): Promise<CreditDeductionResult> {
    if (!userId) {
      return { success: false, newBalance: 0, error: 'User ID is required' };
    }

    if (amount <= 0) {
      return { success: false, newBalance: 0, error: 'Amount must be positive' };
    }

    try {
      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Get current user
        const user = await tx.user.findUnique({
          where: { clerkId: userId },
          select: { id: true, credits: true }
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Update user credits
        const updatedUser = await tx.user.update({
          where: { clerkId: userId },
          data: { credits: { increment: amount } },
          select: { credits: true }
        });

        // Create transaction record
        const transaction = await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: amount,
            type: 'PURCHASE',
            description,
            metadata
          }
        });

        return {
          newBalance: updatedUser.credits,
          transactionId: transaction.id
        };
      });

      console.log(`✅ Credits added: +${amount} (new balance: ${result.newBalance})`);
      return {
        success: true,
        newBalance: result.newBalance,
        transactionId: result.transactionId
      };
    } catch (error) {
      console.error('Error adding credits:', error);
      return {
        success: false,
        newBalance: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Deduct credits from user's account
   */
  async deductCredits(
    amount: number,
    description: string,
    metadata?: any,
    userId?: string
  ): Promise<CreditDeductionResult> {
    if (!userId) {
      return { success: false, newBalance: 0, error: 'User ID is required' };
    }

    if (amount <= 0) {
      return { success: false, newBalance: 0, error: 'Amount must be positive' };
    }

    try {
      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Get current user
        const user = await tx.user.findUnique({
          where: { clerkId: userId },
          select: { id: true, credits: true }
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Check if user has sufficient credits
        if (user.credits < amount) {
          throw new Error(`Insufficient credits: ${user.credits} available, ${amount} required`);
        }

        // Update user credits
        const updatedUser = await tx.user.update({
          where: { clerkId: userId },
          data: { credits: { decrement: amount } },
          select: { credits: true }
        });

        // Create transaction record
        const transaction = await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: -amount, // Negative for deduction
            type: 'USAGE',
            description,
            metadata
          }
        });

        return {
          newBalance: updatedUser.credits,
          transactionId: transaction.id
        };
      });

      console.log(`✅ Credits deducted: -${amount} (new balance: ${result.newBalance})`);
      return {
        success: true,
        newBalance: result.newBalance,
        transactionId: result.transactionId
      };
    } catch (error) {
      console.error('Error deducting credits:', error);
      return {
        success: false,
        newBalance: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<CreditTransaction[]> {
    try {
      // First get the user's internal ID
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true }
      });

      if (!user) {
        return [];
      }

      const transactions = await prisma.creditTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return transactions.map(tx => ({
        id: tx.id,
        userId: tx.userId,
        amount: tx.amount,
        type: tx.type,
        description: tx.description,
        metadata: tx.metadata,
        createdAt: tx.createdAt
      }));
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Get user info for credit operations
   */
  async getUserInfo(userId: string): Promise<{ id: string; credits: number; plan: string } | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true, credits: true, plan: true }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        credits: user.credits,
        plan: user.plan
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  /**
   * Initialize or update user credits based on their plan
   */
  async initializeUserCredits(userId: string, email: string, plan: string = 'FREE'): Promise<number> {
    try {
      const defaultCredits = this.getDefaultCreditsForPlan(plan);
      
      const user = await prisma.user.upsert({
        where: { clerkId: userId },
        update: {
          // Don't update plan if user already exists - preserve existing plan
          email: email
        },
        create: {
          clerkId: userId,
          email,
          plan: plan as any,
          credits: defaultCredits
        },
        select: { credits: true }
      });

      return user.credits;
    } catch (error) {
      console.error('Error initializing user credits:', error);
      return this.getDefaultCreditsForPlan(plan);
    }
  }

  /**
   * Update user plan and potentially add credits
   */
  async updateUserPlan(userId: string, newPlan: string): Promise<{ success: boolean; newCredits: number }> {
    try {
      const currentUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { plan: true, credits: true }
      });

      if (!currentUser) {
        return { success: false, newCredits: 0 };
      }

      // If upgrading plan, add credits based on new plan
      const newPlanCredits = this.getDefaultCreditsForPlan(newPlan);
      let creditsToAdd = 0;

      // Add credits when upgrading from a lower plan
      if (currentUser.plan === 'FREE' && newPlan !== 'FREE') {
        creditsToAdd = newPlanCredits;
      } else if (currentUser.plan === 'PRO' && (newPlan === 'ULTRA' || newPlan === 'ENTERPRISE')) {
        creditsToAdd = newPlanCredits - this.getDefaultCreditsForPlan('PRO');
      } else if (currentUser.plan === 'ULTRA' && newPlan === 'ENTERPRISE') {
        creditsToAdd = newPlanCredits - this.getDefaultCreditsForPlan('ULTRA');
      }

      const updatedUser = await prisma.user.update({
        where: { clerkId: userId },
        data: {
          plan: newPlan as any,
          credits: creditsToAdd > 0 ? { increment: creditsToAdd } : undefined
        },
        select: { credits: true }
      });

      if (creditsToAdd > 0) {
        // Log the credit addition
        await this.addCredits(creditsToAdd, `Plan upgrade to ${newPlan}`, { planUpgrade: true }, userId);
      }

      return { success: true, newCredits: updatedUser.credits };
    } catch (error) {
      console.error('Error updating user plan:', error);
      return { success: false, newCredits: 0 };
    }
  }
}

// Export singleton instance
export const prismaCreditManager = PrismaCreditManager.getInstance();