'use client';

import { useEffect, useState } from 'react';

export interface DetectedCodeBlock {
  id: string;
  code: string;
  language: string;
  isRunnable: boolean;
  startIndex: number;
  endIndex: number;
}

export const useCodeDetection = (content: string) => {
  const [codeBlocks, setCodeBlocks] = useState<DetectedCodeBlock[]>([]);
  const [hasRunnableCode, setHasRunnableCode] = useState(false);

  const isRunnableLanguage = (language: string): boolean => {
    const runnableLanguages = [
      'html', 'javascript', 'js', 'jsx', 'tsx', 'react', 'css', 'typescript', 'ts'
    ];
    return runnableLanguages.includes(language.toLowerCase());
  };

  const detectLanguage = (lang: string | undefined, code: string): string => {
    if (lang) return lang;
    
    // Auto-detect language based on code content
    const lowerCode = code.toLowerCase();
    
    // HTML detection
    if (lowerCode.includes('<!doctype') || lowerCode.includes('<html>') || 
        lowerCode.includes('<head>') || lowerCode.includes('<body>')) {
      return 'html';
    }
    
    // React/JSX detection
    if (lowerCode.includes('import react') || lowerCode.includes('from \'react\'') ||
        lowerCode.includes('usestate') || lowerCode.includes('useeffect') ||
        lowerCode.includes('return (') || lowerCode.includes('<div') ||
        lowerCode.includes('function app') || lowerCode.includes('const app')) {
      return 'jsx';
    }
    
    // CSS detection
    if (lowerCode.includes('{') && lowerCode.includes('}') && 
        (lowerCode.includes('color:') || lowerCode.includes('background:') ||
         lowerCode.includes('font-') || lowerCode.includes('margin:') ||
         lowerCode.includes('padding:') || lowerCode.includes('display:'))) {
      return 'css';
    }
    
    // JavaScript detection
    if (lowerCode.includes('function') || lowerCode.includes('const ') ||
        lowerCode.includes('let ') || lowerCode.includes('var ') ||
        lowerCode.includes('console.log') || lowerCode.includes('=>')) {
      return 'javascript';
    }
    
    return 'text';
  };

  useEffect(() => {
    const detectCodeBlocks = (text: string): DetectedCodeBlock[] => {
      const blocks: DetectedCodeBlock[] = [];
      
      // Match fenced code blocks (```language\ncode\n```)
      const fencedCodeRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let match;
      
      while ((match = fencedCodeRegex.exec(text)) !== null) {
        const language = detectLanguage(match[1], match[2]);
        const code = match[2].trim();
        
        if (code) {
          blocks.push({
            id: `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            code,
            language,
            isRunnable: isRunnableLanguage(language),
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      }
      
      // Match inline code blocks (single backticks) that look like HTML/JS
      const inlineCodeRegex = /`([^`]+)`/g;
      let inlineMatch;
      
      while ((inlineMatch = inlineCodeRegex.exec(text)) !== null) {
        const code = inlineMatch[1].trim();
        
        // Only consider inline code as runnable if it looks like HTML tags or JS
        if (code.includes('<') && code.includes('>') && code.length > 10) {
          const language = detectLanguage(undefined, code);
          if (isRunnableLanguage(language)) {
            blocks.push({
              id: `inline-code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              code,
              language,
              isRunnable: true,
              startIndex: inlineMatch.index,
              endIndex: inlineMatch.index + inlineMatch[0].length
            });
          }
        }
      }
      
      return blocks.sort((a, b) => a.startIndex - b.startIndex);
    };

    const blocks = detectCodeBlocks(content);
    setCodeBlocks(blocks);
    setHasRunnableCode(blocks.some(block => block.isRunnable));
  }, [content]);

  const getCodeBlockById = (id: string): DetectedCodeBlock | undefined => {
    return codeBlocks.find(block => block.id === id);
  };

  const getRunnableCodeBlocks = (): DetectedCodeBlock[] => {
    return codeBlocks.filter(block => block.isRunnable);
  };

  return {
    codeBlocks,
    hasRunnableCode,
    getCodeBlockById,
    getRunnableCodeBlocks
  };
};