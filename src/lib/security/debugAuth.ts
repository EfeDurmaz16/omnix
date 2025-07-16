import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Debug endpoint authentication middleware
 * Only allows access to debug endpoints in development or for admin users
 */
export async function debugAuth(req: NextRequest) {
  // Block debug endpoints in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoints are disabled in production' },
      { status: 403 }
    );
  }

  // Check authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized - Debug endpoints require authentication' },
      { status: 401 }
    );
  }

  // In development, allow authenticated users
  // In production, you could add admin role check here
  return null; // Allow access
}

/**
 * Admin-only endpoint authentication
 * For sensitive operations that should only be available to admins
 */
export async function adminAuth(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // TODO: Implement admin role check when user roles are available
  // For now, restrict to development only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Admin endpoints are disabled in production' },
      { status: 403 }
    );
  }

  return null; // Allow access
}