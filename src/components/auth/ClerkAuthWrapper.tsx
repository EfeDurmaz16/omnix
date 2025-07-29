'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { User, UsageStats } from '@/lib/types';
import { mockApi } from '@/lib/mock-api';
// import { clientCreditManager } from '../../lib/credits/ClientCreditManager';
// Temporary placeholder for deployment
const clientCreditManager = {
  getBalance: () => Promise.resolve(0),
  getCredits: () => Promise.resolve(0),
  deductCredits: () => Promise.resolve({ success: true, newBalance: 0 }),
  addCredits: () => Promise.resolve({ success: true, newBalance: 0 })
};

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
      
      // Get cached plan from localStorage or default to 'free'
      const cachedPlan = localStorage.getItem(`aspendos_plan_${clerkUser.id}`) || 'free';
      
      // ALWAYS get REAL credits from database first
      const defaultCredits = 5000; // Fallback only
      
      // Get current credits from database immediately
      clientCreditManager.getCredits(true).then(realCredits => {
        console.log('🔄 Got REAL credits from database:', realCredits);
        setUser(prev => prev ? { ...prev, credits: realCredits } : prev);
        setUsageStats(prev => prev ? { ...prev, remainingCredits: realCredits } : prev);
        
        // Save to localStorage
        localStorage.setItem(`aspendos_credits_${clerkUser.id}`, realCredits.toString());
      }).catch(() => {
        console.warn('Failed to get real credits, using fallback');
      });
      
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

      console.log('🔄 Setting initial usageStats:', usageData);
      setUser(userData);
      setUsageStats(usageData);
      setLoading(false);

      // Just fetch plan, don't touch credits after initial setup
      fetch('/api/user/plan')
        .then(response => {
          if (response.ok) {
            return response.json();
          }
        })
        .then(planData => {
          if (planData && planData.success && planData.data.plan) {
            const actualPlan = planData.data.plan.toLowerCase();
            console.log('📋 Fetched user plan from API:', actualPlan);
            
            // Update localStorage cache
            localStorage.setItem(`aspendos_plan_${clerkUser.id}`, actualPlan);
            
            // Update user with actual plan
            setUser(prevUser => prevUser ? { ...prevUser, plan: actualPlan } : prevUser);
          }
        })
        .catch(error => {
          console.warn('Failed to fetch plan:', error);
        });
      
      console.log('✅ User initialized:', userData);
    } else if (!clerkUser && user) {
      // User logged out
      console.log('👋 User logged out, clearing data');
      
      setUser(null);
      setUsageStats(null);
      setLoading(false);
    }

    // Set loading to false when Clerk is loaded and we've processed the user state
    if (isLoaded && loading && (user || !clerkUser)) {
      setLoading(false);
    }
  }, [clerkUser, isLoaded, user]);

  // Listen for credit update events separately
  useEffect(() => {
    if (!clerkUser) return;

    const handleCreditsUpdated = (event: CustomEvent) => {
      console.log('💰 Credits updated event received:', event.detail);
      const { amount, type, newBalance } = event.detail;
      
      if (newBalance && typeof newBalance === 'number') {
        // Use exact balance from database
        setUser(prev => prev ? { ...prev, credits: newBalance } : prev);
        setUsageStats(prev => prev ? { ...prev, remainingCredits: newBalance } : prev);
      } else if (amount && typeof amount === 'number') {
        // Add to current balance
        setUser(prev => prev ? { ...prev, credits: prev.credits + amount } : prev);
        setUsageStats(prev => prev ? { ...prev, remainingCredits: prev.remainingCredits + amount } : prev);
      }
    };

    window.addEventListener('creditsUpdated', handleCreditsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('creditsUpdated', handleCreditsUpdated as EventListener);
    };
  }, [clerkUser]);

  const refreshUsageStats = async () => {
    if (user) {
      try {
        console.log('🔄 refreshUsageStats called for user:', user.id);
        const credits = await clientCreditManager.getCredits(true);
        console.log('💰 Refreshed credits:', credits);
        
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
    
    // 1. IMMEDIATELY update navbar (usageStats.remainingCredits)
    setUsageStats(prev => {
      const currentCredits = prev?.remainingCredits || 0;
      const newCredits = currentCredits + amount;
      console.log(`🔄 NAVBAR UPDATE: ${currentCredits} + ${amount} = ${newCredits}`);
      
      // 4. SAVE TO LOCALSTORAGE immediately so it persists
      if (clerkUser?.id) {
        localStorage.setItem(`aspendos_credits_${clerkUser.id}`, newCredits.toString());
        console.log('💾 Saved to localStorage:', newCredits);
      }
      
      return prev ? { ...prev, remainingCredits: newCredits } : prev;
    });
    
    // 2. Also update user credits
    setUser(prev => {
      const newCredits = (prev?.credits || 0) + amount;
      return prev ? { ...prev, credits: newCredits } : prev;
    });
    
    // 3. Save to database for persistence
    clientCreditManager.addCredits(amount, 'Credit purchase', {})
      .then(result => {
        console.log('💾 Database updated:', result.success);
      })
      .catch(error => {
        console.error('Database update failed:', error);
      });
    
    console.log('✅ Credits added to navbar and database:', amount);
  };

  const refreshUserPlan = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Refreshing user plan and credits...');
      
      const [planResponse, newCredits] = await Promise.all([
        fetch('/api/user/plan'),
        clientCreditManager.getCredits(true)
      ]);
      
      if (planResponse.ok) {
        const planData = await planResponse.json();
        if (planData.success && planData.data.plan) {
          const newPlan = planData.data.plan.toLowerCase();
          console.log('📋 Plan:', newPlan, 'Credits:', newCredits);
          
          setUser(prevUser => prevUser ? { 
            ...prevUser, 
            plan: newPlan,
            credits: newCredits
          } : prevUser);
          
          setUsageStats(prevStats => prevStats ? {
            ...prevStats,
            remainingCredits: newCredits
          } : prevStats);
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