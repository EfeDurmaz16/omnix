'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, UsageStats } from '@/lib/types';
import { mockApi } from '@/lib/mock-api';

interface AuthContextType {
  user: User | null;
  usageStats: UsageStats | null;
  userPlan: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUsageStats: () => Promise<void>;
  updateCredits: (amount: number) => void;
  updatePlan: (newPlan: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [userPlan, setUserPlan] = useState<string>('pro'); // Default to pro as user mentioned
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (in a real app, check localStorage/cookies)
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('omnix-token');
        const savedPlan = localStorage.getItem('userPlan') || 'pro';
        
        console.log('🔑 Initializing auth with plan:', savedPlan);
        setUserPlan(savedPlan);
        
        if (token) {
          const currentUser = await mockApi.getCurrentUser();
          const stats = await mockApi.getUsageStats();
          setUser(currentUser);
          setUsageStats(stats);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        localStorage.removeItem('omnix-token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { user: loggedInUser, token } = await mockApi.login(email, password);
      const stats = await mockApi.getUsageStats();
      
      localStorage.setItem('omnix-token', token);
      setUser(loggedInUser);
      setUsageStats(stats);
    } catch (error) {
      throw new Error('Login failed');
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const { user: newUser, token } = await mockApi.signup(email, password, name);
      const stats = await mockApi.getUsageStats();
      
      localStorage.setItem('omnix-token', token);
      setUser(newUser);
      setUsageStats(stats);
    } catch (error) {
      throw new Error('Signup failed');
    }
  };

  const googleLogin = async () => {
    try {
      const { user: googleUser, token } = await mockApi.googleLogin();
      const stats = await mockApi.getUsageStats();
      
      localStorage.setItem('omnix-token', token);
      setUser(googleUser);
      setUsageStats(stats);
    } catch (error) {
      throw new Error('Google login failed');
    }
  };

  const logout = async () => {
    try {
      await mockApi.logout();
      localStorage.removeItem('omnix-token');
      localStorage.removeItem('userPlan');
      setUser(null);
      setUsageStats(null);
      setUserPlan('free');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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

  const updatePlan = (newPlan: string) => {
    console.log('📋 Updating user plan to:', newPlan);
    localStorage.setItem('userPlan', newPlan);
    setUserPlan(newPlan);
  };

  const value: AuthContextType = {
    user,
    usageStats,
    userPlan,
    loading,
    login,
    signup,
    googleLogin,
    logout,
    refreshUsageStats,
    updateCredits,
    updatePlan,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 