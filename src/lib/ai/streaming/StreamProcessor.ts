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

  private async detectAndProcessContent(): Promise<boolean> {
    const buffer = this.state.buffer;

    // Detect markdown code blocks
    if (buffer.startsWith('```')) {
      return await this.processCodeBlock();
    }

    // Detect JSON structures
    if (this.state.state === 'text' && (buffer.startsWith('{') || buffer.startsWith('['))) {
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

  private async processText(): Promise<boolean> {
    const specialPatterns = ['```', '{', '[', '<thinking>', '<think>', '<tool_call>', '\n\n'];
    let nearestIndex = this.state.buffer.length;

    for (const pattern of specialPatterns) {
      const index = this.state.buffer.indexOf(pattern);
      if (index !== -1 && index < nearestIndex && index > 0) {
        nearestIndex = index;
      }
    }

    // Extract text up to special pattern or in small chunks for smooth streaming
    const chunkSize = Math.min(20, nearestIndex > 0 ? nearestIndex : this.state.buffer.length);
    const text = this.state.buffer.substring(0, chunkSize);

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
    
    this.response.write(`data: ${JSON.stringify(event)}\n\n`);
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
    // Send any remaining buffer as text
    if (this.state.buffer.length > 0) {
      await this.sendChunk({
        id: this.generateChunkId(),
        chatId: this.chatId,
        type: 'text',
        content: this.state.buffer,
        complete: true
      });
    }
    
    // Send completion event
    this.response.write(`data: ${JSON.stringify({ 
      type: 'done',
      chatId: this.chatId,
      messageId: this.state.messageId,
      timestamp: Date.now()
    })}\n\n`);
  }

  setTokenDelay(delay: number) {
    this.tokenDelay = delay;
  }
}