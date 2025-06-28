import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📎 Processing file upload:', file.name, file.type, file.size);

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    let processedContent = '';
    let fileType = 'unknown';

    // Process different file types
    if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
      // Text files
      fileType = 'text';
      processedContent = await file.text();
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // PDF files - Enhanced handling with better user experience
      fileType = 'pdf';
      
      // Convert file to buffer first
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log('📄 Processing PDF buffer:', buffer.length, 'bytes');
      
      // Try to extract PDF text
      try {
        console.log('🔧 Attempting PDF text extraction...');
        
        // Simple approach: try to load pdf-parse
        const pdfParse = eval('require')('pdf-parse');
        const pdfData = await pdfParse(buffer);
        
        if (pdfData.text && pdfData.text.trim()) {
          processedContent = `[PDF Document: ${file.name}]
📄 Text Content (${pdfData.text.length} characters):

${pdfData.text.trim()}`;
          console.log('✅ PDF text extracted successfully!', pdfData.text.length, 'characters');
          console.log('📄 Sample text:', pdfData.text.substring(0, 200) + '...');
        } else {
          throw new Error('No text found in PDF');
        }
      } catch (error) {
        console.warn('⚠️ PDF text extraction failed:', error instanceof Error ? error.message : 'Unknown error');
        
        // Fallback to informative message
        processedContent = `[PDF Document: ${file.name}]
📋 File Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB

⚠️ Automatic text extraction failed.
This might be because:
- The PDF contains scanned images instead of text
- The PDF is password protected
- The PDF has complex formatting

To work with this PDF:
1. Copy and paste the text content from your PDF viewer
2. Ask me specific questions about the document
3. Describe what you need help with

I'm ready to help once you provide the text content!`;
      }
      
      console.log('📋 PDF processing completed');
      console.log('📄 File info - Name:', file.name, 'Size:', buffer.length, 'bytes');
    } else if (file.type.startsWith('image/')) {
      // Image files
      fileType = 'image';
      
      // Convert image to base64 for vision models
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      // Detect actual MIME type from file.type or default to common types
      let mimeType = file.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        // Fallback based on file extension
        const extension = file.name.split('.').pop()?.toLowerCase();
        switch (extension) {
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg';
            break;
          case 'png':
            mimeType = 'image/png';
            break;
          case 'gif':
            mimeType = 'image/gif';
            break;
          case 'webp':
            mimeType = 'image/webp';
            break;
          default:
            mimeType = 'image/jpeg'; // Safe default
        }
      }
      
      const dataUrl = `data:${mimeType};base64,${base64}`;
      processedContent = dataUrl;
      
      console.log('🖼️ Image processed:', file.name, 'MIME:', mimeType, 'Size:', base64.length, 'chars');
      
      // Image processing complete - continue to end of function
    } else if (
      file.type === 'application/msword' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.doc') || 
      file.name.endsWith('.docx')
    ) {
      // Word documents
      fileType = 'document';
      processedContent = `[Word Document: ${file.name}]\nNote: Word document processing is not yet implemented. Please copy and paste the text content you'd like me to analyze.`;
    } else {
      // Unsupported file type
      return NextResponse.json(
        { success: false, error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    console.log('✅ File processed successfully:', fileId, fileType);

    return NextResponse.json({
      success: true,
      data: {
        id: fileId,
        name: file.name,
        type: fileType,
        size: file.size,
        mimeType: fileType === 'image' ? 
          (processedContent.startsWith('data:') ? 
            processedContent.split(';')[0].replace('data:', '') : 
            'image/jpeg') : 
          file.type,
        content: processedContent,
        processed: true
      }
    });

  } catch (error) {
    console.error('❌ File upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process file' },
      { status: 500 }
    );
  }
} 