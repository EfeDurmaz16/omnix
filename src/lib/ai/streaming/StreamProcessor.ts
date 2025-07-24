import { Response } from 'express';

export interface StreamChunk {
  id: string;
  chatId: string;
  type: 'text' | 'code' | 'json' | 'thinking' | 'tool_call' | 'memory_context';
  content: string;
  language?: string;
  complete?: boolean;
  metadata?: any;
}

export interface StreamState {
  currentBlock: StreamChunk | null;
  buffer: string;
  jsonDepth: number;
  codeBlockDelimiter: string;
  state: 'text' | 'code' | 'json' | 'thinking' | 'tool_call';
  messageId: string;
}

export class StreamProcessor {
  private state: StreamState;
  private chunkQueue: string[] = [];
  private isProcessing = false;
  private tokenDelay = 30; // ms between tokens for smooth effect

  constructor(
    private response: Response,
    private chatId: string,
    private messageId: string
  ) {
    this.state = {
      currentBlock: null,
      buffer: '',
      jsonDepth: 0,
      codeBlockDelimiter: '',
      state: 'text',
      messageId
    };
  }

  async processChunk(chunk: string) {
    // Add to queue for smooth token-by-token streaming
    this.chunkQueue.push(chunk);
    
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue() {
    this.isProcessing = true;

    while (this.chunkQueue.length > 0) {
      const chunk = this.chunkQueue.shift()!;
      await this.processChunkInternal(chunk);
      
      // Small delay for smooth streaming effect
      await this.delay(this.tokenDelay);
    }

    this.isProcessing = false;
  }

  private async processChunkInternal(chunk: string) {
    this.state.buffer += chunk;
    
    // Process buffer character by character for real-time detection
    while (this.state.buffer.length > 0) {
      const processed = await this.detectAndProcessContent();
      if (!processed) break;
    }
  }

  private isStructuredJSON(buffer: string): boolean {
    // Only process JSON that starts with { or [
    if (!buffer.startsWith('{') && !buffer.startsWith('[')) {
      return false;
    }

    // Specifically look for system-generated JSON patterns (memory context, chunks, etc.)
    const systemJSONPatterns = [
      /^\{\s*"type"\s*:\s*"memory_context"/, // Memory context chunks
      /^\{\s*"type"\s*:\s*"json"/, // JSON chunks
      /^\{\s*"type"\s*:\s*"error"/, // Error chunks
      /^\{\s*"id"\s*:\s*"chunk_/, // Stream chunks with IDs
      /^\{\s*"chatId"\s*:/, // Chat-related structures
      /^\{\s*"complete"\s*:/, // Completion status structures
      /^\{\s*"metadata"\s*:/, // Metadata structures
    ];

    return systemJSONPatterns.some(pattern => pattern.test(buffer));
  }

  private async detectAndProcessContent(): Promise<boolean> {
    const buffer = this.state.buffer;

    // Detect markdown code blocks
    if (buffer.startsWith('```')) {
      return await this.processCodeBlock();
    }

    // Smart detection for raw code patterns
    if (this.detectRawCode(buffer)) {
      return await this.processRawCodeAsBlock();
    }

    // Process JSON for structured data (memory context, system messages) but not regular AI text
    if (this.state.state === 'text' && this.isStructuredJSON(buffer)) {
      return await this.processJSON();
    }

    // Detect thinking blocks (Claude-style)
    if (buffer.startsWith('<thinking>') || buffer.startsWith('<think>')) {
      return await this.processThinkingBlock();
    }

    // Detect tool calls
    if (buffer.startsWith('<tool_call>') || buffer.includes('function_call')) {
      return await this.processToolCall();
    }

    // Process regular text
    return await this.processText();
  }

  private detectRawCode(buffer: string): boolean {
    // Common code patterns that indicate raw code without fences
    const codePatterns = [
      /^import\s+\w+/,                    // import statements
      /^const\s+\w+\s*=/,                 // const declarations
      /^let\s+\w+\s*=/,                   // let declarations
      /^var\s+\w+\s*=/,                   // var declarations
      /^function\s+\w+\s*\(/,             // function declarations
      /^class\s+\w+/,                     // class declarations
      /^export\s+(default\s+)?/,          // export statements
      /^\/\/.*$|^\/\*[\s\S]*?\*\//m,      // comments
      /^\s*<[A-Z]\w*(\s|>)/,              // JSX components
      /^def\s+\w+\s*\(/,                  // Python functions
      /^from\s+\w+\s+import/,             // Python imports
      /^#include\s*<\w+>/,                // C/C++ includes
      /^public\s+(class|interface)/,      // Java/C# public declarations
    ];

    // Check if buffer starts with any code pattern
    const startsWithCode = codePatterns.some(pattern => pattern.test(buffer.trim()));
    
    // Additional check: if we have multiple lines that look like code
    if (!startsWithCode && buffer.includes('\n')) {
      const lines = buffer.split('\n').filter(line => line.trim());
      const codeLines = lines.filter(line => 
        codePatterns.some(pattern => pattern.test(line.trim()))
      );
      
      // If more than 30% of lines look like code, treat as raw code
      return codeLines.length / lines.length > 0.3;
    }
    
    return startsWithCode;
  }

  private async processRawCodeAsBlock(): Promise<boolean> {
    // Auto-detect language based on patterns
    const language = this.detectCodeLanguage(this.state.buffer);
    
    // Look for natural end of code block (double newline or clear text)
    const naturalEnd = this.findCodeBlockEnd(this.state.buffer);
    
    if (naturalEnd !== -1) {
      const codeContent = this.state.buffer.substring(0, naturalEnd);
      
      await this.sendChunk({
        id: this.generateChunkId(),
        chatId: this.chatId,
        type: 'code',
        content: codeContent,
        language,
        complete: true
      });
      
      this.state.buffer = this.state.buffer.substring(naturalEnd);
      return true;
    } else if (this.state.buffer.length > 100) {
      // Send partial code to avoid blocking
      const lines = this.state.buffer.split('\n');
      const completeLines = lines.slice(0, -1);
      
      if (completeLines.length > 0) {
        const partialCode = completeLines.join('\n') + '\n';
        
        await this.sendChunk({
          id: this.generateChunkId(),
          chatId: this.chatId,
          type: 'code',
          content: partialCode,
          language,
          complete: false
        });
        
        this.state.buffer = lines[lines.length - 1] || '';
        return true;
      }
    }
    
    return false;
  }

  private detectCodeLanguage(code: string): string {
    // Language detection based on patterns
    if (/import\s+React|from\s+['"]react['"]|<\w+.*>/i.test(code)) return 'jsx';
    if (/import.*from\s+['"]|export\s+(default\s+)?/i.test(code)) return 'javascript';
    if (/def\s+\w+|import\s+\w+|from\s+\w+\s+import/i.test(code)) return 'python';
    if (/#include|int\s+main|cout\s*<<|cin\s*>>/i.test(code)) return 'cpp';
    if (/public\s+class|public\s+static\s+void\s+main/i.test(code)) return 'java';
    if (/<\?php|echo\s+|print\s+/i.test(code)) return 'php';
    if (/function\s+\w+|var\s+\w+|let\s+\w+|const\s+\w+/i.test(code)) return 'javascript';
    
    return 'plaintext';
  }

  private findCodeBlockEnd(buffer: string): number {
    // Look for patterns that suggest end of code
    const endPatterns = [
      /\n\n[A-Z][^a-z]*[.!?]\s/,  // Double newline followed by sentence
      /\n\n##?\s+/,                // Double newline followed by heading
      /\n\n\*\*/,                  // Double newline followed by bold text
      /\n\n\d+\./,                 // Double newline followed by numbered list
    ];
    
    for (const pattern of endPatterns) {
      const match = buffer.match(pattern);
      if (match) {
        return match.index! + 2; // Return position after double newline
      }
    }
    
    return -1;
  }

  private async processText(): Promise<boolean> {
    const specialPatterns = ['```', '{', '[', '<thinking>', '<think>', '<tool_call>', '\n\n'];
    let nearestIndex = this.state.buffer.length;

    for (const pattern of specialPatterns) {
      const index = this.state.buffer.indexOf(pattern);
      if (index !== -1 && index < nearestIndex && index > 0) {
        nearestIndex = index;
      }
    }

    // Ensure we have complete markdown elements before sending
    let text = nearestIndex > 0 ? this.state.buffer.substring(0, nearestIndex) : this.state.buffer;
    
    // Wait for complete markdown elements to prevent breaking syntax
    if (this.isIncompleteMarkdown(text)) {
      return false; // Wait for more content
    }

    if (text) {
      await this.sendChunk({
        id: this.generateChunkId(),
        chatId: this.chatId,
        type: 'text',
        content: text,
        complete: false
      });
      
      this.state.buffer = this.state.buffer.substring(text.length);
      return true;
    }

    return false;
  }

  private isIncompleteMarkdown(text: string): boolean {
    // Check for incomplete code block delimiters
    if (text.endsWith('`') || text.endsWith('``')) {
      return true;
    }
    
    // Check for incomplete code blocks with language specifier
    const codeBlockStart = /```\w*$/;
    if (codeBlockStart.test(text)) {
      return true;
    }
    
    // Check for other incomplete markdown patterns
    const incompletePatterns = [
      /\*$/,           // Incomplete italic/bold
      /_$/,            // Incomplete italic/bold
      /\[$/,           // Incomplete link
      /!\[$/,          // Incomplete image
      /<$/,            // Incomplete HTML tag
    ];
    
    return incompletePatterns.some(pattern => pattern.test(text));
  }

  private async processCodeBlock(): Promise<boolean> {
    const match = this.state.buffer.match(/^```(\w*)\n/);
    if (match) {
      const language = match[1] || 'plaintext';
      this.state.state = 'code';
      this.state.codeBlockDelimiter = '```';
      this.state.buffer = this.state.buffer.substring(match[0].length);
      
      // Start code block
      this.state.currentBlock = {
        id: this.generateChunkId(),
        chatId: this.chatId,
        type: 'code',
        content: '',
        language
      };
      
      await this.sendChunk({
        ...this.state.currentBlock,
        complete: false
      });
      
      return true;
    }

    // Inside code block
    if (this.state.state === 'code') {
      const endIndex = this.state.buffer.indexOf('\n```');
      if (endIndex !== -1) {
        // Complete code block
        const code = this.state.buffer.substring(0, endIndex);
        await this.sendChunk({
          id: this.state.currentBlock?.id || this.generateChunkId(),
          chatId: this.chatId,
          type: 'code',
          content: code,
          language: this.state.currentBlock?.language,
          complete: true
        });
        
        this.state.buffer = this.state.buffer.substring(endIndex + 4);
        this.state.state = 'text';
        this.state.currentBlock = null;
        return true;
      } else {
        // Stream partial code - send line by line for better UX
        const newlineIndex = this.state.buffer.lastIndexOf('\n');
        if (newlineIndex !== -1) {
          const partialCode = this.state.buffer.substring(0, newlineIndex + 1);
          await this.sendChunk({
            id: this.state.currentBlock?.id || this.generateChunkId(),
            chatId: this.chatId,
            type: 'code',
            content: partialCode,
            language: this.state.currentBlock?.language,
            complete: false
          });
          
          this.state.buffer = this.state.buffer.substring(newlineIndex + 1);
          return true;
        }
      }
    }

    return false;
  }

  private async processJSON(): Promise<boolean> {
    let i = 0;
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let jsonStart = -1;

    // Parse JSON with proper string handling
    while (i < this.state.buffer.length) {
      const char = this.state.buffer[i];

      if (!inString) {
        if (char === '{' || char === '[') {
          if (jsonStart === -1) jsonStart = i;
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
          if (depth === 0 && jsonStart !== -1) {
            // Complete JSON found
            const jsonStr = this.state.buffer.substring(jsonStart, i + 1);
            try {
              const parsed = JSON.parse(jsonStr);
              await this.sendChunk({
                id: this.generateChunkId(),
                chatId: this.chatId,
                type: 'json',
                content: jsonStr,
                complete: true,
                metadata: { parsed }
              });
              
              this.state.buffer = this.state.buffer.substring(i + 1);
              return true;
            } catch {
              // Invalid JSON, treat as text
              await this.sendChunk({
                id: this.generateChunkId(),
                chatId: this.chatId,
                type: 'text',
                content: this.state.buffer.substring(0, 1),
                complete: false
              });
              
              this.state.buffer = this.state.buffer.substring(1);
              return true;
            }
          }
        } else if (char === '"' && !escapeNext) {
          inString = true;
        }
      } else {
        if (char === '"' && !escapeNext) {
          inString = false;
        }
      }

      escapeNext = !escapeNext && char === '\\';
      i++;
    }

    // Send partial JSON preview if we have substantial content
    if (jsonStart !== -1 && this.state.buffer.length > 50) {
      const partialJson = this.state.buffer.substring(jsonStart);
      const previewParsed = this.tryParsePartialJSON(partialJson);
      
      await this.sendChunk({
        id: this.generateChunkId(),
        chatId: this.chatId,
        type: 'json',
        content: partialJson,
        complete: false,
        metadata: { 
          preview: previewParsed,
          partial: true 
        }
      });
      
      this.state.buffer = '';
      return true;
    }

    return false;
  }

  private async processThinkingBlock(): Promise<boolean> {
    const startTag = this.state.buffer.match(/^<(thinking|think)>/);
    if (!startTag) return false;

    const tag = startTag[1];
    const endTag = `</${tag}>`;
    const endIndex = this.state.buffer.indexOf(endTag);
    
    if (endIndex !== -1) {
      const thinking = this.state.buffer.substring(startTag[0].length, endIndex);
      await this.sendChunk({
        id: this.generateChunkId(),
        chatId: this.chatId,
        type: 'thinking',
        content: thinking,
        complete: true
      });
      
      this.state.buffer = this.state.buffer.substring(endIndex + endTag.length);
      return true;
    } else if (this.state.buffer.length > startTag[0].length + 20) {
      // Send partial thinking content
      const partialThinking = this.state.buffer.substring(startTag[0].length);
      await this.sendChunk({
        id: this.generateChunkId(),
        chatId: this.chatId,
        type: 'thinking',
        content: partialThinking,
        complete: false
      });
      
      this.state.buffer = startTag[0];
      return true;
    }
    
    return false;
  }

  private async processToolCall(): Promise<boolean> {
    const endIndex = this.state.buffer.indexOf('</tool_call>');
    if (endIndex !== -1) {
      const toolCall = this.state.buffer.substring(11, endIndex);
      await this.sendChunk({
        id: this.generateChunkId(),
        chatId: this.chatId,
        type: 'tool_call',
        content: toolCall,
        complete: true
      });
      
      this.state.buffer = this.state.buffer.substring(endIndex + 12);
      return true;
    }
    
    return false;
  }

  private async sendChunk(chunk: StreamChunk) {
    const event = {
      ...chunk,
      timestamp: Date.now(),
      messageId: this.state.messageId
    };
    
    // Debug: Log what we're sending to frontend  
    console.log('📤 Chunk:', JSON.stringify(chunk.content));
    
    if (chunk.content.includes('`')) {
      console.log('🔥 BACKTICKS DETECTED:', { 
        content: chunk.content, 
        backtickCount: (chunk.content.match(/`/g) || []).length,
        type: chunk.type 
      });
    }
    
    // Use SSEFormatter for proper escaping
    const { SSEFormatter } = await import('@/lib/streaming/SSEFormatter');
    this.response.write(SSEFormatter.formatChunk(event));
  }

  private tryParsePartialJSON(str: string): any {
    try {
      return JSON.parse(str);
    } catch {
      // Try to fix incomplete JSON
      let fixed = str.trim();
      
      // Count braces/brackets
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;
      
      // Add missing closing braces/brackets
      fixed += ']'.repeat(openBrackets - closeBrackets);
      fixed += '}'.repeat(openBraces - closeBraces);
      
      try {
        return JSON.parse(fixed);
      } catch {
        // Extract key-value pairs
        const keyValuePattern = /"([^"]+)":\s*([^,}]+)/g;
        const result: any = {};
        let match;
        
        while ((match = keyValuePattern.exec(str)) !== null) {
          const [, key, value] = match;
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value.trim();
          }
        }
        
        return Object.keys(result).length > 0 ? result : null;
      }
    }
  }


  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async finish() {
    // Post-process any remaining buffer to fix incomplete markdown
    if (this.state.buffer.length > 0) {
      const processedBuffer = this.fixIncompleteMarkdown(this.state.buffer);
      
      await this.sendChunk({
        id: this.generateChunkId(),
        chatId: this.chatId,
        type: 'text',
        content: processedBuffer,
        complete: true
      });
    }
    
    // Send completion event using SSEFormatter
    const { SSEFormatter } = await import('@/lib/streaming/SSEFormatter');
    this.response.write(SSEFormatter.formatDone(this.state.messageId, this.chatId));
  }

  private fixIncompleteMarkdown(content: string): string {
    let fixed = content;
    
    // Fix incomplete code blocks - if we have opening ``` without closing
    const codeBlockMatches = content.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      console.log('🔧 Fixing incomplete code block by adding closing fence');
      fixed += '\n```';
    }
    
    // Fix incomplete inline code - only if we have odd number of single backticks not part of code blocks
    const codeBlockText = content.replace(/```[\s\S]*?```/g, ''); // Remove code blocks
    const inlineBackticks = (codeBlockText.match(/`/g) || []).length;
    if (inlineBackticks % 2 !== 0) {
      console.log('🔧 Fixing incomplete inline code by adding closing backtick');
      fixed += '`';
    }
    
    return fixed;
  }

  setTokenDelay(delay: number) {
    this.tokenDelay = delay;
  }
}