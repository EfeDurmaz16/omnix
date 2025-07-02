/**
 * Standalone Credit Management System
 * Works independently of auth context for reliability
 */

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  description: string;
  timestamp: Date;
  metadata?: any;
}

export class CreditManager {
  private static instance: CreditManager;
  
  static getInstance(): CreditManager {
    if (!CreditManager.instance) {
      CreditManager.instance = new CreditManager();
    }
    return CreditManager.instance;
  }

  /**
   * Get user ID from any available source
   */
  private async getUserId(): Promise<string | null> {
    console.log('🔍 Attempting to get user ID...');

    // Method 1: Try Clerk window object (multiple approaches)
    if (typeof window !== 'undefined') {
      // Try direct Clerk access
      if ((window as any).Clerk?.user?.id) {
        const userId = (window as any).Clerk.user.id;
        console.log('✅ Found user ID via Clerk.user:', userId);
        return userId;
      }

      // Try Clerk loaded state
      if ((window as any).Clerk?.loaded && (window as any).Clerk?.user?.id) {
        const userId = (window as any).Clerk.user.id;
        console.log('✅ Found user ID via Clerk.loaded:', userId);
        return userId;
      }

      // Wait for Clerk to be ready if it's loading
      let attempts = 0;
      while (attempts < 50) { // Wait up to 5 seconds
        if ((window as any).Clerk?.user?.id) {
          const userId = (window as any).Clerk.user.id;
          console.log('✅ Found user ID after waiting:', userId);
          return userId;
        }
        
        // Check if Clerk exists but user is null (not signed in)
        if ((window as any).Clerk && (window as any).Clerk.user === null) {
          console.log('❌ User not signed in');
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      // Try accessing through React context or other means
      try {
        const clerkScript = document.querySelector('script[data-clerk-js-version]');
        if (clerkScript) {
          console.log('🔍 Clerk script found, waiting for initialization...');
        }
      } catch (error) {
        console.warn('Could not check Clerk script:', error);
      }
    }

    // Method 2: Try from localStorage keys
    if (typeof window !== 'undefined') {
      console.log('🔍 Searching localStorage for existing user ID...');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('aspendos_credits_')) {
          const userId = key.replace('aspendos_credits_', '');
          console.log('✅ Found user ID from localStorage:', userId);
          return userId;
        }
      }
    }

    // Method 3: Try from sessionStorage
    try {
      const sessionUser = sessionStorage.getItem('clerk-user-id');
      if (sessionUser) {
        console.log('✅ Found user ID from sessionStorage:', sessionUser);
        return sessionUser;
      }
    } catch (error) {
      console.warn('Could not access sessionStorage:', error);
    }

    // Method 4: Try from URL parameters
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlUserId = urlParams.get('userId');
      if (urlUserId) {
        console.log('✅ Found user ID from URL:', urlUserId);
        return urlUserId;
      }
    } catch (error) {
      console.warn('Could not check URL parameters:', error);
    }

    // Method 5: Try Clerk from global window with different property names
    if (typeof window !== 'undefined') {
      const possiblePaths = [
        'window.Clerk.user.id',
        'window.__clerk_user.id', 
        'window.clerk?.user?.id',
        'window.__CLERK__.user.id'
      ];

      for (const path of possiblePaths) {
        try {
          const parts = path.split('.');
          let current: any = window;
          for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.includes('?')) {
              const [prop] = part.split('?');
              current = current?.[prop];
            } else {
              current = current?.[part];
            }
            if (!current) break;
          }
          if (current && typeof current === 'string') {
            console.log(`✅ Found user ID via ${path}:`, current);
            return current;
          }
        } catch (error) {
          // Continue to next method
        }
      }
    }

    console.error('❌ Could not find user ID from any source');
    return null;
  }

  /**
   * Get current credits for a user
   */
  async getCredits(userId?: string): Promise<number> {
    const targetUserId = userId || await this.getUserId();
    if (!targetUserId) {
      console.warn('No user ID available for credit lookup');
      return 0;
    }

    try {
      const stored = localStorage.getItem(`aspendos_credits_${targetUserId}`);
      return stored ? parseInt(stored) : 1500; // Default credits
    } catch (error) {
      console.error('Error getting credits:', error);
      return 0;
    }
  }

  /**
   * Add credits to a user account
   */
  async addCredits(amount: number, description: string = 'Credit purchase', userId?: string): Promise<boolean> {
    const targetUserId = userId || await this.getUserId();
    if (!targetUserId) {
      console.error('Cannot add credits: No user ID available');
      return false;
    }

    try {
      const currentCredits = await this.getCredits(targetUserId);
      const newCredits = currentCredits + amount;
      
      // Update localStorage
      localStorage.setItem(`aspendos_credits_${targetUserId}`, newCredits.toString());
      
      // Log transaction
      await this.logTransaction({
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: targetUserId,
        amount,
        type: 'purchase',
        description,
        timestamp: new Date(),
        metadata: { previousBalance: currentCredits, newBalance: newCredits }
      });

      console.log(`✅ Credits added successfully: ${currentCredits} → ${newCredits} (+${amount})`);
      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  /**
   * Deduct credits from user account
   */
  async deductCredits(amount: number, description: string = 'API usage', userId?: string): Promise<boolean> {
    const targetUserId = userId || await this.getUserId();
    if (!targetUserId) {
      console.error('Cannot deduct credits: No user ID available');
      return false;
    }

    try {
      const currentCredits = await this.getCredits(targetUserId);
      
      if (currentCredits < amount) {
        console.warn(`Insufficient credits: ${currentCredits} < ${amount}`);
        return false;
      }

      const newCredits = currentCredits - amount;
      
      // Update localStorage
      localStorage.setItem(`aspendos_credits_${targetUserId}`, newCredits.toString());
      
      // Log transaction
      await this.logTransaction({
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: targetUserId,
        amount: -amount,
        type: 'usage',
        description,
        timestamp: new Date(),
        metadata: { previousBalance: currentCredits, newBalance: newCredits }
      });

      console.log(`💳 Credits deducted: ${currentCredits} → ${newCredits} (-${amount})`);
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  /**
   * Log credit transaction for audit purposes
   */
  private async logTransaction(transaction: CreditTransaction): Promise<void> {
    try {
      const transactionLog = localStorage.getItem(`aspendos_transactions_${transaction.userId}`) || '[]';
      const transactions: CreditTransaction[] = JSON.parse(transactionLog);
      
      transactions.push(transaction);
      
      // Keep only last 100 transactions to prevent localStorage bloat
      if (transactions.length > 100) {
        transactions.splice(0, transactions.length - 100);
      }
      
      localStorage.setItem(`aspendos_transactions_${transaction.userId}`, JSON.stringify(transactions));
    } catch (error) {
      console.warn('Could not log transaction:', error);
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId?: string): Promise<CreditTransaction[]> {
    const targetUserId = userId || await this.getUserId();
    if (!targetUserId) return [];

    try {
      const transactionLog = localStorage.getItem(`aspendos_transactions_${targetUserId}`) || '[]';
      return JSON.parse(transactionLog);
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Handle credit purchase from Stripe success
   */
  async handleStripePurchase(creditAmount: number): Promise<boolean> {
    console.log('💳 Processing Stripe credit purchase:', creditAmount);
    
    const success = await this.addCredits(
      creditAmount, 
      `Stripe credit purchase - ${creditAmount} credits`
    );

    if (success) {
      // Trigger a custom event for UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('creditsUpdated', { 
          detail: { amount: creditAmount, type: 'purchase' } 
        }));
      }
    }

    return success;
  }

  /**
   * Emergency credit restoration (for debugging/support)
   */
  async emergencyRestoreCredits(userId: string, amount: number): Promise<boolean> {
    console.warn('🚨 Emergency credit restoration:', { userId, amount });
    return await this.addCredits(amount, `Emergency credit restoration`, userId);
  }
}

// Export singleton instance
export const creditManager = CreditManager.getInstance();