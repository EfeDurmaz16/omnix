import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <SignIn 
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "shadow-lg",
          }
        }}
      />
    </div>
  );
} 