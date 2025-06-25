import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { AuthWrapper } from '@/components/auth/ClerkAuthWrapper';
import BillingClient from '@/app/billing/BillingClient';

export default async function BillingPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/login');
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <BillingClient />
      </div>
    </AuthWrapper>
  );
} 