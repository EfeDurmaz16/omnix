import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// POST /api/debug/clear-memory-cache - Clear all memory caches for debugging
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      
      return NextResponse.json({ 
        success: true, 
        message: 'Memory caches cleared',
        userId: userId,
        clearedKeys: typeof localStorage !== 'undefined' ? 
          Object.keys(localStorage).filter(key => key.includes(userId)).length : 0
      });
      
    } catch (cacheError) {
      console.error('Error clearing caches:', cacheError);
      return NextResponse.json({
        success: false,
        error: 'Failed to clear some caches',
        details: cacheError instanceof Error ? cacheError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Error in clear-memory-cache:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear memory cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}