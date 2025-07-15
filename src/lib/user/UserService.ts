/**
 * User Service
 * Handles user plan and context management
 */

// import { db } from '../db'; // Disabled due to import issues

export interface UserPlan {
  userId: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  createdAt: Date;
  updatedAt: Date;
}

class UserService {
  private planCache = new Map<string, { plan: string; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get user plan with caching
   */
  async getUserPlan(userId: string): Promise<string> {
    // Check cache first
    const cached = this.planCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.plan;
    }

    // Skip API call in server-side context to avoid issues
    // Default to FREE plan for now
    console.log(`🔧 Using default FREE plan for user ${userId}`);
    
    // try {
    //   // Try to get from external API if database not available
    //   const response = await fetch(`/api/user/plan?userId=${userId}`);
    //   if (response.ok) {
    //     const userData = await response.json();
    //     if (userData.plan) {
    //       // Cache the result
    //       this.planCache.set(userId, {
    //         plan: userData.plan,
    //         timestamp: Date.now()
    //       });
    //       return userData.plan;
    //     }
    //   }
    // } catch (error) {
    //   console.warn('Failed to fetch user plan from API:', error);
    // }

    // Default to FREE plan
    const defaultPlan = 'FREE';
    this.planCache.set(userId, {
      plan: defaultPlan,
      timestamp: Date.now()
    });
    
    return defaultPlan;
  }

  /**
   * Update user plan
   */
  async updateUserPlan(userId: string, plan: 'FREE' | 'PRO' | 'ENTERPRISE'): Promise<void> {
    try {
      // Update cache immediately
      this.planCache.set(userId, {
        plan,
        timestamp: Date.now()
      });

      console.log(`✅ Updated user ${userId} plan to ${plan} (cache only)`);
    } catch (error) {
      console.error('Failed to update user plan:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to a feature
   */
  hasFeatureAccess(userPlan: string, feature: string): boolean {
    const planFeatures: Record<string, string[]> = {
      'FREE': ['basic_chat', 'limited_memory'],
      'PRO': ['basic_chat', 'limited_memory', 'advanced_chat', 'extended_memory', 'web_search'],
      'ENTERPRISE': ['basic_chat', 'limited_memory', 'advanced_chat', 'extended_memory', 'web_search', 'unlimited_memory', 'priority_support']
    };

    return planFeatures[userPlan]?.includes(feature) || false;
  }

  /**
   * Clear user plan cache
   */
  clearPlanCache(userId?: string): void {
    if (userId) {
      this.planCache.delete(userId);
    } else {
      this.planCache.clear();
    }
  }
}

export const userService = new UserService();