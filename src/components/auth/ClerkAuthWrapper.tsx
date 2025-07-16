'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { User, UsageStats } from '@/lib/types';
import { mockApi } from '@/lib/mock-api';
import { clientCreditManager } from '@/lib/credits/ClientCreditManager';

interface AuthContextType {
  user: User | null;
  usageStats: UsageStats | null;
  loading: boolean;
  refreshUsageStats: () => Promise<void>;
  updateCredits: (amount: number) => void;
  addCredits: (amount: number) => void;
  refreshUserPlan: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthWrapper');
  }
  return context;
};

interface AuthWrapperProps {
  children: ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 ClerkAuthWrapper useEffect triggered', { 
      clerkUser: !!clerkUser, 
      isLoaded, 
      currentUser: !!user 
    });
    
    if (!isLoaded) {
      console.log('⏳ Clerk still loading...');
      return; // Wait for Clerk to finish loading
    }

    if (clerkUser && !user) {
      console.log('🔄 Initializing user data from Clerk...');
      
      // Store user ID in sessionStorage for reliable access
      sessionStorage.setItem('clerk-user-id', clerkUser.id);
      console.log('💾 Stored user ID in sessionStorage:', clerkUser.id);
      
      // Initialize user in database
      clientCreditManager.initializeUserCredits(
        clerkUser.emailAddresses[0]?.emailAddress || '',
        'FREE' // Default plan
      ).catch(error => {
        console.warn('Failed to initialize user in database:', error);
      });
      
      // Get credits using client credit manager (after setting initial state)
      setTimeout(() => {
        clientCreditManager.getCredits().then(credits => {
          console.log('💰 Credits from client manager:', credits);
          
          // Update user state with latest credits
          setUser(prev => prev ? { ...prev, credits } : prev);
          setUsageStats(prev => prev ? { ...prev, remainingCredits: credits } : prev);
        }).catch(error => {
          console.warn('Failed to get credits from client manager:', error);
        });
      }, 100);
      
      // Get cached plan from localStorage or default to 'free'
      const cachedPlan = localStorage.getItem(`aspendos_plan_${clerkUser.id}`) || 'free';
      
      // Use plan-based default credits for immediate UI update
      const getDefaultCreditsForPlan = (plan: string): number => {
        const planCredits = {
          'free': 100,
          'pro': 2000,
          'ultra': 5000,
          'enterprise': 10000
        };
        return planCredits[plan as keyof typeof planCredits] || planCredits['free'];
      };
      
      const defaultCredits = getDefaultCreditsForPlan(cachedPlan);
      
      // Create the userData with cached plan
      const userData: User = {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        plan: cachedPlan,
        credits: defaultCredits,
        createdAt: clerkUser.createdAt || new Date(),
        updatedAt: new Date()
      };

      const usageData: UsageStats = {
        totalTokens: 0,
        textTokens: 0,
        imageGenerations: 0,
        videoGenerations: 0,
        remainingCredits: defaultCredits,
        monthlyUsage: 0,
        lastReset: new Date()
      };

      setUser(userData);
      setUsageStats(usageData);
      setLoading(false);

      // Then fetch the actual plan asynchronously and update cache
      fetch('/api/user/plan')
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Plan fetch failed');
        })
        .then(planData => {
          if (planData.success && planData.data.plan) {
            const actualPlan = planData.data.plan.toLowerCase();
            console.log('📋 Fetched user plan from API:', actualPlan);
            
            // Update localStorage cache
            localStorage.setItem(`aspendos_plan_${clerkUser.id}`, actualPlan);
            
            // Update user with actual plan
            setUser(prevUser => prevUser ? { ...prevUser, plan: actualPlan } : prevUser);
          }
        })
        .catch(error => {
          console.warn('Failed to fetch user plan from API:', error);
        });
      
      console.log('✅ User initialized:', userData);
    } else if (!clerkUser && user) {
      // User logged out
      console.log('👋 User logged out, clearing data');
      
      // Clear cached plan data
      localStorage.removeItem(`aspendos_plan_${user.id}`);
      localStorage.removeItem(`aspendos_credits_${user.id}`);
      
      setUser(null);
      setUsageStats(null);
      setLoading(false);
    }

    // Set loading to false when Clerk is loaded and we've processed the user state
    if (isLoaded && loading && (user || !clerkUser)) {
      setLoading(false);
    }
  }, [clerkUser, isLoaded, user]);

  const refreshUsageStats = async () => {
    if (user) {
      try {
        // Get updated credits from client manager
        const credits = await clientCreditManager.getCredits();
        console.log('💰 Refreshed credits from client manager:', credits);
        
        // Update both user and usage stats
        setUser(prev => prev ? { ...prev, credits } : prev);
        setUsageStats(prev => prev ? { ...prev, remainingCredits: credits } : prev);
      } catch (error) {
        console.error('Failed to refresh usage stats:', error);
      }
    }
  };

  const updateCredits = (amount: number) => {
    if (user && usageStats) {
      const newCredits = user.credits - amount;
      const newUser = { ...user, credits: newCredits };
      const newUsageStats = { 
        ...usageStats, 
        remainingCredits: newCredits 
      };
      
      setUser(newUser);
      setUsageStats(newUsageStats);
      
      // Deduct credits from database
      clientCreditManager.deductCredits(amount, 'Manual credit update', {})
        .then(result => {
          if (result.success) {
            console.log('💰 Credits deducted from database:', result.newBalance);
            // Update state with actual database balance
            setUser(prev => prev ? { ...prev, credits: result.newBalance } : prev);
            setUsageStats(prev => prev ? { ...prev, remainingCredits: result.newBalance } : prev);
          }
        })
        .catch(error => {
          console.error('Failed to deduct credits from database:', error);
        });
    }
  };

  const addCredits = (amount: number) => {
    console.log('💰 addCredits called with:', amount);
    console.log('💰 Current state - user:', !!user, 'usageStats:', !!usageStats);
    console.log('💰 Clerk user:', !!clerkUser, 'isLoaded:', isLoaded);
    
    if (!user || !usageStats) {
      console.error('❌ Cannot add credits: user or usageStats is null');
      return;
    }
    
    // Add credits to database
    clientCreditManager.addCredits(amount, 'Manual credit addition', {})
      .then(result => {
        if (result.success) {
          console.log('💰 Credits added to database:', result.newBalance);
          // Update state with actual database balance
          setUser(prev => prev ? { ...prev, credits: result.newBalance } : prev);
          setUsageStats(prev => prev ? { ...prev, remainingCredits: result.newBalance } : prev);
        }
      })
      .catch(error => {
        console.error('Failed to add credits to database:', error);
      });
  };

  const refreshUserPlan = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Refreshing user plan and credits...');
      const planResponse = await fetch('/api/user/plan');
      if (planResponse.ok) {
        const planData = await planResponse.json();
        if (planData.success && planData.data.plan) {
          const newPlan = planData.data.plan.toLowerCase();
          console.log('📋 Updated user plan:', newPlan);
          
          // Also get credits from the client credit manager
          const newCredits = await clientCreditManager.getCredits();
          console.log('💰 Updated user credits:', newCredits);
          
          setUser(prevUser => prevUser ? { 
            ...prevUser, 
            plan: newPlan,
            credits: newCredits
          } : prevUser);
          
          // Also update usage stats
          setUsageStats(prevStats => prevStats ? {
            ...prevStats,
            remainingCredits: newCredits
          } : prevStats);
          
          // Update localStorage
          localStorage.setItem(`aspendos_credits_${user.id}`, newCredits.toString());
          console.log('💾 Updated localStorage with new credits:', newCredits);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user plan and credits:', error);
    }
  };

  const value: AuthContextType = {
    user,
    usageStats,
    loading: loading || !isLoaded,
    refreshUsageStats,
    updateCredits,
    addCredits,
    refreshUserPlan,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 