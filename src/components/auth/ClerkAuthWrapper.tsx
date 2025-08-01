'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { User, UsageStats } from '@/lib/types';
import { mockApi } from '@/lib/mock-api';
// Note: Now using /api/user/data endpoint instead of clientCreditManager

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
      
      // Get REAL user data from Prisma database
      fetch('/api/user/data')
        .then(response => response.json())
        .then(userData => {
          if (userData && !userData.error) {
            console.log('🔄 Got REAL user data from database:', userData);
            setUser(prev => prev ? { 
              ...prev, 
              credits: userData.credits,
              plan: userData.plan,
              email: userData.email,
              name: userData.name
            } : prev);
            setUsageStats(prev => prev ? { 
              ...prev, 
              remainingCredits: userData.credits 
            } : prev);
            
            // Save to localStorage
            localStorage.setItem(`aspendos_credits_${clerkUser.id}`, userData.credits.toString());
            localStorage.setItem(`aspendos_plan_${clerkUser.id}`, userData.plan);
          }
        })
        .catch(error => {
          console.warn('Failed to get real user data:', error);
        });
      
      // Create the userData with cached plan (will be updated by API call above)
      const userData: User = {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        plan: cachedPlan,
        credits: 0, // Will be updated by API call
        createdAt: clerkUser.createdAt || new Date(),
        updatedAt: new Date()
      };

      const usageData: UsageStats = {
        totalTokens: 0,
        textTokens: 0,
        imageGenerations: 0,
        videoGenerations: 0,
        remainingCredits: 0, // Will be updated by API call
        monthlyUsage: 0,
        lastReset: new Date()
      };

      console.log('🔄 Setting initial usageStats:', usageData);
      setUser(userData);
      setUsageStats(usageData);
      setLoading(false);

      // Plan and credits are now fetched together from /api/user/data above
      
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
        const response = await fetch('/api/user/data');
        if (response.ok) {
          const userData = await response.json();
          console.log('💰 Refreshed credits:', userData.credits);
          
          setUser(prev => prev ? { ...prev, credits: userData.credits } : prev);
          setUsageStats(prev => prev ? { ...prev, remainingCredits: userData.credits } : prev);
        }
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
      
      // Update credits in database
      fetch('/api/user/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: newCredits })
      })
        .then(response => response.json())
        .then(result => {
          if (!result.error) {
            console.log('💰 Credits updated in database:', result.credits);
            // Update state with actual database balance
            setUser(prev => prev ? { ...prev, credits: result.credits } : prev);
            setUsageStats(prev => prev ? { ...prev, remainingCredits: result.credits } : prev);
          }
        })
        .catch(error => {
          console.error('Failed to update credits in database:', error);
        });
    }
  };

  const addCredits = (amount: number) => {
    console.log('💰 addCredits called with:', amount);
    
    // Use dedicated credit addition endpoint with atomic transaction
    fetch('/api/user/credits/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount, 
        description: 'Credit purchase via Stripe' 
      })
    })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          console.log('✅ Credits added successfully:', result);
          
          // Update local state with new credits
          setUser(prev => prev ? { ...prev, credits: result.credits } : prev);
          setUsageStats(prev => prev ? { ...prev, remainingCredits: result.credits } : prev);
          
          // Update localStorage
          if (clerkUser?.id) {
            localStorage.setItem(`aspendos_credits_${clerkUser.id}`, result.credits.toString());
          }
        } else {
          throw new Error(result.error || 'Failed to add credits');
        }
      })
      .catch(error => {
        console.error('❌ Failed to add credits:', error);
        // Fallback: refresh user data to get current state
        refreshUsageStats();
      });
  };

  const refreshUserPlan = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Refreshing user plan and credits...');
      
      const response = await fetch('/api/user/data');
      
      if (response.ok) {
        const userData = await response.json();
        if (userData && !userData.error) {
          console.log('📋 Plan:', userData.plan, 'Credits:', userData.credits);
          
          setUser(prevUser => prevUser ? { 
            ...prevUser, 
            plan: userData.plan,
            credits: userData.credits
          } : prevUser);
          
          setUsageStats(prevStats => prevStats ? {
            ...prevStats,
            remainingCredits: userData.credits
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