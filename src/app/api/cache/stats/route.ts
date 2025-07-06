import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { memorySearchCache, embeddingCache, userProfileCache, modelCatalogCache, providerCache } from '@/lib/cache/MemoryCache';

/**
 * Cache Statistics API Endpoint
 * Provides insights into cache performance and usage
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Collect stats from all cache instances
    const memorySearchStats = memorySearchCache.getStats();
    const embeddingStats = embeddingCache.getStats();
    const userProfileStats = userProfileCache.getStats();
    const modelCatalogStats = modelCatalogCache.getStats();
    const providerStats = providerCache.getStats();

    // Calculate overall performance metrics
    const totalHits = memorySearchStats.hits + embeddingStats.hits + userProfileStats.hits + 
                     modelCatalogStats.hits + providerStats.hits;
    const totalMisses = memorySearchStats.misses + embeddingStats.misses + userProfileStats.misses + 
                       modelCatalogStats.misses + providerStats.misses;
    const totalRequests = totalHits + totalMisses;
    const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      overall: {
        totalRequests,
        totalHits,
        totalMisses,
        hitRate: Math.round(overallHitRate * 100) / 100,
        performanceGain: `${Math.round((overallHitRate / 100) * 100)}% faster responses`
      },
      caches: {
        memorySearch: {
          name: 'Memory Search Cache',
          description: 'Caches conversation memory search results',
          ...memorySearchStats,
          ttl: '10 minutes',
          maxSize: 500
        },
        embedding: {
          name: 'Embedding Cache',
          description: 'Caches OpenAI embedding generations',
          ...embeddingStats,
          ttl: '30 minutes',
          maxSize: 1000
        },
        userProfile: {
          name: 'User Profile Cache',
          description: 'Caches user profile data',
          ...userProfileStats,
          ttl: '1 hour',
          maxSize: 100
        },
        modelCatalog: {
          name: 'Model Catalog Cache',
          description: 'Caches model lists, filters, and lookups',
          ...modelCatalogStats,
          ttl: '15 minutes',
          maxSize: 50
        },
        provider: {
          name: 'Provider Cache',
          description: 'Caches individual provider model lists',
          ...providerStats,
          ttl: '15-60 minutes',
          maxSize: 20
        }
      },
      recommendations: generateRecommendations({
        memorySearchStats,
        embeddingStats,
        userProfileStats,
        modelCatalogStats,
        providerStats,
        overallHitRate
      })
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Cache stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve cache statistics' },
      { status: 500 }
    );
  }
}

/**
 * Clear cache endpoint for testing/debugging
 */
export async function DELETE(req: NextRequest) {
  try {
    // Authentication check  
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cache type from query params
    const url = new URL(req.url);
    const cacheType = url.searchParams.get('type');

    let clearedCaches: string[] = [];

    if (!cacheType || cacheType === 'all') {
      // Clear all caches
      memorySearchCache.clear();
      embeddingCache.clear();
      userProfileCache.clear();
      modelCatalogCache.clear();
      providerCache.clear();
      clearedCaches = ['memorySearch', 'embedding', 'userProfile', 'modelCatalog', 'provider'];
    } else {
      // Clear specific cache
      switch (cacheType) {
        case 'memory':
          memorySearchCache.clear();
          clearedCaches = ['memorySearch'];
          break;
        case 'embedding':
          embeddingCache.clear();
          clearedCaches = ['embedding'];
          break;
        case 'profile':
          userProfileCache.clear();
          clearedCaches = ['userProfile'];
          break;
        case 'models':
          modelCatalogCache.clear();
          providerCache.clear();
          clearedCaches = ['modelCatalog', 'provider'];
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid cache type. Use: memory, embedding, profile, models, or all' },
            { status: 400 }
          );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cache(s) cleared successfully`,
      clearedCaches,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear API error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

/**
 * Generate performance recommendations based on cache stats
 */
function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  const { memorySearchStats, embeddingStats, userProfileStats, overallHitRate } = stats;

  // Overall performance recommendations
  if (overallHitRate < 50) {
    recommendations.push('🔧 Low cache hit rate detected. Consider increasing TTL values for frequently accessed data.');
  } else if (overallHitRate > 90) {
    recommendations.push('✅ Excellent cache performance! Cache is significantly improving response times.');
  }

  // Memory search specific recommendations
  if (memorySearchStats.hitRate < 30) {
    recommendations.push('💭 Memory search cache hit rate is low. Users may be asking varied questions.');
  }

  // Embedding specific recommendations
  if (embeddingStats.hitRate < 70) {
    recommendations.push('🔤 Embedding cache could be optimized. Consider pre-computing embeddings for common queries.');
  }

  // Size recommendations
  if (memorySearchStats.evictions > 50) {
    recommendations.push('📦 Memory search cache is evicting frequently. Consider increasing maxSize.');
  }
  
  if (embeddingStats.evictions > 100) {
    recommendations.push('📦 Embedding cache is evicting frequently. Consider increasing maxSize.');
  }

  // Performance recommendations
  if (memorySearchStats.averageAccessTime > 5) {
    recommendations.push('⚡ Memory search access time is high. Check for large cached objects.');
  }

  if (recommendations.length === 0) {
    recommendations.push('🎉 Cache performance is optimal! No recommendations at this time.');
  }

  return recommendations;
}