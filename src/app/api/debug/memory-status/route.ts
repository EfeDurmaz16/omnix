import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { debugAuth } from '@/lib/security/debugAuth';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

// GET /api/debug/memory-status - Check current memory storage status
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

    console.log(`🔍 Checking memory status for user ${userId}`);

    const results = {
      userId: userId,
      userVectors: 0,
      userMemories: 0,
      conversations: 0,
      sampleDocuments: [],
      errors: []
    };

    try {
      // Import Firestore directly
      const { firestore } = await import('@/lib/gcp-storage');
      const db = firestore;
      
      if (db) {
        // Check user-vectors collection
        try {
          const userVectorsSnapshot = await db.collection('user-vectors')
            .where('userId', '==', userId)
            .limit(5)
            .get();
          
          results.userVectors = userVectorsSnapshot.size;
          
          if (userVectorsSnapshot.size > 0) {
            results.sampleDocuments.push({
              collection: 'user-vectors',
              count: userVectorsSnapshot.size,
              sample: userVectorsSnapshot.docs[0].data()
            });
          }
        } catch (vectorError) {
          results.errors.push(`user-vectors error: ${vectorError}`);
        }

        // Check user-memories collection
        try {
          const userMemoriesSnapshot = await db.collection('user-memories')
            .where('userId', '==', userId)
            .limit(5)
            .get();
          
          results.userMemories = userMemoriesSnapshot.size;
          
          if (userMemoriesSnapshot.size > 0) {
            results.sampleDocuments.push({
              collection: 'user-memories',
              count: userMemoriesSnapshot.size,
              sample: userMemoriesSnapshot.docs[0].data()
            });
          }
        } catch (memoryError) {
          results.errors.push(`user-memories error: ${memoryError}`);
        }

        // Check conversations collection
        try {
          const conversationsSnapshot = await db.collection('conversations')
            .where('userId', '==', userId)
            .limit(5)
            .get();
          
          results.conversations = conversationsSnapshot.size;
          
          if (conversationsSnapshot.size > 0) {
            results.sampleDocuments.push({
              collection: 'conversations',
              count: conversationsSnapshot.size,
              sample: conversationsSnapshot.docs[0].data()
            });
          }
        } catch (convError) {
          results.errors.push(`conversations error: ${convError}`);
        }
      } else {
        results.errors.push('Failed to get Firestore client');
      }

    } catch (importError) {
      results.errors.push(`Import error: ${importError}`);
    }

    console.log(`📊 Memory status results:`, results);

    return createSecureResponse(results);

  } catch (error) {
    console.error('Error checking memory status:', error);
    return createErrorResponse(
      'Failed to check memory status',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}