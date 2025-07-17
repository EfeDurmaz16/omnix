/**
 * Client-side Credit Manager
 * Uses API routes instead of direct database access
 */

export interface CreditOperationResult {
  success: boolean;
  newBalance: number;
  error?: string;
  transactionId?: string;
}

export class ClientCreditManager {
  private static instance: ClientCreditManager;
  
  static getInstance(): ClientCreditManager {
    if (!ClientCreditManager.instance) {
      ClientCreditManager.instance = new ClientCreditManager();
    }
    return ClientCreditManager.instance;
  }

  /**
   * Get current credits via API
   */
  async getCredits(forceRefresh: boolean = false): Promise<number> {
    try {
      const response = await fetch('/api/credits', {
        cache: forceRefresh ? 'no-cache' : 'default',
        headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : {}
      });
      const data = await response.json();
      
      if (data.success) {
        // Dispatch event to notify UI components
        if (forceRefresh) {
          window.dispatchEvent(new CustomEvent('creditsUpdated', {
            detail: { 
              newBalance: data.credits, 
              source: 'api-refresh' 
            }
          }));
        }
        return data.credits;
      } else {
        console.error('Failed to fetch credits:', data.error);
        return this.getDefaultCreditsForPlan('FREE'); // Default fallback
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      return this.getDefaultCreditsForPlan('FREE'); // Default fallback
    }
  }

  /**
   * Force refresh credits from database
   */
  async refreshCredits(): Promise<number> {
    console.log('🔄 Force refreshing credits from database...');
    return await this.getCredits(true);
  }

  /**
   * Get default credits based on user plan
   */
  private getDefaultCreditsForPlan(plan: string): number {
    const planCredits = {
      'FREE': 100,
      'PRO': 2000,
      'ULTRA': 5000,
      'ENTERPRISE': 10000
    };
    
    return planCredits[plan as keyof typeof planCredits] || planCredits['FREE'];
  }

  /**
   * Add credits via API
   */
  async addCredits(
    amount: number,
    description: string = 'Credit addition',
    metadata?: any
  ): Promise<CreditOperationResult> {
    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          description,
          metadata
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Trigger UI update event
        window.dispatchEvent(new CustomEvent('creditsUpdated', {
          detail: { 
            amount, 
            type: 'addition',
            newBalance: result.newBalance
          }
        }));
      }

      return result;
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
   * Deduct credits via API
   */
  async deductCredits(
    amount: number,
    description: string = 'Credit usage',
    metadata?: any
  ): Promise<CreditOperationResult> {
    try {
      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          description,
          metadata
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Trigger UI update event
        window.dispatchEvent(new CustomEvent('creditsUpdated', {
          detail: { 
            amount: -amount, 
            type: 'deduction',
            newBalance: result.newBalance
          }
        }));
      }

      return result;
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
   * Initialize user credits via API
   */
  async initializeUserCredits(
    email: string,
    plan: string = 'FREE'
  ): Promise<number> {
    try {
      const response = await fetch('/api/credits/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          plan
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.credits;
      } else {
        console.error('Failed to initialize credits:', data.error);
        return 100; // Default fallback
      }
    } catch (error) {
      console.error('Error initializing credits:', error);
      return 100; // Default fallback
    }
  }
}

// Export singleton instance
export const clientCreditManager = ClientCreditManager.getInstance();