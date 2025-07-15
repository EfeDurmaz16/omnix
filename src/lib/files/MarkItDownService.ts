/**
 * MarkItDown Service Integration
 * Integrates with the Python microservice for file processing
 */

interface FileProcessingResult {
  success: boolean;
  markdown?: string;
  metadata?: {
    filename: string;
    mime_type: string;
    file_type: string;
    size_bytes: number;
    [key: string]: any;
  };
  processing_info?: {
    processor: string;
    version: string;
    capabilities: string;
  };
  error?: string;
  filename?: string;
  mime_type?: string;
}

interface SupportedTypesResponse {
  success: boolean;
  supported_types: Record<string, string>;
  total_supported: number;
  processor: string;
  capabilities: string[];
}

interface FileInfo {
  filename: string;
  mime_type: string;
  supported: boolean;
  file_type: string;
  processor: string;
  size_bytes?: number;
}

export class MarkItDownService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Process a file using MarkItDown
   */
  async processFile(file: File): Promise<FileProcessingResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/files/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('MarkItDown processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: file.name,
        mime_type: file.type,
      };
    }
  }

  /**
   * Get supported file types
   */
  async getSupportedTypes(): Promise<SupportedTypesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/files/supported-types`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching supported types:', error);
      return {
        success: false,
        supported_types: {},
        total_supported: 0,
        processor: 'MarkItDown',
        capabilities: [],
      };
    }
  }

  /**
   * Get file information without processing
   */
  async getFileInfo(file: File): Promise<{ success: boolean; file_info?: FileInfo; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/files/info`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting file info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if a file type is supported
   */
  async isSupported(file: File): Promise<boolean> {
    try {
      const supportedTypes = await this.getSupportedTypes();
      return supportedTypes.success && 
             file.type in supportedTypes.supported_types;
    } catch {
      return false;
    }
  }

  /**
   * Get file type description
   */
  async getFileTypeDescription(file: File): Promise<string> {
    try {
      const supportedTypes = await this.getSupportedTypes();
      if (supportedTypes.success) {
        return supportedTypes.supported_types[file.type] || 'Unknown';
      }
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Process multiple files
   */
  async processMultipleFiles(files: File[]): Promise<FileProcessingResult[]> {
    const results: FileProcessingResult[] = [];
    
    for (const file of files) {
      const result = await this.processFile(file);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export a default instance
export const markItDownService = new MarkItDownService();

// Export types for use in components
export type {
  FileProcessingResult,
  SupportedTypesResponse,
  FileInfo,
};