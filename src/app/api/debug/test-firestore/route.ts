import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Firestore } from '@google-cloud/firestore';

// POST /api/debug/test-firestore - Test basic Firestore connectivity
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🧪 Testing Firestore connectivity for user ${userId}`);

    const results = {
      userId: userId,
      connectionTest: false,
      writeTest: false,
      readTest: false,
      errors: []
    };

    try {
      // Create Firestore client directly
      const firestore = new Firestore({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });

      results.connectionTest = true;
      console.log('✅ Firestore connection established');

      // Test write
      const testDocRef = firestore.collection('test-collection').doc(`test_${userId}_${Date.now()}`);
      
      await testDocRef.set({
        userId: userId,
        testData: 'Hello from debug endpoint',
        timestamp: new Date(),
        type: 'connection_test'
      });

      results.writeTest = true;
      console.log('✅ Firestore write test successful');

      // Test read
      const readDoc = await testDocRef.get();
      if (readDoc.exists) {
        results.readTest = true;
        console.log('✅ Firestore read test successful');
        
        // Clean up test document
        await testDocRef.delete();
        console.log('🧹 Test document cleaned up');
      } else {
        results.errors.push('Read test failed: document not found');
      }

      // Test user-specific write to user-memories collection
      try {
        const memoryDocRef = firestore.collection('user-memories').doc();
        
        await memoryDocRef.set({
          userId: userId,
          type: 'fact',
          content: 'Test memory: User is testing the memory system',
          confidence: 1.0,
          extractedFrom: 'debug_test',
          timestamp: new Date(),
          embedding: Array(1536).fill(0.5) // Dummy embedding
        });

        console.log('✅ Test memory stored successfully');
        results.testMemoryStored = true;

      } catch (memoryError) {
        results.errors.push(`Memory storage test failed: ${memoryError.message}`);
      }

    } catch (firestoreError) {
      results.errors.push(`Firestore error: ${firestoreError.message}`);
      console.error('❌ Firestore error:', firestoreError);
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in Firestore test:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test Firestore',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}