import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Firestore } from '@google-cloud/firestore';
import { debugAuth } from '@/lib/security/debugAuth';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

// GET /api/debug/simple-memory-check - Simple check of Firestore collections
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

    console.log(`🔍 Simple memory check for user ${userId}`);

    const results = {
      userId: userId,
      collections: {},
      errors: []
    };

    try {
      // Create Firestore client directly
      const firestore = new Firestore({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });

      // Check each collection
      const collections = ['user-vectors', 'user-memories', 'conversations'];
      
      for (const collectionName of collections) {
        try {
          const snapshot = await firestore.collection(collectionName)
            .where('userId', '==', userId)
            .limit(5)
            .get();
          
          results.collections[collectionName] = {
            count: snapshot.size,
            exists: snapshot.size > 0
          };
          
          if (snapshot.size > 0) {
            const firstDoc = snapshot.docs[0];
            results.collections[collectionName].sampleId = firstDoc.id;
            results.collections[collectionName].sampleData = firstDoc.data();
          }
          
          console.log(`📊 ${collectionName}: ${snapshot.size} documents`);
          
        } catch (collectionError) {
          results.errors.push(`${collectionName}: ${collectionError.message}`);
          console.error(`❌ Error checking ${collectionName}:`, collectionError);
        }
      }

    } catch (firestoreError) {
      results.errors.push(`Firestore connection: ${firestoreError.message}`);
      console.error('❌ Firestore connection error:', firestoreError);
    }

    return createSecureResponse(results);

  } catch (error) {
    console.error('Error in simple memory check:', error);
    return createErrorResponse(
      'Failed to check memory',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}