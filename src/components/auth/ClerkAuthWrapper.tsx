'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { User, UsageStats } from '@/lib/types';
import { mockApi } from '@/lib/mock-api';
import { enhancedCreditManager } from '@/lib/credits/EnhancedCreditManager';

interface AuthContextType {
  user: User | null;
  usageStats: UsageStats | null;
  loading: boolean;
  refreshUsageStats: () => Promise<void>;
  updateCredits: (amount: number) => void;
  addCredits: (amount: number) => void;
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
      enhancedCreditManager.initializeUser({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        avatar: clerkUser.imageUrl
      }).catch(error => {
        console.warn('Failed to initialize user in database:', error);
      });
      
      // Get credits using enhanced credit manager
      enhancedCreditManager.getCredits(clerkUser.id).then(credits => {
        console.log('💰 Credits from enhanced manager:', credits);
        
        // Update user state with latest credits
        setUser(prev => prev ? { ...prev, credits } : prev);
        setUsageStats(prev => prev ? { ...prev, remainingCredits: credits } : prev);
      }).catch(error => {
        console.warn('Failed to get credits from enhanced manager:', error);
      });
      
      // Use fallback credits for immediate UI update
      const savedCredits = localStorage.getItem(`aspendos_credits_${clerkUser.id}`);
      const credits = savedCredits ? parseInt(savedCredits) : 1500;
      
      console.log('💰 Fallback credits from localStorage:', credits);
      
      const userData: User = {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        plan: 'free',
        credits: credits,
        createdAt: clerkUser.createdAt || new Date(),
        updatedAt: new Date()
      };

      const usageData: UsageStats = {
        totalTokens: 0,
        textTokens: 0,
        imageGenerations: 0,
        videoGenerations: 0,
        remainingCredits: credits,
        monthlyUsage: 0,
        lastReset: new Date()
      };

      setUser(userData);
      setUsageStats(usageData);
      
      console.log('✅ User initialized:', userData);
    } else if (!clerkUser && user) {
      // User logged out
      console.log('👋 User logged out, clearing data');
      setUser(null);
      setUsageStats(null);
    }
  }, [clerkUser, isLoaded, user]);

  const refreshUsageStats = async () => {
    if (user) {
      try {
        const stats = await mockApi.getUsageStats();
        setUsageStats(stats);
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
      
      // Persist to localStorage
      localStorage.setItem(`aspendos_credits_${user.id}`, newCredits.toString());
      console.log('💾 Saved credits to localStorage:', newCredits);
    }
  };

  const addCredits = (amount: number) => {
    console.log('💰 addCredits called with:', amount);
    console.log('💰 Current state - user:', !!user, 'usageStats:', !!usageStats);
    console.log('💰 Clerk user:', !!clerkUser, 'isLoaded:', isLoaded);
    
    if (!user || !usageStats) {
      console.error('❌ Cannot add credits: user or usageStats is null', { 
        user: !!user, 
        usageStats: !!usageStats,
        clerkUser: !!clerkUser,
        isLoaded,
        userObj: user,
        usageStatsObj: usageStats 
      });
      
      // If clerkUser exists but our user state doesn't, try to initialize it
      if (clerkUser && isLoaded && !user) {
        console.log('🔄 Initializing user state for addCredits...');
        
        // Get saved credits from localStorage
        const savedCredits = localStorage.getItem(`aspendos_credits_${clerkUser.id}`);
        const credits = savedCredits ? parseInt(savedCredits) : 1500;
        
        const userData: User = {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          name: clerkUser.fullName || clerkUser.firstName || 'User',
          plan: 'free',
          credits: credits + amount, // Add the new credits immediately
          createdAt: clerkUser.createdAt || new Date(),
          updatedAt: new Date()
        };

        const usageData: UsageStats = {
          totalTokens: 0,
          textTokens: 0,
          imageGenerations: 0,
          videoGenerations: 0,
          remainingCredits: credits + amount,
          monthlyUsage: 0,
          lastReset: new Date()
        };

        setUser(userData);
        setUsageStats(usageData);
        
        // Save the new credit amount
        localStorage.setItem(`aspendos_credits_${clerkUser.id}`, (credits + amount).toString());
        
        console.log('✅ User initialized with added credits:', userData);
        return;
      }
      
      throw new Error('Cannot add credits: Auth context not ready');
    }

    console.log('💰 Current credits:', user.credits, 'remainingCredits:', usageStats.remainingCredits);
    
    const newCredits = user.credits + amount;
    const newUser = { ...user, credits: newCredits };
    const newUsageStats = { 
      ...usageStats, 
      remainingCredits: newCredits
    };
    
    setUser(newUser);
    setUsageStats(newUsageStats);
    
    // Persist to localStorage
    localStorage.setItem(`aspendos_credits_${user.id}`, newCredits.toString());
    
    console.log('💰 New credits:', newCredits, 'saved to localStorage');
  };

  const value: AuthContextType = {
    user,
    usageStats,
    loading: loading || !isLoaded,
    refreshUsageStats,
    updateCredits,
    addCredits,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 