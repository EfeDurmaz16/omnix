import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AdvancedContextManager } from '@/lib/context/AdvancedContextManager';
import { debugAuth } from '@/lib/security/debugAuth';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

// GET /api/debug/memory-flow - Debug the complete memory injection flow
export async function GET(req: NextRequest) {
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

    console.log(`🔍 Debug memory flow for user ${userId}`);

    const contextManager = new AdvancedContextManager();
    const testQuery = "who am i";
    const conversationId = "test-conversation-id";

    const results = {
      userId: userId,
      query: testQuery,
      conversationId: conversationId,
      steps: {
        step1_userProfileFromCache: null as any,
        step2_relevantMemories: null as any,
        step3_finalMemoryContent: null as any,
        step4_memoryMessage: null as any
      },
      errors: [] as string[]
    };

    try {
      // Step 1: Check getUserProfileFromCache
      console.log('🔧 Step 1: Checking getUserProfileFromCache');
      const userProfile = await (contextManager as any).getUserProfileFromCache(userId);
      results.steps.step1_userProfileFromCache = {
        hasProfile: !!userProfile,
        profileLength: userProfile?.length || 0,
        profilePreview: userProfile ? userProfile.substring(0, 200) + '...' : null
      };
      console.log('📊 User profile result:', results.steps.step1_userProfileFromCache);

      // Step 2: Check getMemoriesWithOptimizedTimeout  
      console.log('🔧 Step 2: Checking memory retrieval');
      const relevantMemories = await (contextManager as any).getMemoriesWithOptimizedTimeout(
        userId,
        testQuery,
        5000,
        conversationId
      );
      
      results.steps.step2_relevantMemories = {
        conversationMemoriesCount: relevantMemories.conversationMemories?.length || 0,
        userMemoriesCount: relevantMemories.userMemories?.length || 0,
        formattedLength: relevantMemories.formatted?.length || 0,
        hasFormattedContent: !!relevantMemories.formatted?.trim(),
        formattedPreview: relevantMemories.formatted ? relevantMemories.formatted.substring(0, 300) + '...' : null,
        conversationMemoriesSample: relevantMemories.conversationMemories?.slice(0, 2),
        userMemoriesSample: relevantMemories.userMemories?.slice(0, 2)
      };
      console.log('📊 Memory retrieval result:', results.steps.step2_relevantMemories);

      // Step 3: Check enhanceMemoryWithFallbacks
      console.log('🔧 Step 3: Checking enhanceMemoryWithFallbacks');
      const finalMemoryContent = await (contextManager as any).enhanceMemoryWithFallbacks(
        userId,
        testQuery,
        relevantMemories.formatted || ''
      );
      
      results.steps.step3_finalMemoryContent = {
        hasContent: !!finalMemoryContent?.trim(),
        contentLength: finalMemoryContent?.length || 0,
        contentPreview: finalMemoryContent ? finalMemoryContent.substring(0, 300) + '...' : null
      };
      console.log('📊 Final memory content result:', results.steps.step3_finalMemoryContent);

      // Step 4: Check createMemoryMessage
      if (finalMemoryContent?.trim()) {
        console.log('🔧 Step 4: Checking createMemoryMessage');
        const memoryMessage = (contextManager as any).createMemoryMessage(finalMemoryContent);
        
        results.steps.step4_memoryMessage = {
          messageId: memoryMessage.id,
          messageRole: memoryMessage.role,
          contentLength: memoryMessage.content?.length || 0,
          contentPreview: memoryMessage.content ? memoryMessage.content.substring(0, 300) + '...' : null
        };
        console.log('📊 Memory message result:', results.steps.step4_memoryMessage);
      } else {
        results.steps.step4_memoryMessage = { error: 'No final memory content to create message from' };
      }

    } catch (stepError) {
      results.errors.push(`Step error: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
      console.error('❌ Step error:', stepError);
    }

    return createSecureResponse(results);

  } catch (error) {
    console.error('Error in memory flow debug:', error);
    return createErrorResponse(
      'Failed to debug memory flow',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}