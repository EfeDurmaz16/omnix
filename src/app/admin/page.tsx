'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPlanManager } from '@/components/admin/AdminPlanManager';
import { AdminUserManager } from '@/components/admin/AdminUserManager';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { AdminBilling } from '@/components/admin/AdminBilling';
import { AdminSystemHealth } from '@/components/admin/AdminSystemHealth';
import { Navbar } from '@/components/layout/Navbar';
import { 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Shield,
  Activity
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="h-screen cultural-bg">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold cultural-text-primary">Admin Dashboard</h1>
          <p className="text-cultural-text-secondary mt-2">
            Manage users, plans, billing, and system health
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 cultural-card">
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Plans</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Billing</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Health</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <AdminUserManager />
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <AdminPlanManager />
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <AdminBilling />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <AdminSystemHealth />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="cultural-card p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Security Dashboard</h2>
              <p className="text-cultural-text-secondary">Security features coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}