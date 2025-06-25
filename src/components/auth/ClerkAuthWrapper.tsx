'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { User, UsageStats } from '@/lib/types';
import { mockApi } from '@/lib/mock-api';

interface AuthContextType {
  user: User | null;
  usageStats: UsageStats | null;
  loading: boolean;
  refreshUsageStats: () => Promise<void>;
  updateCredits: (amount: number) => void;
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
    if (isLoaded) {
      if (clerkUser) {
        // Convert Clerk user to our User type
        const omnixUser: User = {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          name: clerkUser.fullName || clerkUser.firstName || 'User',
          avatar: clerkUser.imageUrl,
          plan: 'pro', // Default plan - this would come from your database
          credits: 1500, // Default credits - this would come from your database
          createdAt: new Date(clerkUser.createdAt || Date.now()),
          updatedAt: new Date(),
        };
        
        setUser(omnixUser);
        
        // Load usage stats
        mockApi.getUsageStats().then(setUsageStats);
      } else {
        setUser(null);
        setUsageStats(null);
      }
      setLoading(false);
    }
  }, [clerkUser, isLoaded]);

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
      setUser({ ...user, credits: user.credits - amount });
      setUsageStats({ 
        ...usageStats, 
        remainingCredits: usageStats.remainingCredits - amount 
      });
    }
  };

  const value: AuthContextType = {
    user,
    usageStats,
    loading: loading || !isLoaded,
    refreshUsageStats,
    updateCredits,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 