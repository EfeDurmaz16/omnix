import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { firestore } from '@/lib/gcp-storage';
import { debugAuth } from '@/lib/security/debugAuth';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

// POST /api/debug/cleanup-vectors - Clean up user-vectors collection
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

    const { action } = await req.json();
    let result: any = {};

    switch (action) {
      case 'delete_all_user_vectors':
        // Delete all documents in user-vectors collection
        try {
          console.log('🗑️ Starting to delete all user-vectors documents...');
          
          const snapshot = await firestore.collection('user-vectors').get();
          console.log(`📊 Found ${snapshot.size} documents to delete`);
          
          const batch = firestore.batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          
          await batch.commit();
          
          result = {
            action: 'delete_all_user_vectors',
            success: true,
            message: `Successfully deleted ${snapshot.size} documents from user-vectors collection`
          };
        } catch (error) {
          result = {
            action: 'delete_all_user_vectors',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown deletion error'
          };
        }
        break;

      case 'delete_user_only':
        // Delete only current user's documents
        try {
          console.log(`🗑️ Starting to delete user-vectors documents for user ${userId}...`);
          
          const snapshot = await firestore
            .collection('user-vectors')
            .where('userId', '==', userId)
            .get();
          
          console.log(`📊 Found ${snapshot.size} documents to delete for user`);
          
          const batch = firestore.batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          
          await batch.commit();
          
          result = {
            action: 'delete_user_only',
            success: true,
            message: `Successfully deleted ${snapshot.size} documents for user ${userId}`
          };
        } catch (error) {
          result = {
            action: 'delete_user_only',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown deletion error'
          };
        }
        break;

      case 'analyze_structure':
        // Analyze current data structure
        try {
          const snapshot = await firestore
            .collection('user-vectors')
            .limit(10)
            .get();
          
          const analysis = {
            totalDocs: snapshot.size,
            sampleDocs: snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                hasUserId: !!data.userId,
                hasConversationId: !!data.conversationId,
                hasMetadata: !!data.metadata,
                hasChatId: !!data.metadata?.chatId,
                hasMessages: !!data.messages,
                messageCount: data.messages?.length || 0,
                hasCreatedAt: !!data.createdAt,
                structure: Object.keys(data)
              };
            })
          };
          
          result = {
            action: 'analyze_structure',
            success: true,
            analysis
          };
        } catch (error) {
          result = {
            action: 'analyze_structure',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown analysis error'
          };
        }
        break;

      default:
        return createSecureResponse({
          message: 'User-Vectors Cleanup Tool',
          actions: [
            'delete_all_user_vectors - Delete all documents in user-vectors collection',
            'delete_user_only - Delete only current user documents',
            'analyze_structure - Analyze current data structure'
          ]
        });
    }

    return createSecureResponse(result);

  } catch (error) {
    console.error('Error in cleanup-vectors:', error);
    return createErrorResponse(
      'Failed to cleanup vectors',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// GET instructions
export async function GET(req: NextRequest) {
  try {
    // Debug endpoint authentication
    const authResult = await debugAuth(req);
    if (authResult) {
      return authResult;
    }
    
    return createSecureResponse({
      message: 'User-Vectors Cleanup API',
      usage: 'POST with {"action": "analyze_structure"} to analyze current data',
      warning: 'delete_all_user_vectors will permanently delete all memory data!'
    });
  } catch (error) {
    console.error('Error in cleanup-vectors GET:', error);
    return createErrorResponse(
      'Failed to get cleanup-vectors info',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}