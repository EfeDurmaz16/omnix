#!/usr/bin/env python3
"""
File processing service using MarkItDown
Converts various file formats to markdown for LLM consumption
"""

import os
import tempfile
import mimetypes
from typing import Dict, Any, Optional
from pathlib import Path
import logging

from markitdown import MarkItDown

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FileProcessor:
    """
    Unified file processor using MarkItDown
    Supports all file formats that MarkItDown can handle
    """
    
    def __init__(self):
        """Initialize the MarkItDown converter"""
        self.md = MarkItDown()
        
        # Supported file types (MarkItDown handles these)
        self.supported_types = {
            # Documents
            'application/pdf': 'PDF',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (DOCX)',
            'application/msword': 'Word (DOC)',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint (PPTX)',
            'application/vnd.ms-powerpoint': 'PowerPoint (PPT)',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel (XLSX)',
            'application/vnd.ms-excel': 'Excel (XLS)',
            
            # Images (OCR + EXIF)
            'image/jpeg': 'JPEG Image',
            'image/png': 'PNG Image',
            'image/gif': 'GIF Image',
            'image/bmp': 'BMP Image',
            'image/tiff': 'TIFF Image',
            'image/webp': 'WebP Image',
            
            # Audio (transcription)
            'audio/wav': 'WAV Audio',
            'audio/mp3': 'MP3 Audio',
            'audio/mpeg': 'MPEG Audio',
            'audio/x-wav': 'WAV Audio',
            
            # Text and data
            'text/plain': 'Plain Text',
            'text/csv': 'CSV',
            'application/json': 'JSON',
            'application/xml': 'XML',
            'text/xml': 'XML',
            'text/html': 'HTML',
            
            # Archives
            'application/zip': 'ZIP Archive',
            'application/x-zip-compressed': 'ZIP Archive',
            
            # E-books
            'application/epub+zip': 'EPUB',
            
            # Email
            'message/rfc822': 'Email Message',
            'application/vnd.ms-outlook': 'Outlook Message',
            
            # Code files (common ones)
            'text/x-python': 'Python',
            'application/javascript': 'JavaScript',
            'text/javascript': 'JavaScript',
            'application/typescript': 'TypeScript',
            'text/x-java-source': 'Java',
            'text/x-c': 'C',
            'text/x-c++': 'C++',
            'text/x-csharp': 'C#',
            'text/x-go': 'Go',
            'text/x-rust': 'Rust',
        }
        
        logger.info(f"FileProcessor initialized with {len(self.supported_types)} supported file types")
    
    def is_supported(self, mime_type: str) -> bool:
        """Check if a file type is supported"""
        return mime_type in self.supported_types
    
    def get_supported_types(self) -> Dict[str, str]:
        """Get all supported file types"""
        return self.supported_types.copy()
    
    async def process_file(self, file_content: bytes, filename: str, mime_type: str) -> Dict[str, Any]:
        """
        Process a file and convert it to markdown
        
        Args:
            file_content: The file content as bytes
            filename: Original filename
            mime_type: MIME type of the file
            
        Returns:
            Dictionary containing processed result
        """
        
        if not self.is_supported(mime_type):
            return {
                'success': False,
                'error': f'Unsupported file type: {mime_type}',
                'supported_types': list(self.supported_types.keys())
            }
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            try:
                # Process with MarkItDown
                logger.info(f"Processing file: {filename} ({mime_type})")
                result = self.md.convert(temp_file_path)
                
                # Extract metadata
                metadata = {
                    'filename': filename,
                    'mime_type': mime_type,
                    'file_type': self.supported_types.get(mime_type, 'Unknown'),
                    'size_bytes': len(file_content),
                    'original_filename': filename
                }
                
                # Add any additional metadata from MarkItDown
                if hasattr(result, 'metadata') and result.metadata:
                    metadata.update(result.metadata)
                
                return {
                    'success': True,
                    'markdown': result.text_content,
                    'metadata': metadata,
                    'processing_info': {
                        'processor': 'MarkItDown',
                        'version': '0.0.1a2',
                        'capabilities': 'Full document conversion with OCR, transcription, and metadata extraction'
                    }
                }
                
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"Error processing file {filename}: {str(e)}")
            return {
                'success': False,
                'error': f'Processing failed: {str(e)}',
                'filename': filename,
                'mime_type': mime_type
            }
    
    def get_mime_type(self, filename: str) -> str:
        """Get MIME type from filename"""
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'
    
    def get_file_info(self, filename: str) -> Dict[str, Any]:
        """Get information about a file"""
        mime_type = self.get_mime_type(filename)
        return {
            'filename': filename,
            'mime_type': mime_type,
            'supported': self.is_supported(mime_type),
            'file_type': self.supported_types.get(mime_type, 'Unknown'),
            'processor': 'MarkItDown'
        }

# Global instance
file_processor = FileProcessor()