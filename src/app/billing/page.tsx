import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import BillingClient from '@/app/billing/BillingClient';
import { Suspense } from 'react';

function BillingContent() {
  return <BillingClient />;
}

export default async function BillingPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/login');
  }

  return (
    <div className="cultural-bg min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 cultural-text-primary">Billing & Usage</h1>
          <p className="text-xl text-muted-foreground">
            Manage your subscription and monitor your usage
          </p>
        </div>
        
        <BillingClient />
      </div>
    </div>
  );
} 