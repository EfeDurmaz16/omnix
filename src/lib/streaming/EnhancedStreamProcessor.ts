export interface MarkdownElement {
  type: 'heading' | 'list-item' | 'text' | 'code-block' | 'inline-code';
  content: string;
  language?: string;
  level?: number;
}

export interface ProcessedChunk {
  type: 'text' | 'code-complete' | 'code-partial' | 'markdown';
  content?: string;
  language?: string;
  raw?: string | null;
  elements?: MarkdownElement[];
  remaining?: string;
}

export interface ExtractedElements {
  content: string;
  elements: MarkdownElement[];
}

export interface CodeBlock {
  language: string;
  content: string;
}

export class EnhancedStreamProcessor {
  private buffer = '';
  private codeBlockBuffer = '';
  private inCodeBlock = false;
  private codeBlockLanguage = '';
  private markdownElements: MarkdownElement[] = [];

  processChunk(chunk: string): ProcessedChunk {
    this.buffer += chunk;
    
    // Handle code blocks specially
    if (this.detectCodeBlockStart()) {
      return this.processCodeBlockStart();
    }
    
    if (this.inCodeBlock) {
      return this.processCodeBlockContent();
    }
    
    // Process regular markdown
    return this.processMarkdown();
  }

  private detectCodeBlockStart(): boolean {
    // Look for complete code fence with language
    const codeBlockRegex = /```(\w+)?\n/;
    const match = this.buffer.match(codeBlockRegex);
    
    if (match && !this.inCodeBlock) {
      this.inCodeBlock = true;
      this.codeBlockLanguage = match[1] || 'plaintext';
      this.codeBlockBuffer = '';
      
      // Remove the fence from buffer
      const index = this.buffer.indexOf(match[0]);
      this.buffer = this.buffer.substring(index + match[0].length);
      
      return true;
    }
    
    return false;
  }

  private processCodeBlockStart(): ProcessedChunk {
    return {
      type: 'code-partial',
      language: this.codeBlockLanguage,
      content: '',
      raw: null
    };
  }

  private processCodeBlockContent(): ProcessedChunk {
    // Look for closing fence
    const closingIndex = this.buffer.indexOf('```');
    
    if (closingIndex !== -1) {
      // Complete code block found
      this.codeBlockBuffer += this.buffer.substring(0, closingIndex);
      this.buffer = this.buffer.substring(closingIndex + 3);
      this.inCodeBlock = false;
      
      const result: ProcessedChunk = {
        type: 'code-complete',
        language: this.codeBlockLanguage,
        content: this.codeBlockBuffer,
        raw: `\`\`\`${this.codeBlockLanguage}\n${this.codeBlockBuffer}\n\`\`\``
      };
      
      // Reset for next code block
      this.codeBlockBuffer = '';
      this.codeBlockLanguage = '';
      
      return result;
    } else {
      // Still collecting code
      this.codeBlockBuffer += this.buffer;
      this.buffer = '';
      
      return {
        type: 'code-partial',
        language: this.codeBlockLanguage,
        content: this.codeBlockBuffer,
        raw: null // Don't render partial code blocks
      };
    }
  }

  private processMarkdown(): ProcessedChunk {
    // Process complete markdown elements only
    const processed = this.extractCompleteElements();
    
    return {
      type: 'markdown',
      content: processed.content,
      elements: processed.elements,
      remaining: this.buffer
    };
  }

  private extractCompleteElements(): ExtractedElements {
    const elements: MarkdownElement[] = [];
    let processedContent = '';
    
    // Process line by line for better control
    const lines = this.buffer.split('\n');
    const completeLines = lines.slice(0, -1); // Keep last line in buffer
    
    for (const line of completeLines) {
      if (line.trim().startsWith('#')) {
        const level = (line.match(/^#+/) || [''])[0].length;
        elements.push({ 
          type: 'heading', 
          content: line,
          level 
        });
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push({ type: 'list-item', content: line });
      } else if (line.includes('`') && !line.includes('```')) {
        // Handle inline code
        const processed = this.processInlineCode(line);
        elements.push({ type: 'text', content: processed });
      } else {
        elements.push({ type: 'text', content: line });
      }
      
      processedContent += line + '\n';
    }
    
    // Update buffer to keep only incomplete last line
    this.buffer = lines[lines.length - 1] || '';
    
    return { content: processedContent, elements };
  }

  private processInlineCode(line: string): string {
    // Ensure inline code blocks are complete
    const parts = line.split('`');
    
    if (parts.length % 2 === 0) {
      // Incomplete inline code, wait for more
      return line;
    }
    
    // Complete inline code blocks
    return line;
  }

  finalize(content: string): string {
    // Fix any broken markdown elements
    let fixed = content;
    
    // Fix incomplete code blocks
    fixed = fixed.replace(/```(\w+)?([^`]*)$/g, (match, lang, code) => {
      return `\`\`\`${lang || ''}\n${code}\n\`\`\``;
    });
    
    // Fix incomplete inline code
    const backtickCount = (fixed.match(/`/g) || []).length;
    if (backtickCount % 2 !== 0) {
      fixed += '`';
    }
    
    // Fix unclosed markdown elements
    fixed = this.fixUnclosedElements(fixed);
    
    return fixed;
  }

  private fixUnclosedElements(content: string): string {
    // Stack-based approach to fix unclosed elements
    const lines = content.split('\n');
    const fixed: string[] = [];
    const openElements: string[] = [];
    
    for (const line of lines) {
      fixed.push(line);
      
      // Track open elements
      if (line.trim().startsWith('```')) {
        if (openElements[openElements.length - 1] === 'code') {
          openElements.pop();
        } else {
          openElements.push('code');
        }
      }
    }
    
    // Close any remaining open elements
    while (openElements.length > 0) {
      const element = openElements.pop();
      if (element === 'code') {
        fixed.push('```');
      }
    }
    
    return fixed.join('\n');
  }
}