/**
 * Enhanced Credit Management System
 * Works with both localStorage (for speed) and database (for persistence)
 */

import { databaseService } from '../database/DatabaseService';

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'adjustment';
  description: string;
  timestamp: Date;
  metadata?: any;
}

export interface CreditOperationResult {
  success: boolean;
  newBalance: number;
  error?: string;
  transaction?: CreditTransaction;
}

export class EnhancedCreditManager {
  private static instance: EnhancedCreditManager;
  
  static getInstance(): EnhancedCreditManager {
    if (!EnhancedCreditManager.instance) {
      EnhancedCreditManager.instance = new EnhancedCreditManager();
    }
    return EnhancedCreditManager.instance;
  }

  /**
   * Get user ID from multiple sources with enhanced detection
   */
  private async getUserId(): Promise<string | null> {
    console.log('🔍 Enhanced: Attempting to get user ID...');

    if (typeof window === 'undefined') {
      console.log('❌ Server-side context, no user ID available');
      return null;
    }

    // Method 1: Try Clerk window object with retries
    for (let attempt = 0; attempt < 20; attempt++) {
      if ((window as any).Clerk?.user?.id) {
        const userId = (window as any).Clerk.user.id;
        console.log('✅ Found user ID via Clerk:', userId);
        
        // Store in sessionStorage for faster future access
        sessionStorage.setItem('aspendos-user-id', userId);
        return userId;
      }
      
      if (attempt < 19) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Method 2: Try sessionStorage
    const sessionUserId = sessionStorage.getItem('aspendos-user-id');
    if (sessionUserId) {
      console.log('✅ Found user ID from sessionStorage:', sessionUserId);
      return sessionUserId;
    }

    // Method 3: Try Clerk via different property paths
    const clerkPaths = [
      '(window as any).Clerk?.user?.id',
      '(window as any).__clerk_user?.id',
      '(window as any).clerk?.user?.id'
    ];

    for (const path of clerkPaths) {
      try {
        const userId = eval(path);
        if (userId && typeof userId === 'string') {
          console.log(`✅ Found user ID via ${path}:`, userId);
          sessionStorage.setItem('aspendos-user-id', userId);
          return userId;
        }
      } catch (error) {
        // Continue to next method
      }
    }

    // Method 4: Try from localStorage keys (client-side only)
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('aspendos_credits_')) {
          const userId = key.replace('aspendos_credits_', '');
          console.log('✅ Found user ID from localStorage:', userId);
          sessionStorage.setItem('aspendos-user-id', userId);
          return userId;
        }
      }
    }

    // Method 5: Try URL parameters
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlUserId = urlParams.get('userId') || urlParams.get('user_id');
      if (urlUserId) {
        console.log('✅ Found user ID from URL:', urlUserId);
        sessionStorage.setItem('aspendos-user-id', urlUserId);
        return urlUserId;
      }
    } catch (error) {
      console.warn('Could not check URL parameters:', error);
    }

    console.error('❌ Could not find user ID from any source');
    return null;
  }

  /**
   * Get current credits with database sync
   */
  async getCredits(userId?: string): Promise<number> {
    const targetUserId = userId || await this.getUserId();
    if (!targetUserId) {
      console.warn('No user ID available for credit lookup');
      return 0;
    }

    try {
      // Try database first for most up-to-date info
      const dbUser = await databaseService.getUserByClerkId(targetUserId);
      if (dbUser) {
        // Update localStorage with database value (client-side only)
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(`aspendos_credits_${targetUserId}`, dbUser.credits.toString());
        }
        console.log('✅ Credits from database:', dbUser.credits);
        return dbUser.credits;
      }
    } catch (error) {
      console.warn('Failed to get credits from database, falling back to localStorage:', error);
    }

    // Fallback to localStorage (only available on client-side)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(`aspendos_credits_${targetUserId}`);
        const credits = stored ? parseInt(stored) : 1500;
        console.log('📱 Credits from localStorage:', credits);
        return credits;
      } else {
        console.log('localStorage not available (server-side), using default credits');
        return 1500; // Default credits for server-side operations
      }
    } catch (error) {
      console.error('Error getting credits from localStorage:', error);
      return 1500; // Default credits instead of 0
    }
  }

  /**
   * Add credits with database persistence
   */
  async addCredits(
    amount: number,
    description: string = 'Credit purchase',
    metadata?: any,
    userId?: string
  ): Promise<CreditOperationResult> {
    const targetUserId = userId || await this.getUserId();
    if (!targetUserId) {
      return {
        success: false,
        newBalance: 0,
        error: 'No user ID available for credit addition'
      };
    }

    console.log('💰 Adding credits:', { amount, description, userId: targetUserId });

    try {
      // Get current credits
      const currentCredits = await this.getCredits(targetUserId);
      const newCredits = currentCredits + amount;

      // Create transaction record
      const transaction: CreditTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: targetUserId,
        amount,
        type: 'purchase',
        description,
        timestamp: new Date(),
        metadata
      };

      // Update database first (if available)
      try {
        await databaseService.addCredits(targetUserId, amount, description, metadata);
        console.log('✅ Credits added to database');
      } catch (dbError) {
        console.warn('Failed to add credits to database, continuing with localStorage:', dbError);
      }

      // Update localStorage (immediate consistency, client-side only)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`aspendos_credits_${targetUserId}`, newCredits.toString());
      }
      
      // Store transaction in localStorage
      await this.logTransaction(transaction);

      console.log(`✅ Credits added successfully: ${currentCredits} → ${newCredits} (+${amount})`);
      
      return {
        success: true,
        newBalance: newCredits,
        transaction
      };
    } catch (error: any) {
      console.error('Error adding credits:', error);
      return {
        success: false,
        newBalance: await this.getCredits(targetUserId),
        error: error.message
      };
    }
  }

  /**
   * Deduct credits with database persistence
   */
  async deductCredits(
    amount: number,
    description: string = 'API usage',
    metadata?: any,
    userId?: string
  ): Promise<CreditOperationResult> {
    const targetUserId = userId || await this.getUserId();
    if (!targetUserId) {
      return {
        success: false,
        newBalance: 0,
        error: 'No user ID available for credit deduction'
      };
    }

    try {
      const currentCredits = await this.getCredits(targetUserId);
      
      if (currentCredits < amount) {
        return {
          success: false,
          newBalance: currentCredits,
          error: `Insufficient credits: ${currentCredits} < ${amount}`
        };
      }

      const newCredits = currentCredits - amount;

      // Create transaction record
      const transaction: CreditTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: targetUserId,
        amount: -amount,
        type: 'usage',
        description,
        timestamp: new Date(),
        metadata
      };

      // Update database first (if available)
      try {
        await databaseService.deductCredits(targetUserId, amount, description, metadata);
        console.log('✅ Credits deducted from database');
      } catch (dbError) {
        console.warn('Failed to deduct credits from database, continuing with localStorage:', dbError);
      }

      // Update localStorage (immediate consistency, client-side only)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`aspendos_credits_${targetUserId}`, newCredits.toString());
      }
      
      // Store transaction
      await this.logTransaction(transaction);

      console.log(`💳 Credits deducted: ${currentCredits} → ${newCredits} (-${amount})`);
      
      return {
        success: true,
        newBalance: newCredits,
        transaction
      };
    } catch (error: any) {
      console.error('Error deducting credits:', error);
      return {
        success: false,
        newBalance: await this.getCredits(targetUserId),
        error: error.message
      };
    }
  }

  /**
   * Handle Stripe purchase with enhanced reliability
   */
  async handleStripePurchase(creditAmount: number, metadata?: any): Promise<boolean> {
    console.log('💳 Processing Stripe credit purchase:', creditAmount);
    
    const result = await this.addCredits(
      creditAmount,
      `Stripe credit purchase - ${creditAmount} credits`,
      {
        source: 'stripe',
        timestamp: new Date().toISOString(),
        ...metadata
      }
    );

    if (result.success) {
      // Trigger UI update events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('creditsUpdated', {
          detail: { 
            amount: creditAmount, 
            type: 'purchase',
            newBalance: result.newBalance
          }
        }));
      }

      // Sync to database in background
      this.syncToDatabase().catch(error => {
        console.warn('Background database sync failed:', error);
      });

      return true;
    }

    console.error('❌ Failed to process Stripe purchase:', result.error);
    return false;
  }

  /**
   * Sync localStorage data to database
   */
  async syncToDatabase(): Promise<boolean> {
    const userId = await this.getUserId();
    if (!userId) return false;

    try {
      await databaseService.syncLocalStorageToDatabase(userId);
      console.log('✅ Successfully synced localStorage to database');
      return true;
    } catch (error) {
      console.error('❌ Failed to sync to database:', error);
      return false;
    }
  }

  /**
   * Log transaction to localStorage
   */
  private async logTransaction(transaction: CreditTransaction): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `aspendos_transactions_${transaction.userId}`;
        const existingTransactions = localStorage.getItem(key) || '[]';
        const transactions: CreditTransaction[] = JSON.parse(existingTransactions);
        
        transactions.push(transaction);
        
        // Keep only last 200 transactions to prevent storage bloat
        if (transactions.length > 200) {
          transactions.splice(0, transactions.length - 200);
        }
        
        localStorage.setItem(key, JSON.stringify(transactions));
      }
    } catch (error) {
      console.warn('Could not log transaction to localStorage:', error);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId?: string): Promise<CreditTransaction[]> {
    const targetUserId = userId || await this.getUserId();
    if (!targetUserId) return [];

    try {
      // Try database first
      const dbTransactions = await databaseService.getCreditTransactions(targetUserId);
      if (dbTransactions.length > 0) {
        return dbTransactions.map(tx => ({
          id: tx.id,
          userId: tx.userId,
          amount: tx.amount,
          type: tx.type.toLowerCase() as any,
          description: tx.description,
          timestamp: tx.createdAt,
          metadata: tx.metadata
        }));
      }
    } catch (error) {
      console.warn('Failed to get transactions from database:', error);
    }

    // Fallback to localStorage (client-side only)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `aspendos_transactions_${targetUserId}`;
        const stored = localStorage.getItem(key) || '[]';
        return JSON.parse(stored);
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Initialize user in database if not exists
   */
  async initializeUser(userData: {
    clerkId: string;
    email: string;
    name?: string;
    avatar?: string;
  }): Promise<boolean> {
    try {
      await databaseService.upsertUser(userData);
      
      // Store user ID for faster access
      sessionStorage.setItem('aspendos-user-id', userData.clerkId);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize user in database:', error);
      return false;
    }
  }

  /**
   * Emergency credit restoration (for debugging/support)
   */
  async emergencyRestoreCredits(userId: string, amount: number): Promise<boolean> {
    console.warn('🚨 Emergency credit restoration:', { userId, amount });
    
    const result = await this.addCredits(
      amount,
      `Emergency credit restoration`,
      { source: 'emergency_restore' },
      userId
    );

    return result.success;
  }
}

// Export singleton instance
export const enhancedCreditManager = EnhancedCreditManager.getInstance();