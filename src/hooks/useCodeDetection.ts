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
  const [combinedWebCode, setCombinedWebCode] = useState<string | null>(null);

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

  const combineWebCodeBlocks = (blocks: DetectedCodeBlock[]): string | null => {
    const htmlBlocks = blocks.filter(b => b.language === 'html');
    const cssBlocks = blocks.filter(b => b.language === 'css');
    const jsBlocks = blocks.filter(b => ['javascript', 'js'].includes(b.language));
    
    // If we have at least one web-related block, create a combined HTML
    if (htmlBlocks.length > 0 || cssBlocks.length > 0 || jsBlocks.length > 0) {
      let combinedHTML = '';
      
      // If there's HTML, use it as base
      if (htmlBlocks.length > 0) {
        combinedHTML = htmlBlocks[0].code;
        
        // Debug: log what we're processing
        console.log('🔍 Processing HTML block:', combinedHTML.substring(0, 100) + '...');
        console.log('🔍 Has script tag:', combinedHTML.includes('<script>'));
        
        // Add CSS if not already present
        if (cssBlocks.length > 0 && !combinedHTML.includes('<style>')) {
          const cssCode = cssBlocks.map(b => b.code).join('\n\n');
          combinedHTML = combinedHTML.replace(
            '</head>',
            `  <style>\n${cssCode}\n  </style>\n</head>`
          );
        }
        
        // Always enhance JavaScript, whether from separate blocks or existing script tags
        if (jsBlocks.length > 0 || combinedHTML.includes('<script>')) {
          const jsCode = jsBlocks.map(b => b.code).join('\n\n');
          
          // If HTML already has script tags, enhance them with debugging
          if (combinedHTML.includes('<script>')) {
            console.log('🔍 Found script tag, enhancing...');
            combinedHTML = combinedHTML.replace(
              /<script>([\s\S]*?)<\/script>/g,
              (match, scriptContent) => {
                console.log('🔍 Replacing script content:', scriptContent.substring(0, 50) + '...');
                return `<script>
    // IMMEDIATE TEST - Add a visible indicator that JavaScript is running
    (function() {
      // Create a visible indicator immediately
      const testDiv = document.createElement('div');
      testDiv.innerHTML = '🟢 JavaScript is running!';
      testDiv.style.cssText = 'position: fixed; top: 10px; left: 10px; background: lime; color: black; padding: 10px; border-radius: 5px; font-weight: bold; z-index: 10000;';
      document.body.appendChild(testDiv);
      
      // Debug console that displays messages visually in the iframe
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = function(...args) {
        originalLog.apply(console, args);
        // Create visual debug output
        const debugDiv = document.getElementById('debug-output') || (() => {
          const div = document.createElement('div');
          div.id = 'debug-output';
          div.style.cssText = 'position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.9); color: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; z-index: 10000; max-width: 300px; max-height: 200px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.3);';
          document.body.appendChild(div);
          return div;
        })();
        
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        debugDiv.innerHTML += '<div style="margin: 2px 0; color: #4CAF50;">[LOG] ' + message + '</div>';
        debugDiv.scrollTop = debugDiv.scrollHeight;
      };
      
      console.error = function(...args) {
        originalError.apply(console, args);
        const debugDiv = document.getElementById('debug-output') || (() => {
          const div = document.createElement('div');
          div.id = 'debug-output';
          div.style.cssText = 'position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.9); color: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; z-index: 10000; max-width: 300px; max-height: 200px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.3);';
          document.body.appendChild(div);
          return div;
        })();
        
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        debugDiv.innerHTML += '<div style="margin: 2px 0; color: #f44336;">[ERROR] ' + message + '</div>';
        debugDiv.scrollTop = debugDiv.scrollHeight;
      };
    })();
    
    // Ensure the debug logger is set up first
    console.log('🚀 Debug logger initialized');
    
    // Ensure DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ DOM loaded, initializing JavaScript...');
        initializeEnhancedFunctions();
      });
    } else {
      console.log('✅ DOM already loaded, initializing JavaScript...');
      initializeEnhancedFunctions();
    }
    
    function initializeEnhancedFunctions() {
      try {
        console.log('🔧 Starting JavaScript initialization...');
        
        // Original JavaScript code
        ${scriptContent}
        
        console.log('✅ JavaScript initialization complete!');
        
      } catch (error) {
        console.error('❌ Error initializing JavaScript:', error);
      }
    }
</script>`;
              }
            );
          } else if (jsCode) {
            // No existing script tags, add our wrapper with the JS code
            const wrappedJSCode = `
    // Debug console that displays messages visually in the iframe
    (function() {
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = function(...args) {
        originalLog.apply(console, args);
        // Create visual debug output
        const debugDiv = document.getElementById('debug-output') || (() => {
          const div = document.createElement('div');
          div.id = 'debug-output';
          div.style.cssText = 'position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.9); color: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; z-index: 10000; max-width: 300px; max-height: 200px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.3);';
          document.body.appendChild(div);
          return div;
        })();
        
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        debugDiv.innerHTML += '<div style="margin: 2px 0; color: #4CAF50;">[LOG] ' + message + '</div>';
        debugDiv.scrollTop = debugDiv.scrollHeight;
      };
      
      console.error = function(...args) {
        originalError.apply(console, args);
        const debugDiv = document.getElementById('debug-output') || (() => {
          const div = document.createElement('div');
          div.id = 'debug-output';
          div.style.cssText = 'position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.9); color: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; z-index: 10000; max-width: 300px; max-height: 200px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.3);';
          document.body.appendChild(div);
          return div;
        })();
        
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        debugDiv.innerHTML += '<div style="margin: 2px 0; color: #f44336;">[ERROR] ' + message + '</div>';
        debugDiv.scrollTop = debugDiv.scrollHeight;
      };
    })();
    
    // Ensure the debug logger is set up first
    console.log('🚀 Debug logger initialized');
    
    // Ensure DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ DOM loaded, initializing JavaScript...');
        initializeFunctions();
      });
    } else {
      console.log('✅ DOM already loaded, initializing JavaScript...');
      initializeFunctions();
    }
    
    function initializeFunctions() {
      try {
        console.log('🔧 Starting JavaScript initialization...');
        
        // Original JavaScript code
        ${jsCode}
        
        console.log('✅ JavaScript initialization complete!');
        
      } catch (error) {
        console.error('❌ Error initializing JavaScript:', error);
      }
    }`;
          
          combinedHTML = combinedHTML.replace(
            '</body>',
            `  <script>\n${wrappedJSCode}\n  </script>\n</body>`
          );
        }
      } else {
        // Create HTML from CSS and JS blocks
        const cssCode = cssBlocks.map(b => b.code).join('\n\n');
        const jsCode = jsBlocks.map(b => b.code).join('\n\n');
        
        let scriptContent = '';
        if (jsCode) {
          scriptContent = `
  <script>
    // Ensure DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        initializeFunctions();
      });
    } else {
      initializeFunctions();
    }
    
    function initializeFunctions() {
      try {
        // Original JavaScript code
        ${jsCode}
        
        // Add console output to page
        const originalLog = console.log;
        console.log = function(...args) {
          originalLog.apply(console, args);
          const output = document.getElementById('output');
          if (output) {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            output.innerHTML += '<div style="margin: 5px 0; padding: 5px; background: #f0f0f0; border-radius: 3px;">' + message + '</div>';
          }
        };
        
      } catch (error) {
        console.error('Error initializing JavaScript:', error);
        const output = document.getElementById('output');
        if (output) {
          output.innerHTML += '<div style="color: red; margin: 5px 0; padding: 5px; background: #ffe6e6; border-radius: 3px;">Error: ' + error.message + '</div>';
        }
      }
    }
  </script>`;
        }
        
        combinedHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Preview</title>
  ${cssCode ? `<style>\n${cssCode}\n  </style>` : ''}
</head>
<body>
  <div id="root"></div>
  <div id="output"></div>
  ${scriptContent}
</body>
</html>`;
      }
      
      // Debug: log the final combined HTML
      console.log('🔍 Final combined HTML length:', combinedHTML.length);
      console.log('🔍 Final combined HTML (first 200 chars):', combinedHTML.substring(0, 200) + '...');
      
      return combinedHTML;
    }
    
    return null;
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
    
    // Generate combined web code if applicable
    const combined = combineWebCodeBlocks(blocks);
    setCombinedWebCode(combined);
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
    combinedWebCode,
    getCodeBlockById,
    getRunnableCodeBlocks
  };
};