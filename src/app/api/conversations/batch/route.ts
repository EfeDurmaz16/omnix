import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { ImportExportService } from '@/lib/import-export/integration-service';
import {
  BatchOperationResponse,
  ExportOptions,
  ImportOptions,
  ExportFormat,
  SupportedPlatform
} from '@/types/import-export';

interface BatchExportRequest {
  operations: Array<{
    id: string;
    type: 'export';
    options: ExportOptions;
  }>;
}

interface BatchImportRequest {
  operations: Array<{
    id: string;
    type: 'import';
    fileName: string;
    content: string;
    options: ImportOptions;
  }>;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { operations, type } = body;

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({
        error: 'No operations provided'
      }, { status: 400 });
    }

    if (operations.length > 10) {
      return NextResponse.json({
        error: 'Maximum 10 operations allowed per batch'
      }, { status: 400 });
    }

    console.log(`📦 Processing batch ${type} request for user:`, user.id, 'operations:', operations.length);

    const response: BatchOperationResponse = {
      success: true,
      totalOperations: operations.length,
      successfulOperations: 0,
      failedOperations: 0,
      results: [],
      errors: []
    };

    // Process operations sequentially to avoid overwhelming the system
    for (const operation of operations) {
      try {
        if (operation.type === 'export') {
          const result = await ImportExportService.exportConversations(
            user.id,
            operation.options
          );
          response.results.push(result);
          response.successfulOperations++;
        } else if (operation.type === 'import') {
          const result = await ImportExportService.importConversations(
            user.id,
            operation.content,
            operation.options
          );
          response.results.push(result);
          if (result.success) {
            response.successfulOperations++;
          } else {
            response.failedOperations++;
            response.errors.push({
              operationId: operation.id,
              error: result.errors[0]?.message || 'Import failed'
            });
          }
        } else {
          response.failedOperations++;
          response.errors.push({
            operationId: operation.id,
            error: 'Invalid operation type'
          });
        }
      } catch (error) {
        response.failedOperations++;
        response.errors.push({
          operationId: operation.id,
          error: error instanceof Error ? error.message : 'Operation failed'
        });
      }
    }

    response.success = response.successfulOperations > 0;

    console.log('✅ Batch operation completed:', {
      total: response.totalOperations,
      successful: response.successfulOperations,
      failed: response.failedOperations,
      processingTime: Date.now() - startTime
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Batch operation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch operation failed'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return batch operation capabilities
    const capabilities = {
      maxOperationsPerBatch: 10,
      supportedOperations: ['export', 'import'],
      supportedFormats: ImportExportService.getSupportedExportFormats(),
      supportedPlatforms: ImportExportService.getSupportedPlatforms(),
      features: {
        parallelProcessing: false, // Sequential for now
        progressTracking: false,   // Not implemented yet
        resume: false,             // Not implemented yet
        scheduling: false          // Not implemented yet
      }
    };

    return NextResponse.json({
      success: true,
      capabilities,
      user: {
        id: user.id,
        canBatch: true
      }
    });

  } catch (error) {
    console.error('Error getting batch capabilities:', error);
    return NextResponse.json(
      { error: 'Failed to get batch capabilities' },
      { status: 500 }
    );
  }
}