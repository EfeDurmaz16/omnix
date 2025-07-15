import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { markItDownService } from '@/lib/files/MarkItDownService';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the uploaded file from form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large', 
        maxSize: maxSize,
        actualSize: file.size 
      }, { status: 400 });
    }

    // Check if MarkItDown service is available
    const isHealthy = await markItDownService.checkHealth();
    if (!isHealthy) {
      return NextResponse.json({ 
        error: 'MarkItDown service unavailable',
        fallback: 'Please try again later or use basic file upload'
      }, { status: 503 });
    }

    // Check if file type is supported
    const isSupported = await markItDownService.isSupported(file);
    if (!isSupported) {
      return NextResponse.json({ 
        error: 'File type not supported by MarkItDown',
        fileType: file.type,
        filename: file.name
      }, { status: 400 });
    }

    // Process the file with MarkItDown
    const result = await markItDownService.processFile(file);

    if (!result.success) {
      return NextResponse.json({
        error: 'File processing failed',
        details: result.error,
        filename: file.name
      }, { status: 500 });
    }

    // Return the processed result
    return NextResponse.json({
      success: true,
      filename: file.name,
      originalSize: file.size,
      processedContent: result.markdown,
      metadata: result.metadata,
      processingInfo: result.processing_info,
      processor: 'MarkItDown'
    });

  } catch (error) {
    console.error('MarkItDown processing error:', error);
    return NextResponse.json({
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Return supported file types
    const supportedTypes = await markItDownService.getSupportedTypes();
    
    return NextResponse.json({
      service: 'MarkItDown File Processing',
      status: 'available',
      ...supportedTypes
    });
  } catch (error) {
    return NextResponse.json({
      service: 'MarkItDown File Processing',
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}