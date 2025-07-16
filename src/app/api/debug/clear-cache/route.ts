import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { debugAuth } from '@/lib/security/debugAuth';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

export async function POST(req: NextRequest) {
  try {
    // Debug endpoint authentication
    const authResult = await debugAuth(req);
    if (authResult) {
      return authResult;
    }
    
    // Authentication check
    const auth_result = await auth();
    const userId = auth_result.userId;
    
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Clear all caches
    const cacheResults = {
      memoryCache: false,
      embeddingCache: false,
      profileCache: false,
      vectorStore: false
    };

    try {
      // Clear memory search cache
      const { memorySearchCache } = await import('../../../../lib/cache/MemoryCache');
      memorySearchCache.clear();
      cacheResults.memoryCache = true;
      console.log('🧹 Cleared memory search cache');
    } catch (error) {
      console.warn('Failed to clear memory cache:', error);
    }

    try {
      // Clear embedding cache
      const { embeddingCache } = await import('../../../../lib/cache/MemoryCache');
      embeddingCache.clear();
      cacheResults.embeddingCache = true;
      console.log('🧹 Cleared embedding cache');
    } catch (error) {
      console.warn('Failed to clear embedding cache:', error);
    }

    try {
      // Clear profile cache
      const { userProfileCache } = await import('../../../../lib/cache/MemoryCache');
      userProfileCache.clear();
      cacheResults.profileCache = true;
      console.log('🧹 Cleared user profile cache');
    } catch (error) {
      console.warn('Failed to clear profile cache:', error);
    }

    try {
      // Clear vector store user-specific cache
      const { EnhancedGCPVectorStore } = await import('../../../../lib/rag/EnhancedGCPVectorStore');
      // Get the singleton instance
      const vectorStore = new EnhancedGCPVectorStore();
      await vectorStore.clearUserCache(userId);
      cacheResults.vectorStore = true;
      console.log('🧹 Cleared vector store cache for user');
    } catch (error) {
      console.warn('Failed to clear vector store cache:', error);
    }

    try {
      // Clear user service cache
      const { userService } = await import('../../../../lib/user/UserService');
      userService.clearPlanCache(userId);
      console.log('🧹 Cleared user service cache');
    } catch (error) {
      console.warn('Failed to clear user service cache:', error);
    }

    return createSecureResponse({
      success: true,
      message: 'Caches cleared successfully',
      cleared: cacheResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache clearing error:', error);
    return createErrorResponse(
      'Failed to clear caches',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Debug endpoint authentication
    const authResult = await debugAuth(req);
    if (authResult) {
      return authResult;
    }
    
    return createSecureResponse({
      message: 'Cache clearing endpoint - use POST to clear caches',
      available_caches: [
        'memorySearchCache',
        'embeddingCache', 
        'userProfileCache',
        'vectorStore',
        'userService'
      ]
    });
  } catch (error) {
    console.error('Error in clear-cache GET:', error);
    return createErrorResponse(
      'Failed to get clear-cache info',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}