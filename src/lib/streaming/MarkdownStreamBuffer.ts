/**
 * A streaming-safe markdown buffer that handles partial content intelligently
 * to prevent broken markdown syntax during token-by-token streaming.
 */
import React from 'react';

export interface StreamingBufferState {
  safeContent: string;
  pendingContent: string;
  isComplete: boolean;
}

export class MarkdownStreamBuffer {
  private buffer: string = '';
  private delimiters = {
    codeBlock: '```',
    mathBlock: '$$',
    inlineMath: '$',
    bold: '**',
    italic: '*',
    inlineCode: '`',
    strikethrough: '~~'
  };

  /**
   * Add new token to the buffer and return safe content for rendering
   */
  addToken(token: string): StreamingBufferState {
    this.buffer += token;
    const { safeContent, pendingContent } = this.extractSafeContent();
    
    return {
      safeContent,
      pendingContent,
      isComplete: false
    };
  }

  /**
   * Finalize the buffer and return all content
   */
  finalize(): StreamingBufferState {
    return {
      safeContent: this.buffer,
      pendingContent: '',
      isComplete: true
    };
  }

  /**
   * Extract content that's safe to render vs content that should wait
   */
  private extractSafeContent(): { safeContent: string; pendingContent: string } {
    let safeEndIndex = this.buffer.length;
    
    // Check for incomplete delimiters at the end
    const incompletePatterns = [
      { pattern: /```[^`]*$/, name: 'codeBlock' },
      { pattern: /\$\$[^$]*$/, name: 'mathBlock' },
      { pattern: /\$[^$]*$/, name: 'inlineMath' },
      { pattern: /\*\*[^*]*$/, name: 'bold' },
      { pattern: /(?<!\*)\*(?!\*)([^*]*)$/, name: 'italic' },
      { pattern: /`[^`]*$/, name: 'inlineCode' },
      { pattern: /~~[^~]*$/, name: 'strikethrough' }
    ];

    for (const { pattern } of incompletePatterns) {
      const match = this.buffer.match(pattern);
      if (match && match.index !== undefined) {
        safeEndIndex = Math.min(safeEndIndex, match.index);
      }
    }

    // Also check for incomplete LaTeX commands
    const latexPattern = /\\[a-zA-Z]*$/;
    const latexMatch = this.buffer.match(latexPattern);
    if (latexMatch && latexMatch.index !== undefined) {
      safeEndIndex = Math.min(safeEndIndex, latexMatch.index);
    }

    // Find a safe word boundary to avoid cutting words
    if (safeEndIndex < this.buffer.length) {
      const beforeSafeEnd = this.buffer.substring(0, safeEndIndex);
      const lastSpaceIndex = beforeSafeEnd.lastIndexOf(' ');
      const lastNewlineIndex = beforeSafeEnd.lastIndexOf('\n');
      const lastSafeIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
      
      if (lastSafeIndex > safeEndIndex - 50) { // Don't go too far back
        safeEndIndex = lastSafeIndex + 1;
      }
    }

    return {
      safeContent: this.buffer.substring(0, safeEndIndex),
      pendingContent: this.buffer.substring(safeEndIndex)
    };
  }

  /**
   * Reset the buffer
   */
  reset(): void {
    this.buffer = '';
  }

  /**
   * Get current buffer content
   */
  getCurrentBuffer(): string {
    return this.buffer;
  }
}

/**
 * React hook for using the markdown stream buffer
 */

export function useMarkdownStreamBuffer() {
  const bufferRef = React.useRef(new MarkdownStreamBuffer());
  
  const addToken = React.useCallback((token: string) => {
    return bufferRef.current.addToken(token);
  }, []);

  const finalize = React.useCallback(() => {
    return bufferRef.current.finalize();
  }, []);

  const reset = React.useCallback(() => {
    bufferRef.current.reset();
  }, []);

  return { addToken, finalize, reset };
}