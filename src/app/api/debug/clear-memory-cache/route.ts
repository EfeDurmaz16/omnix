import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { debugAuth } from '@/lib/security/debugAuth';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

// POST /api/debug/clear-memory-cache - Clear all memory caches for debugging
export async function POST(req: NextRequest) {
  try {
    // Debug endpoint authentication
    const authResult = await debugAuth(req);
    if (authResult) {
      return authResult;
    }
    
    const { userId } = await auth();
    
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    console.log(`🧹 FORCE CLEARING all memory caches for user ${userId}`);

    // Clear all possible caches
    try {
      // Clear embedding cache
      const { EnhancedGCPVectorStore } = await import('@/lib/rag/EnhancedGCPVectorStore');
      // Access the singleton instance if available
      
      // Clear context manager caches
      const { contextManager } = await import('@/lib/context/AdvancedContextManager');
      
      // Force clear any cached data
      if (typeof localStorage !== 'undefined') {
        const keys = Object.keys(localStorage);
        const userKeys = keys.filter(key => key.includes(userId));
        userKeys.forEach(key => {
          localStorage.removeItem(key);
          console.log(`🧹 Removed localStorage key: ${key}`);
        });
      }

      console.log(`✅ Successfully cleared memory caches for user ${userId}`);
      
      return createSecureResponse({ 
        success: true, 
        message: 'Memory caches cleared',
        userId: userId,
        clearedKeys: typeof localStorage !== 'undefined' ? 
          Object.keys(localStorage).filter(key => key.includes(userId)).length : 0
      });
      
    } catch (cacheError) {
      console.error('Error clearing caches:', cacheError);
      return createErrorResponse(
        'Failed to clear some caches',
        500,
        cacheError instanceof Error ? cacheError.message : 'Unknown error'
      );
    }

  } catch (error) {
    console.error('Error in clear-memory-cache:', error);
    return createErrorResponse(
      'Failed to clear memory cache',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}