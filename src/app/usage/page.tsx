import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { AuthWrapper } from '@/components/auth/ClerkAuthWrapper';

export default async function UsagePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/login');
  }

  // Mock usage data - in a real app, this would come from your database
  const usageData = {
    currentPeriod: {
      apiCalls: 1250,
      dataStorage: 2.4, // GB
      bandwidth: 15.7, // GB
      limit: {
        apiCalls: 5000,
        dataStorage: 10, // GB
        bandwidth: 50, // GB
      }
    },
    lastUpdated: new Date().toLocaleDateString()
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usage & Analytics</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Monitor your current usage and track your consumption patterns.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {usageData.lastUpdated}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* API Calls Usage */}
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                API Calls
              </h2>
              <span className="text-2xl font-bold text-blue-600">
                {usageData.currentPeriod.apiCalls.toLocaleString()}
              </span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Used</span>
                <span>{usageData.currentPeriod.limit.apiCalls.toLocaleString()} limit</span>
              </div>
              <div className="mt-1 h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                <div
                  className={`h-2 rounded-full ${getUsageColor(
                    getUsagePercentage(usageData.currentPeriod.apiCalls, usageData.currentPeriod.limit.apiCalls)
                  )}`}
                  style={{
                    width: `${getUsagePercentage(
                      usageData.currentPeriod.apiCalls,
                      usageData.currentPeriod.limit.apiCalls
                    )}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {getUsagePercentage(usageData.currentPeriod.apiCalls, usageData.currentPeriod.limit.apiCalls).toFixed(1)}% of monthly limit
            </p>
          </div>

          {/* Data Storage Usage */}
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Data Storage
              </h2>
              <span className="text-2xl font-bold text-green-600">
                {usageData.currentPeriod.dataStorage} GB
              </span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Used</span>
                <span>{usageData.currentPeriod.limit.dataStorage} GB limit</span>
              </div>
              <div className="mt-1 h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                <div
                  className={`h-2 rounded-full ${getUsageColor(
                    getUsagePercentage(usageData.currentPeriod.dataStorage, usageData.currentPeriod.limit.dataStorage)
                  )}`}
                  style={{
                    width: `${getUsagePercentage(
                      usageData.currentPeriod.dataStorage,
                      usageData.currentPeriod.limit.dataStorage
                    )}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {getUsagePercentage(usageData.currentPeriod.dataStorage, usageData.currentPeriod.limit.dataStorage).toFixed(1)}% of storage limit
            </p>
          </div>

          {/* Bandwidth Usage */}
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bandwidth
              </h2>
              <span className="text-2xl font-bold text-purple-600">
                {usageData.currentPeriod.bandwidth} GB
              </span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Used</span>
                <span>{usageData.currentPeriod.limit.bandwidth} GB limit</span>
              </div>
              <div className="mt-1 h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                <div
                  className={`h-2 rounded-full ${getUsageColor(
                    getUsagePercentage(usageData.currentPeriod.bandwidth, usageData.currentPeriod.limit.bandwidth)
                  )}`}
                  style={{
                    width: `${getUsagePercentage(
                      usageData.currentPeriod.bandwidth,
                      usageData.currentPeriod.limit.bandwidth
                    )}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {getUsagePercentage(usageData.currentPeriod.bandwidth, usageData.currentPeriod.limit.bandwidth).toFixed(1)}% of bandwidth limit
            </p>
          </div>
        </div>

        {/* Usage Chart Placeholder */}
        <div className="mt-8 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Usage Over Time
          </h2>
          <div className="flex h-64 items-center justify-center border-2 border-dashed border-gray-300 rounded-lg dark:border-gray-600">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📊</div>
              <p className="text-gray-500 dark:text-gray-400">
                Usage charts will be displayed here
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Connect your analytics service to see detailed usage trends
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AuthWrapper>
  );
} 