import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testing PDF parsing capability...');
    
    // Test if pdf-parse can be loaded
    let pdfParseAvailable = false;
    let testResult = '';
    
    try {
      const pdfParse = eval('require')('pdf-parse');
      pdfParseAvailable = true;
      testResult = 'pdf-parse library loaded successfully with eval require';
      console.log('✅ pdf-parse loaded successfully');
    } catch (error) {
      testResult = `Failed to load pdf-parse: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ pdf-parse loading failed:', error);
    }
    
    return NextResponse.json({
      success: true,
      pdfParseAvailable,
      testResult,
      message: pdfParseAvailable ? 'PDF parsing should work!' : 'PDF parsing not available',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ PDF test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 