/**
 * File Processing Tool - Handle file operations, parsing, and processing
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  path: string;
  created: Date;
  modified: Date;
}

export interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: any;
}

export class FileProcessingTool {
  private static readonly UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = [
    'text/plain',
    'text/csv',
    'application/json',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  /**
   * Initialize upload directory
   */
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
      console.log('📁 File processing tool initialized');
    } catch (error) {
      console.error('❌ Failed to initialize file processing tool:', error);
    }
  }

  /**
   * Save uploaded file
   */
  static async saveFile(file: Buffer | string, filename: string, contentType: string): Promise<FileInfo> {
    // Validate file type
    if (!this.ALLOWED_TYPES.includes(contentType)) {
      throw new Error(`File type ${contentType} not allowed`);
    }

    // Validate file size
    const size = Buffer.isBuffer(file) ? file.length : Buffer.byteLength(file);
    if (size > this.MAX_FILE_SIZE) {
      throw new Error(`File size ${size} exceeds maximum allowed size`);
    }

    // Generate safe filename
    const safeFilename = this.generateSafeFilename(filename);
    const filePath = path.join(this.UPLOAD_DIR, safeFilename);

    // Write file
    await fs.writeFile(filePath, file);

    const stats = await fs.stat(filePath);
    
    return {
      name: safeFilename,
      size: stats.size,
      type: contentType,
      path: filePath,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }

  /**
   * Read and process text file
   */
  static async processTextFile(filePath: string): Promise<ProcessingResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      return {
        success: true,
        data: {
          content,
          lines: lines.length,
          characters: content.length,
          words: content.split(/\s+/).filter(word => word.length > 0).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process CSV file
   */
  static async processCSVFile(filePath: string): Promise<ProcessingResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      if (lines.length === 0) {
        return { success: false, error: 'Empty CSV file' };
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      return {
        success: true,
        data: {
          headers,
          rows,
          totalRows: rows.length,
          totalColumns: headers.length
        },
        metadata: {
          fileSize: content.length,
          encoding: 'utf-8'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process JSON file
   */
  static async processJSONFile(filePath: string): Promise<ProcessingResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      return {
        success: true,
        data: data,
        metadata: {
          type: Array.isArray(data) ? 'array' : typeof data,
          size: Array.isArray(data) ? data.length : Object.keys(data).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid JSON format'
      };
    }
  }

  /**
   * Get file information
   */
  static async getFileInfo(filePath: string): Promise<FileInfo> {
    const stats = await fs.stat(filePath);
    const extension = path.extname(filePath);
    const name = path.basename(filePath);
    
    return {
      name,
      size: stats.size,
      type: this.getContentType(extension),
      path: filePath,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }

  /**
   * List files in directory
   */
  static async listFiles(directory: string = this.UPLOAD_DIR): Promise<FileInfo[]> {
    try {
      const files = await fs.readdir(directory);
      const fileInfos: FileInfo[] = [];
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          fileInfos.push({
            name: file,
            size: stats.size,
            type: this.getContentType(path.extname(file)),
            path: filePath,
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }
      
      return fileInfos;
    } catch (error) {
      console.error('❌ Failed to list files:', error);
      return [];
    }
  }

  /**
   * Delete file
   */
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      console.log('🗑️ File deleted:', filePath);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Create file from content
   */
  static async createFile(filename: string, content: string, directory: string = this.UPLOAD_DIR): Promise<FileInfo> {
    const safeFilename = this.generateSafeFilename(filename);
    const filePath = path.join(directory, safeFilename);
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    return this.getFileInfo(filePath);
  }

  /**
   * Copy file
   */
  static async copyFile(sourcePath: string, destinationPath: string): Promise<boolean> {
    try {
      await fs.copyFile(sourcePath, destinationPath);
      console.log('📄 File copied:', sourcePath, '→', destinationPath);
      return true;
    } catch (error) {
      console.error('❌ Failed to copy file:', error);
      return false;
    }
  }

  /**
   * Move file
   */
  static async moveFile(sourcePath: string, destinationPath: string): Promise<boolean> {
    try {
      await fs.rename(sourcePath, destinationPath);
      console.log('📁 File moved:', sourcePath, '→', destinationPath);
      return true;
    } catch (error) {
      console.error('❌ Failed to move file:', error);
      return false;
    }
  }

  /**
   * Calculate file hash
   */
  static async calculateHash(filePath: string): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    const stream = createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  // Helper methods
  private static generateSafeFilename(filename: string): string {
    const timestamp = Date.now();
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${timestamp}_${sanitized}`;
  }

  private static getContentType(extension: string): string {
    const types: { [key: string]: string } = {
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel'
    };
    
    return types[extension.toLowerCase()] || 'application/octet-stream';
  }
}

// Initialize on import
FileProcessingTool.initialize();