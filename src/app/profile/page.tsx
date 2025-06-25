import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { AuthWrapper } from '@/components/auth/ClerkAuthWrapper';

export default async function ProfilePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/login');
  }

  const user = await currentUser();

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Manage your profile information and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Profile Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {user?.emailAddresses[0]?.emailAddress || 'No email'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {user?.fullName || 'No name set'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Username
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {user?.username || 'No username set'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Picture */}
          <div>
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Profile Picture
              </h2>
              <div className="flex flex-col items-center">
                <img
                  src={user?.imageUrl || '/default-avatar.png'}
                  alt="Profile"
                  className="h-32 w-32 rounded-full object-cover"
                />
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Manage your profile picture through Clerk
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AuthWrapper>
  );
} 