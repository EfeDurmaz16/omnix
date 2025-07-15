import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { contextManager } from '@/lib/context/AdvancedContextManager';

/**
 * Memory Performance Monitoring Endpoint
 * GET /api/debug/memory-performance
 * 
 * Returns comprehensive metrics about the optimized memory system performance
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication (optional - you might want to restrict this)
    const auth_result = await auth();
    if (!auth_result?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get comprehensive system metrics
    const systemMetrics = contextManager.getSystemMetrics();
    
    // Add timestamp and additional system info
    const response = {
      timestamp: new Date().toISOString(),
      systemMetrics,
      performance: {
        memoryInjectionOptimizations: {
          tier1_instant_cache: 'Instant memory access for common queries (0-50ms)',
          tier2_optimized_search: 'Fast vector search with result caching (50-200ms)',
          tier3_background_processing: 'Async memory extraction and quality scoring'
        },
        improvements: {
          before: 'Memory search: 2000-5000ms blocking chat responses',
          after: `Memory search: ${systemMetrics.vectorStore.avgLatency.toFixed(0)}ms average latency`,
          cacheHitRate: `${systemMetrics.contextManager.hitRate.toFixed(1)}% cache hit rate`,
          backgroundProcessing: 'Non-blocking memory extraction and optimization'
        }
      },
      recommendations: generateRecommendations(systemMetrics)
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Memory performance monitoring failed:', error);
    return NextResponse.json(
      { error: 'Failed to get memory performance metrics' },
      { status: 500 }
    );
  }
}

/**
 * Generate recommendations based on system metrics
 */
function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.contextManager.hitRate < 50) {
    recommendations.push('Consider warming more user profiles to improve cache hit rate');
  }
  
  if (metrics.vectorStore.avgLatency > 500) {
    recommendations.push('Vector search latency is high - consider optimizing query complexity');
  }
  
  if (metrics.memoryWarming.successRate < 85) {
    recommendations.push('Memory warming has some failures - check vector store connectivity');
  }
  
  if (metrics.memoryProcessing.extractionSuccessRate < 80) {
    recommendations.push('Memory extraction failing - check AI model availability');
  }
  
  if (metrics.activeContexts > 100) {
    recommendations.push('High number of active contexts - consider implementing context cleanup');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System is performing optimally! 🚀');
  }
  
  return recommendations;
}