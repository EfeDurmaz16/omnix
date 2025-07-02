/**
 * Export Formatters for Chat Import/Export System
 * Supports JSON, Markdown, CSV, and PDF export formats
 */

import {
  BaseConversation,
  BaseMessage,
  ExportOptions,
  JSONExport,
  MarkdownExport,
  CSVRow,
  PDFExportOptions,
  SupportedExportFormat
} from '@/types/import-export';

export class ChatExportFormatter {
  private options: ExportOptions;

  constructor(options: ExportOptions = { format: 'json' }) {
    this.options = {
      includeMetadata: true,
      includeTimestamps: true,
      includeAttachments: false,
      compression: false,
      ...options
    };
  }

  /**
   * Export conversations to specified format
   */
  async exportConversations(
    conversations: BaseConversation[],
    format?: SupportedExportFormat,
    userInfo?: { id: string; email?: string; name?: string }
  ): Promise<{
    data: any;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const exportFormat = format || this.options.format;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    let data: any;
    let filename: string;
    let mimeType: string;

    // Filter conversations by date range if specified
    let filteredConversations = conversations;
    if (this.options.dateRange) {
      filteredConversations = conversations.filter(conv => {
        const convDate = new Date(conv.createdAt);
        return convDate >= this.options.dateRange!.start && convDate <= this.options.dateRange!.end;
      });
    }

    // Filter specific conversations if specified
    if (this.options.conversationIds) {
      filteredConversations = filteredConversations.filter(conv => 
        this.options.conversationIds!.includes(conv.id || '')
      );
    }

    switch (exportFormat) {
      case 'json':
        data = this.formatJSON(filteredConversations, userInfo);
        filename = `chat-export-${timestamp}.json`;
        mimeType = 'application/json';
        break;
        
      case 'markdown':
        data = this.formatMarkdown(filteredConversations);
        filename = `chat-export-${timestamp}.md`;
        mimeType = 'text/markdown';
        break;
        
      case 'csv':
        data = this.formatCSV(filteredConversations);
        filename = `chat-export-${timestamp}.csv`;
        mimeType = 'text/csv';
        break;
        
      case 'pdf':
        data = await this.formatPDF(filteredConversations, this.options as PDFExportOptions);
        filename = `chat-export-${timestamp}.pdf`;
        mimeType = 'application/pdf';
        break;
        
      default:
        throw new Error(`Unsupported export format: ${exportFormat}`);
    }

    // Calculate data size
    const size = typeof data === 'string' ? 
      new Blob([data]).size : 
      new Blob([JSON.stringify(data)]).size;

    return {
      data,
      filename,
      mimeType,
      size
    };
  }

  /**
   * Format conversations as JSON
   */
  private formatJSON(conversations: BaseConversation[], userInfo?: any): JSONExport {
    const processedConversations = conversations.map(conv => ({
      ...conv,
      messages: conv.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: this.options.includeTimestamps ? msg.timestamp : undefined,
        metadata: this.options.includeMetadata ? msg.metadata : undefined
      })).filter(msg => msg.content.trim().length > 0), // Remove empty messages
      metadata: this.options.includeMetadata ? conv.metadata : undefined
    }));

    const totalMessages = processedConversations.reduce(
      (total, conv) => total + conv.messages.length, 
      0
    );

    return {
      exportedAt: new Date().toISOString(),
      platform: 'aspendos',
      version: '1.0.0',
      conversations: processedConversations,
      totalConversations: processedConversations.length,
      totalMessages,
      metadata: this.options.includeMetadata ? {
        user: userInfo,
        exportOptions: this.options
      } : undefined
    };
  }

  /**
   * Format conversations as Markdown
   */
  private formatMarkdown(conversations: BaseConversation[]): MarkdownExport {
    const totalMessages = conversations.reduce(
      (total, conv) => total + conv.messages.length, 
      0
    );

    let content = `# Chat Export\n\n`;
    content += `**Exported:** ${new Date().toLocaleDateString()}\n`;
    content += `**Total Conversations:** ${conversations.length}\n`;
    content += `**Total Messages:** ${totalMessages}\n\n`;

    // Table of Contents
    if (conversations.length > 1) {
      content += `## Table of Contents\n\n`;
      conversations.forEach((conv, index) => {
        const title = conv.title || `Conversation ${index + 1}`;
        const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        content += `${index + 1}. [${title}](#${anchor})\n`;
      });
      content += `\n`;
    }

    // Conversations
    conversations.forEach((conv, convIndex) => {
      const title = conv.title || `Conversation ${convIndex + 1}`;
      content += `## ${title}\n\n`;
      
      if (this.options.includeMetadata) {
        content += `**Created:** ${new Date(conv.createdAt).toLocaleString()}\n`;
        content += `**Updated:** ${new Date(conv.updatedAt).toLocaleString()}\n`;
        content += `**Messages:** ${conv.messages.length}\n\n`;
      }

      conv.messages.forEach((msg, msgIndex) => {
        const roleLabel = msg.role === 'user' ? '**You**' : 
                         msg.role === 'assistant' ? '**AI**' : 
                         '**System**';
        
        content += `### ${roleLabel}\n`;
        
        if (this.options.includeTimestamps) {
          content += `*${new Date(msg.timestamp).toLocaleString()}*\n\n`;
        }
        
        // Format message content
        content += `${msg.content}\n\n`;
        
        // Add metadata if requested
        if (this.options.includeMetadata && msg.metadata) {
          const metadata = msg.metadata;
          if (metadata.model) content += `*Model: ${metadata.model}*\n`;
          if (metadata.tokens) content += `*Tokens: ${metadata.tokens}*\n`;
          if (metadata.cost) content += `*Cost: $${metadata.cost}*\n`;
          content += `\n`;
        }
      });

      // Add separator between conversations
      if (convIndex < conversations.length - 1) {
        content += `---\n\n`;
      }
    });

    return {
      content,
      metadata: {
        title: 'Chat Export',
        exportedAt: new Date().toISOString(),
        totalConversations: conversations.length,
        totalMessages
      }
    };
  }

  /**
   * Format conversations as CSV
   */
  private formatCSV(conversations: BaseConversation[]): string {
    const rows: CSVRow[] = [];
    
    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        rows.push({
          conversationId: conv.id || '',
          conversationTitle: conv.title,
          messageId: msg.id || '',
          role: msg.role,
          content: this.sanitizeCSVContent(msg.content),
          timestamp: new Date(msg.timestamp).toISOString(),
          createdAt: new Date(conv.createdAt).toISOString(),
          model: msg.metadata?.model || '',
          tokens: msg.metadata?.tokens || 0,
          cost: msg.metadata?.cost || 0
        });
      });
    });

    // Generate CSV headers
    const headers: (keyof CSVRow)[] = [
      'conversationId', 'conversationTitle', 'messageId', 'role', 'content', 
      'timestamp', 'createdAt'
    ];
    
    if (this.options.includeMetadata) {
      headers.push('model', 'tokens', 'cost');
    }

    // Generate CSV content
    let csv = headers.join(',') + '\n';
    
    rows.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape and quote CSV values
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value?.toString() || '';
      });
      csv += values.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Format conversations as PDF (returns HTML for PDF generation)
   */
  private async formatPDF(
    conversations: BaseConversation[], 
    options: PDFExportOptions
  ): Promise<string> {
    const totalMessages = conversations.reduce(
      (total, conv) => total + conv.messages.length, 
      0
    );

    const theme = options.theme || 'light';
    const fontSize = options.fontSize || 12;
    const fontFamily = options.fontFamily || 'system-ui, -apple-system, sans-serif';

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Chat Export</title>
    <style>
        body {
            font-family: ${fontFamily};
            font-size: ${fontSize}px;
            line-height: 1.6;
            margin: 20px;
            color: ${theme === 'dark' ? '#ffffff' : '#000000'};
            background-color: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid ${theme === 'dark' ? '#444444' : '#cccccc'};
        }
        
        .toc {
            margin: 20px 0;
            padding: 20px;
            background-color: ${theme === 'dark' ? '#2a2a2a' : '#f8f9fa'};
            border-radius: 8px;
        }
        
        .conversation {
            margin: 30px 0;
            ${options.pageBreakBetweenConversations ? 'page-break-before: always;' : ''}
        }
        
        .conversation-header {
            margin-bottom: 20px;
            padding: 15px;
            background-color: ${theme === 'dark' ? '#2a2a2a' : '#e9ecef'};
            border-radius: 8px;
        }
        
        .message {
            margin: 15px 0;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid;
        }
        
        .message.user {
            background-color: ${theme === 'dark' ? '#1e3a5f' : '#e3f2fd'};
            border-left-color: ${theme === 'dark' ? '#2196f3' : '#1976d2'};
        }
        
        .message.assistant {
            background-color: ${theme === 'dark' ? '#2e3a2e' : '#f1f8e9'};
            border-left-color: ${theme === 'dark' ? '#4caf50' : '#388e3c'};
        }
        
        .message.system {
            background-color: ${theme === 'dark' ? '#3a2e2e' : '#fff3e0'};
            border-left-color: ${theme === 'dark' ? '#ff9800' : '#f57c00'};
        }
        
        .message-header {
            font-weight: bold;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .message-content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .metadata {
            font-size: 0.85em;
            color: ${theme === 'dark' ? '#cccccc' : '#666666'};
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid ${theme === 'dark' ? '#444444' : '#eeeeee'};
        }
        
        @media print {
            body { margin: 0; }
            .conversation { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Chat Export</h1>
        <p><strong>Exported:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Conversations:</strong> ${conversations.length}</p>
        <p><strong>Total Messages:</strong> ${totalMessages}</p>
    </div>
`;

    // Table of Contents
    if (options.includeToc && conversations.length > 1) {
      html += `
    <div class="toc">
        <h2>Table of Contents</h2>
        <ul>
`;
      conversations.forEach((conv, index) => {
        const title = conv.title || `Conversation ${index + 1}`;
        html += `            <li><a href="#conv-${index}">${title}</a></li>\n`;
      });
      html += `        </ul>
    </div>
`;
    }

    // Conversations
    conversations.forEach((conv, convIndex) => {
      const title = conv.title || `Conversation ${convIndex + 1}`;
      
      html += `
    <div class="conversation" id="conv-${convIndex}">
        <div class="conversation-header">
            <h2>${this.escapeHtml(title)}</h2>
`;
      
      if (this.options.includeMetadata) {
        html += `
            <p><strong>Created:</strong> ${new Date(conv.createdAt).toLocaleString()}</p>
            <p><strong>Updated:</strong> ${new Date(conv.updatedAt).toLocaleString()}</p>
            <p><strong>Messages:</strong> ${conv.messages.length}</p>
`;
      }
      
      html += `        </div>\n`;

      conv.messages.forEach(msg => {
        const roleLabel = msg.role === 'user' ? 'You' : 
                         msg.role === 'assistant' ? 'AI' : 
                         'System';
        
        html += `
        <div class="message ${msg.role}">
            <div class="message-header">
                <span>${roleLabel}</span>
`;
        
        if (this.options.includeTimestamps) {
          html += `                <span>${new Date(msg.timestamp).toLocaleString()}</span>\n`;
        }
        
        html += `            </div>
            <div class="message-content">${this.escapeHtml(msg.content)}</div>
`;
        
        // Add metadata if requested
        if (this.options.includeMetadata && msg.metadata) {
          html += `            <div class="metadata">\n`;
          if (msg.metadata.model) html += `                <span>Model: ${msg.metadata.model}</span><br>\n`;
          if (msg.metadata.tokens) html += `                <span>Tokens: ${msg.metadata.tokens}</span><br>\n`;
          if (msg.metadata.cost) html += `                <span>Cost: $${msg.metadata.cost}</span><br>\n`;
          html += `            </div>\n`;
        }
        
        html += `        </div>\n`;
      });

      html += `    </div>\n`;
    });

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Sanitize content for CSV format
   */
  private sanitizeCSVContent(content: string): string {
    return content
      .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate export statistics
   */
  static generateStats(conversations: BaseConversation[]): {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    oldestConversation: Date | null;
    newestConversation: Date | null;
    platformBreakdown: Record<string, number>;
    messagesByRole: Record<string, number>;
    timeRange: {
      start: Date | null;
      end: Date | null;
      durationDays: number;
    };
  } {
    const totalMessages = conversations.reduce(
      (total, conv) => total + conv.messages.length, 
      0
    );

    const platforms: Record<string, number> = {};
    const roles: Record<string, number> = {};
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;

    conversations.forEach(conv => {
      // Track platforms
      const platform = conv.metadata?.platform || 'unknown';
      platforms[platform] = (platforms[platform] || 0) + 1;

      // Track message roles
      conv.messages.forEach(msg => {
        roles[msg.role] = (roles[msg.role] || 0) + 1;
      });

      // Track date range
      const convDate = new Date(conv.createdAt);
      if (!oldestDate || convDate < oldestDate) oldestDate = convDate;
      if (!newestDate || convDate > newestDate) newestDate = convDate;
    });

    const durationDays = oldestDate && newestDate ? 
      Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      totalConversations: conversations.length,
      totalMessages,
      averageMessagesPerConversation: conversations.length > 0 ? 
        Math.round(totalMessages / conversations.length * 100) / 100 : 0,
      oldestConversation: oldestDate,
      newestConversation: newestDate,
      platformBreakdown: platforms,
      messagesByRole: roles,
      timeRange: {
        start: oldestDate,
        end: newestDate,
        durationDays
      }
    };
  }
}