import { useState, useEffect } from 'react';

export interface DetectedCodeBlock {
  id: string;
  language: string;
  code: string;
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
    
    const lowerCode = code.toLowerCase();

    if (lowerCode.includes('<!doctype') || lowerCode.includes('<html>') ||
        lowerCode.includes('<head>') || lowerCode.includes('<body>')) {
      return 'html';
    }

    // Better CSS detection - check for CSS properties and selectors
    if (lowerCode.includes('{') && lowerCode.includes('}') &&
        (lowerCode.includes('color:') || lowerCode.includes('background:') ||
         lowerCode.includes('font-') || lowerCode.includes('margin:') ||
         lowerCode.includes('padding:') || lowerCode.includes('border:') ||
         lowerCode.includes('width:') || lowerCode.includes('height:') ||
         lowerCode.includes('display:') || lowerCode.includes('flex') ||
         lowerCode.includes('.todo-list') || lowerCode.includes('#'))) {
      console.log('🔍 detectLanguage - Detected CSS based on properties');
      return 'css';
    }

    if (lowerCode.includes('import react') || lowerCode.includes('from \'react\'') ||
        lowerCode.includes('usestate') || lowerCode.includes('useeffect') ||
        lowerCode.includes('return (') || lowerCode.includes('<div') ||
        lowerCode.includes('jsx') || lowerCode.includes('tsx')) {
      return 'jsx';
    }

    if (lowerCode.includes('function') || lowerCode.includes('const ') ||
        lowerCode.includes('let ') || lowerCode.includes('var ') ||
        lowerCode.includes('console.log') || lowerCode.includes('=>')) {
      return 'javascript';
    }

    return 'text';
  };

  // Virtual file system for imports
  const storeFilesInVirtualFS = (blocks: DetectedCodeBlock[]) => {
    const virtualFS: { [key: string]: string } = {};
    
    console.log('🔍 VirtualFS - All blocks:', blocks.map(b => ({ language: b.language, codeLength: b.code.length })));
    
    // Store CSS files first
    const cssBlocks = blocks.filter(b => b.language === 'css');
    console.log('🔍 VirtualFS - CSS blocks found:', cssBlocks.length);
    
    cssBlocks.forEach((block, index) => {
      const filename = `styles${index > 0 ? index : ''}.css`;
      virtualFS[filename] = block.code;
      console.log('🔍 VirtualFS - Stored CSS file:', filename, 'content length:', block.code.length);
      console.log('🔍 VirtualFS - CSS content preview:', block.code.substring(0, 100) + '...');
    });
    
    // Store JavaScript/React files (but exclude CSS blocks)
    const jsBlocks = blocks.filter(b => ['javascript', 'js', 'jsx', 'tsx'].includes(b.language));
    console.log('🔍 VirtualFS - JS blocks found:', jsBlocks.length);
    
    jsBlocks.forEach((block, index) => {
      // Skip if this is actually CSS content misidentified as JS
      if (block.code.includes('{') && block.code.includes('}') && 
          (block.code.includes('color:') || block.code.includes('background:') || 
           block.code.includes('padding:') || block.code.includes('margin:'))) {
        console.log('🔍 VirtualFS - Skipping JS block that looks like CSS');
        return;
      }
      
      // Try to extract filename from comments or use generic name
      const filenameMatch = block.code.match(/\/\*\s*@filename\s+([^\s]+)\s*\*\//);
      const filename = filenameMatch ? filenameMatch[1] : `component${index > 0 ? index : ''}.js`;
      virtualFS[filename] = block.code;
      console.log('🔍 VirtualFS - Stored JS file:', filename, 'content length:', block.code.length);
    });
    
    // Store in localStorage with a timestamp for cleanup
    localStorage.setItem('codePreview_virtualFS', JSON.stringify({
      files: virtualFS,
      timestamp: Date.now()
    }));
    
    console.log('🔍 VirtualFS - Final virtual file system files:', Object.keys(virtualFS));
    console.log('🔍 VirtualFS - Full virtual file system:', virtualFS);
    
    return virtualFS;
  };

  const combineWebCodeBlocks = (blocks: DetectedCodeBlock[]): string | null => {
    const htmlBlocks = blocks.filter(b => b.language === 'html');
    const cssBlocks = blocks.filter(b => b.language === 'css');
    const jsBlocks = blocks.filter(b => ['javascript', 'js'].includes(b.language));
    const reactBlocks = blocks.filter(b => ['jsx', 'tsx', 'react'].includes(b.language));

    // Store files in virtual file system
    const virtualFS = storeFilesInVirtualFS(blocks);

    // If we have React blocks, create a React sandbox
    if (reactBlocks.length > 0) {
      const reactCode = reactBlocks.map(b => {
        // Smart preprocessing: resolve imports and handle exports
        let processedCode = b.code
          // Remove only React-related imports that we provide via CDN
          .replace(/import\s+React[^;]*from\s+['"]react['"];?\s*/g, '')
          .replace(/import\s+\{[^}]*\}\s+from\s+['"]react['"];?\s*/g, '')
          .replace(/import\s+.*?from\s+['"]react-dom['"];?\s*/g, '')
          .replace(/import\s+.*?from\s+['"]react-dom\/client['"];?\s*/g, '')
          // Handle export statements more carefully
          .replace(/export\s+default\s+/g, '')
          .replace(/export\s+\{[^}]*\}\s*;?\s*/g, '')
          // Keep other exports but remove the export keyword
          .replace(/export\s+(?=const|function|class)/g, '')
          .trim();
        
        // Replace CSS imports with actual CSS injection
        const cssImportMatches = b.code.match(/import\s+['"]([^'"]*\.css)['"];?/g);
        if (cssImportMatches) {
          cssImportMatches.forEach(importStatement => {
            const cssPathMatch = importStatement.match(/['"]([^'"]*\.css)['"]/);
            if (cssPathMatch) {
              const cssPath = cssPathMatch[1];
              const cssFileName = cssPath.split('/').pop() || 'styles.css';
              
              // Find matching CSS content
              const cssContent = Object.keys(virtualFS).find(key => 
                key.endsWith('.css') && (key === cssFileName || key.includes(cssFileName.replace('.css', '')))
              );
              
              if (cssContent) {
                processedCode = processedCode.replace(importStatement, '');
                // CSS will be injected in the HTML head
              }
            }
          });
        }
        
        return processedCode;
      }).join('\n\n');
      
      const cssCode = cssBlocks.map(b => b.code).join('\n\n');
      
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <title>React Preview</title>
          <style>
            body { 
              margin: 0; 
              padding: 16px; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            #root { width: 100%; height: 100%; }
            ${cssCode}
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            const { useState, useEffect, useRef, useCallback, useMemo } = React;
            
            try {
              ${reactCode}
              
              const root = ReactDOM.createRoot(document.getElementById('root'));
              
              // Auto-detect component
              const componentPatterns = ['App', 'TodoList', 'Component', 'Main'];
              let rendered = false;
              
              for (const name of componentPatterns) {
                try {
                  if (typeof window[name] !== 'undefined') {
                    root.render(React.createElement(window[name]));
                    rendered = true;
                    break;
                  }
                  if (typeof eval(name) !== 'undefined') {
                    root.render(React.createElement(eval(name)));
                    rendered = true;
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
              
              if (!rendered) {
                root.render(React.createElement('div', { 
                  style: { padding: '20px', textAlign: 'center', color: '#666' } 
                }, 'Component not found. Make sure to export as "App", "TodoList", or similar.'));
              }
              
            } catch (error) {
              document.getElementById('root').innerHTML = 
                '<div style="color: red; padding: 20px;">Error: ' + error.message + '</div>';
            }
          </script>
        </body>
        </html>
      `;
    }

    // Original HTML/CSS/JS combination logic
    if (htmlBlocks.length > 0 || cssBlocks.length > 0 || jsBlocks.length > 0) {
      let combinedHTML = '';

      if (htmlBlocks.length > 0) {
        combinedHTML = htmlBlocks[0].code;

        if (cssBlocks.length > 0 && !combinedHTML.includes('<style>')) {
          const cssCode = cssBlocks.map(b => b.code).join('\n\n');
          combinedHTML = combinedHTML.replace(
            '</head>',
            '<style>\n' + cssCode + '\n</style>\n</head>'
          );
        }

        if (jsBlocks.length > 0 && !combinedHTML.includes('<script>')) {
          const jsCode = jsBlocks.map(b => b.code).join('\n\n');
          combinedHTML = combinedHTML.replace(
            '</body>',
            '<script>\n' + jsCode + '\n</script>\n</body>'
          );
        }
      } else {
        const cssCode = cssBlocks.map(b => b.code).join('\n\n');
        const jsCode = jsBlocks.map(b => b.code).join('\n\n');

        combinedHTML = '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Code Preview</title>\n';

        if (cssCode) {
          combinedHTML += '  <style>\n' + cssCode + '\n  </style>\n';
        }

        combinedHTML += '</head>\n<body>\n  <div id="root"></div>\n  <div id="output"></div>\n';

        if (jsCode) {
          combinedHTML += '  <script>\n' + jsCode + '\n  </script>\n';
        }

        combinedHTML += '</body>\n</html>';
      }

      return combinedHTML;
    }

    return null;
  };

  useEffect(() => {
    if (!content) {
      setCodeBlocks([]);
      setHasRunnableCode(false);
      setCombinedWebCode(null);
      return;
    }

    console.log('🔍 useCodeDetection - Processing content:', content.substring(0, 200) + '...');
    console.log('🔍 useCodeDetection - Full content length:', content.length);
    console.log('🔍 useCodeDetection - Looking for "css" in content:', content.toLowerCase().includes('css'));
    console.log('🔍 useCodeDetection - Content contains "Run":', content.includes('Run'));
    console.log('🔍 useCodeDetection - Content contains "Copy":', content.includes('Copy'));

    const detectCodeBlocks = (text: string): DetectedCodeBlock[] => {
      const blocks: DetectedCodeBlock[] = [];

      // Standard fenced code blocks (```language)
      const fencedCodeRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
      let match;

      console.log('🔍 useCodeDetection - Looking for fenced code blocks...');

      while ((match = fencedCodeRegex.exec(text)) !== null) {
        const language = detectLanguage(match[1], match[2]);
        const code = match[2].trim();
        
        console.log('🔍 useCodeDetection - Found fenced code block:', { 
          rawLanguage: match[1], 
          detectedLanguage: language, 
          codeLength: code.length,
          codeStart: code.substring(0, 50) + '...'
        });
        
        if (code) {
          blocks.push({
            id: `code-${blocks.length}`,
            language,
            code,
            isRunnable: isRunnableLanguage(language),
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      }

      // LLM-style code blocks (language\nRun\nCopy\ncode)
      // Updated regex to be more specific and handle Turkish content better
      const llmCodeRegex = /\b(jsx|css|html|javascript|js|tsx|react)\s*\n(?:Run\s*\n)?(?:Copy\s*\n)?([\s\S]*?)(?=\n(?:jsx|css|html|javascript|js|tsx|react)\s*\n(?:Run\s*\n)?(?:Copy\s*\n)?|$)/gi;
      let llmMatch;

      console.log('🔍 useCodeDetection - Looking for LLM-style code blocks...');
      console.log('🔍 useCodeDetection - Text sample for LLM regex:', text.substring(0, 500));
      
      // Let's test the regex manually
      const testMatches = text.match(llmCodeRegex);
      console.log('🔍 useCodeDetection - Manual regex test matches:', testMatches ? testMatches.length : 0);
      if (testMatches) {
        testMatches.forEach((match, idx) => {
          console.log(`🔍 useCodeDetection - Test match ${idx}:`, match.substring(0, 100) + '...');
        });
      }

      while ((llmMatch = llmCodeRegex.exec(text)) !== null) {
        const language = llmMatch[1].toLowerCase();
        const code = llmMatch[2].trim();
        
        console.log('🔍 useCodeDetection - Raw LLM match:', { 
          language, 
          codeLength: code.length,
          codeStart: code.substring(0, 100) + '...',
          fullMatch: llmMatch[0].substring(0, 200) + '...'
        });
        
        // Process all matches for known languages
        if (code && code.length > 10) {
          console.log('🔍 useCodeDetection - Found LLM-style code block:', { 
            language, 
            codeLength: code.length,
            codeStart: code.substring(0, 50) + '...'
          });
          
          blocks.push({
            id: `code-${blocks.length}`,
            language,
            code,
            isRunnable: isRunnableLanguage(language),
            startIndex: llmMatch.index,
            endIndex: llmMatch.index + llmMatch[0].length
          });
        }
      }

      // Additional fallback detection for CSS blocks that might be missed
      if (text.toLowerCase().includes('css') && text.includes('Run') && text.includes('Copy')) {
        console.log('🔍 useCodeDetection - Fallback CSS detection triggered');
        
        // Try to find CSS blocks with a simpler approach
        const cssMatches = text.match(/css\s*\n(?:Run\s*\n)?(?:Copy\s*\n)?([\s\S]*?)(?=\n(?:jsx|html|javascript|js|tsx|react)\s*\n|$)/gi);
        if (cssMatches) {
          console.log('🔍 useCodeDetection - Fallback found CSS matches:', cssMatches.length);
          cssMatches.forEach((match, idx) => {
            const codeMatch = match.match(/css\s*\n(?:Run\s*\n)?(?:Copy\s*\n)?([\s\S]*)/i);
            if (codeMatch && codeMatch[1]) {
              const code = codeMatch[1].trim();
              console.log('🔍 useCodeDetection - Fallback CSS block:', { 
                index: idx,
                codeLength: code.length,
                codeStart: code.substring(0, 50) + '...'
              });
              
              blocks.push({
                id: `fallback-css-${blocks.length}`,
                language: 'css',
                code,
                isRunnable: true,
                startIndex: text.indexOf(match),
                endIndex: text.indexOf(match) + match.length
              });
            }
          });
        }
      }

      const inlineCodeRegex = /`([^`]+)`/g;
      let inlineMatch;

      while ((inlineMatch = inlineCodeRegex.exec(text)) !== null) {
        const code = inlineMatch[1].trim();

        if (code.includes('<') && code.includes('>') && code.length > 10) {
          const language = detectLanguage(undefined, code);
          if (isRunnableLanguage(language)) {
            blocks.push({
              id: `inline-code-${blocks.length}`,
              language,
              code,
              isRunnable: true,
              startIndex: inlineMatch.index,
              endIndex: inlineMatch.index + inlineMatch[0].length
            });
          }
        }
      }

      // Post-process blocks to catch any CSS that might have been misclassified
      blocks.forEach(block => {
        if (block.language !== 'css') {
          const detectedLang = detectLanguage(undefined, block.code);
          if (detectedLang === 'css') {
            console.log('🔍 useCodeDetection - Re-classifying block as CSS:', block.id);
            block.language = 'css';
            block.isRunnable = true;
          }
        }
      });

      return blocks.sort((a, b) => a.startIndex - b.startIndex);
    };

    const blocks = detectCodeBlocks(content);
    setCodeBlocks(blocks);
    setHasRunnableCode(blocks.some(block => block.isRunnable));

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