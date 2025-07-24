export class SSEFormatter {
  /**
   * Format data for Server-Sent Events with proper escaping
   */
  static formatChunk(data: any): string {
    // Properly escape SSE data
    const jsonStr = JSON.stringify(data);
    
    // SSE requires special handling for newlines and carriage returns
    const escaped = jsonStr
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    
    return `data: ${escaped}\n\n`;
  }

  /**
   * Parse SSE events from raw chunk data
   */
  static parseSSE(chunk: string): any[] {
    const events: any[] = [];
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = line.slice(6);
          // Unescape the data
          const unescaped = data
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t');
          
          events.push(JSON.parse(unescaped));
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      }
    }
    
    return events;
  }

  /**
   * Format a completion event
   */
  static formatDone(messageId: string, chatId: string): string {
    return this.formatChunk({
      type: 'done',
      chatId,
      messageId,
      timestamp: Date.now()
    });
  }

  /**
   * Format an error event
   */
  static formatError(error: string, messageId: string, chatId: string): string {
    return this.formatChunk({
      type: 'error',
      content: error,
      chatId,
      messageId,
      timestamp: Date.now()
    });
  }

  /**
   * Format a text chunk event
   */
  static formatTextChunk(
    content: string, 
    id: string, 
    chatId: string, 
    messageId: string,
    complete: boolean = false
  ): string {
    return this.formatChunk({
      id,
      chatId,
      messageId,
      type: 'text',
      content,
      complete,
      timestamp: Date.now()
    });
  }

  /**
   * Format a code chunk event
   */
  static formatCodeChunk(
    content: string,
    language: string,
    id: string,
    chatId: string,
    messageId: string,
    complete: boolean = false
  ): string {
    return this.formatChunk({
      id,
      chatId,
      messageId,
      type: 'code',
      content,
      language,
      complete,
      timestamp: Date.now()
    });
  }

  /**
   * Format a memory context event
   */
  static formatMemoryContext(
    content: string,
    chatId: string,
    messageId: string,
    metadata?: any,
    complete: boolean = false
  ): string {
    return this.formatChunk({
      type: 'memory_context',
      content,
      chatId,
      messageId,
      complete,
      metadata,
      timestamp: Date.now()
    });
  }

  /**
   * Safely escape content for JSON serialization
   */
  static escapeContent(content: string): string {
    return content
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\b/g, '\\b')
      .replace(/\f/g, '\\f');
  }

  /**
   * Validate that content is safe for streaming
   */
  static validateContent(content: string): boolean {
    try {
      // Test if content can be safely JSON stringified
      JSON.stringify({ content });
      return true;
    } catch (error) {
      console.warn('Content validation failed:', error);
      return false;
    }
  }
}