import React, { useState } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Play, Eye } from 'lucide-react';
import { CodePreview } from './CodePreview';
import { useCodeDetection } from '@/hooks/useCodeDetection';

interface MathRendererProps {
  content: string;
  isStreaming?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, isStreaming = false }) => {
  const [previewCode, setPreviewCode] = useState<{ code: string; language: string } | null>(null);
  
  // Detect if content is raw code without markdown fences
  const detectRawCode = (text: string): { isCode: boolean; language: string } => {
    // First check if it already has code fences
    if (text.includes('```')) {
      return { isCode: false, language: 'javascript' };
    }
    
    // Check for React component patterns
    if (text.includes('import React') && text.includes('export default')) {
      return { isCode: true, language: 'jsx' };
    }
    
    const codePatterns = [
      { pattern: /import\s+React|from\s+['"]react['"]|JSX\.Element/i, language: 'jsx' },
      { pattern: /import.*from\s+['"]|export\s+(default\s+)?/i, language: 'javascript' },
      { pattern: /function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=/i, language: 'javascript' },
      { pattern: /def\s+\w+|import\s+\w+|from\s+\w+\s+import/i, language: 'python' },
      { pattern: /class\s+\w+|public\s+(class|interface)/i, language: 'java' }
    ];
    
    const lines = text.trim().split('\n');
    const codeLines = lines.filter(line => 
      codePatterns.some(({ pattern }) => pattern.test(line.trim()))
    );
    
    // If more than 30% of lines look like code
    const isCode = codeLines.length / lines.length > 0.3;
    const language = codePatterns.find(({ pattern }) => pattern.test(text))?.language || 'javascript';
    
    return { isCode, language };
  };
  
  // Check if content is primarily code blocks to skip math processing
  const isCodeContent = (text: string): boolean => {
    const { isCode } = detectRawCode(text);
    if (isCode) return true;
    
    const codeBlockCount = (text.match(/```[\s\S]*?```/g) || []).length;
    const totalLines = text.split('\n').length;
    const codeBlockLines = (text.match(/```[\s\S]*?```/g) || [])
      .map(block => block.split('\n').length)
      .reduce((sum, lines) => sum + lines, 0);
    
    // If more than 60% of content is code blocks, treat as code content
    return codeBlockLines > totalLines * 0.6 || codeBlockCount > 2;
  };
  
  // Auto-wrap raw code in markdown fences
  const preprocessContent = (text: string): string => {
    // Skip if already has code fences
    if (text.includes('```')) {
      return text;
    }
    
    // Pattern to match React component code
    const reactComponentPattern = /(import React[\s\S]*?export default \w+;)/g;
    let processedText = text;
    let matches = [...text.matchAll(reactComponentPattern)];
    
    if (matches.length > 0) {
      console.log('🔧 Found React component(s), wrapping in markdown fences');
      
      // Process matches in reverse order to maintain indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const codeOnly = match[1];
        const startIndex = match.index!;
        const endIndex = startIndex + match[0].length;
        
        processedText = 
          processedText.substring(0, startIndex) +
          `\n\`\`\`jsx\n${codeOnly}\n\`\`\`\n` +
          processedText.substring(endIndex);
      }
      
      return processedText;
    }

    // Fallback: check if the entire content is code
    const { isCode, language } = detectRawCode(text);
    
    if (isCode) {
      console.log('🔧 Auto-wrapping raw code in markdown fences:', language);
      return `\`\`\`${language}\n${text}\n\`\`\``;
    }
    
    return text;
  };
  
  // Use code detection hook to automatically detect web code
  const { combinedWebCode, hasRunnableCode } = useCodeDetection(content);
  
  // Debug: Log what we detect
  const { isCode, language } = detectRawCode(content);
  console.log('🔍 MathRenderer - Content length:', content.length);
  console.log('🔍 MathRenderer - Content preview:', content.substring(0, 200) + '...');
  console.log('🔍 MathRenderer - Raw code detected:', isCode, 'Language:', language);
  console.log('🔍 MathRenderer - Has code fences:', content.includes('```'));
  console.log('🔍 MathRenderer - Has React imports:', content.includes('import React'));
  console.log('🔍 MathRenderer - Has export default:', content.includes('export default'));
  console.log('🔍 MathRenderer - Has runnable code:', hasRunnableCode);
  console.log('🔍 MathRenderer - Combined web code:', combinedWebCode ? 'YES' : 'NO');
  console.log('🔍 MathRenderer - Is code content:', isCodeContent(content));
  
  const isRunnableLanguage = (language: string): boolean => {
    const runnableLanguages = ['html', 'javascript', 'js', 'jsx', 'tsx', 'react', 'css', 'typescript', 'ts'];
    return runnableLanguages.includes(language.toLowerCase());
  };
  // Convert LaTeX bracket notation to dollar notation
  const processContent = (text: string) => {
    let processed = text;
    
    // First, protect code blocks from math processing
    const codeBlockPlaceholders: string[] = [];
    
    // Protect fenced code blocks (```...```)
    processed = processed.replace(/```[\s\S]*?```/g, (match) => {
      const placeholder = `__CODEBLOCK_${codeBlockPlaceholders.length}__`;
      codeBlockPlaceholders.push(match);
      return placeholder;
    });
    
    // Protect inline code blocks (`...`)
    processed = processed.replace(/`[^`]+`/g, (match) => {
      const placeholder = `__INLINECODE_${codeBlockPlaceholders.length}__`;
      codeBlockPlaceholders.push(match);
      return placeholder;
    });
    
    // Convert LaTeX display math \[ ... \] to $$ ... $$
    processed = processed.replace(/\\\[\s*(.*?)\s*\\\]/gs, '$$$$1$$');
    
    // Convert LaTeX inline math \( ... \) to $ ... $
    processed = processed.replace(/\\\(\s*(.*?)\s*\\\)/gs, '$$1$');
    
    // Convert square bracket math [ ... ] to display math when it contains LaTeX
    // Only do this for content that's not inside code blocks
    processed = processed.replace(/\[\s*([^[\]]*(?:\\[a-zA-Z]+|\\frac|\\sqrt|\\int|\\lim|\\partial|\\infty|\\sum|\\prod|\^|\{|\}|_)[^[\]]*)\s*\]/g, '$$$$1$$');
    
    // Fix common $1$ placeholder patterns by looking at context
    processed = fixPlaceholderMath(processed);
    
    // Restore code blocks
    codeBlockPlaceholders.forEach((codeBlock, index) => {
      const placeholder = `__CODEBLOCK_${index}__`;
      const inlineCodePlaceholder = `__INLINECODE_${index}__`;
      processed = processed.replace(placeholder, codeBlock);
      processed = processed.replace(inlineCodePlaceholder, codeBlock);
    });
    
    // Debug: Log the processed content to see what we're getting
    console.log('🔍 Processed content after placeholder fixing:', processed);
    
    return processed;
  };

  // Attempt to fix $1$ placeholders by looking at surrounding context
  const fixPlaceholderMath = (text: string) => {
    let fixed = text;
    
    // More sophisticated approach: look for mathematical context patterns
    // and replace with appropriate expressions
    
    // First, handle common mathematical contexts
    const contextReplacements = [
      // Specific function contexts
      { pattern: /The derivative of\s*\$1\$/gi, replacement: 'The derivative of $f(x)$' },
      { pattern: /derivative of\s*\$1\$/gi, replacement: 'derivative of $f(x)$' },
      { pattern: /integral of\s*\$1\$/gi, replacement: 'integral of $f(x)$' },
      { pattern: /The integral of\s*\$1\$/gi, replacement: 'The integral of $f(x)$' },
      { pattern: /indefinite integral of\s*\$1\$/gi, replacement: 'indefinite integral of $f(x)$' },
      { pattern: /definite integral of\s*\$1\$/gi, replacement: 'definite integral of $f(x)$' },
      
      // Fraction contexts
      { pattern: /fracddxf\(x\)/gi, replacement: '\\frac{d}{dx}f(x)' },
      { pattern: /frac([^}]*)\$1\$/gi, replacement: '$\\frac{$1}{dx}$' },
      
      // Series contexts  
      { pattern: /sum of the first\s*\$1\$/gi, replacement: 'sum of the first $n$' },
      { pattern: /series with first term\s*\$1\$/gi, replacement: 'series with first term $a$' },
      { pattern: /common ratio\s*\$1\$/gi, replacement: 'common ratio $r$' },
      { pattern: /where\s*\$1\$\s*\)/gi, replacement: 'where $|r| < 1$)' },
      { pattern: /∑\s*n=1\s*infty\s*\$1\$/gi, replacement: '$\\sum_{n=1}^{\\infty} a_n$' },
      
      // Taylor series specific
      { pattern: /expansion of\s*\$1\$/gi, replacement: 'expansion of $f(x)$' },
      { pattern: /around\s*\$1\$/gi, replacement: 'around $x=a$' },
      
      // Variables and constants
      { pattern: /fracab/gi, replacement: '\\frac{a}{b}' },
      { pattern: /intf\(x\)dx/gi, replacement: '\\int f(x)dx' },
    ];
    
    // Apply context-specific replacements
    for (const { pattern, replacement } of contextReplacements) {
      fixed = fixed.replace(pattern, replacement);
    }
    
    // Final fallback: replace any remaining $1$ with a generic expression
    // Look at the sentence structure to guess what it should be
    fixed = fixed.replace(/\$1\$/g, (match, offset) => {
      const before = fixed.substring(Math.max(0, offset - 100), offset).toLowerCase();
      const after = fixed.substring(offset + 3, Math.min(fixed.length, offset + 100)).toLowerCase();
      
      // Context-based guessing
      if (before.includes('log') || after.includes('log')) return '$\\log(x)$';
      if (before.includes('sqrt') || after.includes('root')) return '$\\sqrt{x}$';
      if (before.includes('integral') || before.includes('int')) return '$\\int f(x) dx$';
      if (before.includes('derivative') || before.includes('diff')) return '$\\frac{d}{dx}f(x)$';
      if (before.includes('fraction') || before.includes('frac')) return '$\\frac{a}{b}$';
      if (before.includes('exponential') || before.includes('exp')) return '$e^x$';
      if (before.includes('sum') || before.includes('series')) return '$\\sum_{n=1}^{\\infty} a_n$';
      if (before.includes('limit') || before.includes('lim')) return '$\\lim_{x \\to a} f(x)$';
      
      // Generic mathematical expression
      return '$f(x)$';
    });

    // Fix common LaTeX command issues (missing backslashes)
    fixed = fixed.replace(/\$([^$]*)\$/g, (match, mathContent) => {
      let corrected = mathContent;
      
      // Add missing backslashes to common LaTeX commands
      corrected = corrected.replace(/\blog\b/g, '\\log');
      corrected = corrected.replace(/\bln\b/g, '\\ln');
      corrected = corrected.replace(/\bsin\b/g, '\\sin');
      corrected = corrected.replace(/\bcos\b/g, '\\cos');
      corrected = corrected.replace(/\btan\b/g, '\\tan');
      corrected = corrected.replace(/\bsqrt\b/g, '\\sqrt');
      corrected = corrected.replace(/\bint\b/g, '\\int');
      corrected = corrected.replace(/\bsum\b/g, '\\sum');
      corrected = corrected.replace(/\bprod\b/g, '\\prod');
      corrected = corrected.replace(/\blim\b/g, '\\lim');
      corrected = corrected.replace(/\bfrac\b/g, '\\frac');
      corrected = corrected.replace(/\binfty\b/g, '\\infty');
      corrected = corrected.replace(/\bpartial\b/g, '\\partial');
      corrected = corrected.replace(/\bcdot\b/g, '\\cdot');
      corrected = corrected.replace(/\btimes\b/g, '\\times');
      corrected = corrected.replace(/\bpm\b/g, '\\pm');
      corrected = corrected.replace(/\bneq\b/g, '\\neq');
      corrected = corrected.replace(/\bleq\b/g, '\\leq');
      corrected = corrected.replace(/\bgeq\b/g, '\\geq');
      corrected = corrected.replace(/\balpha\b/g, '\\alpha');
      corrected = corrected.replace(/\bbeta\b/g, '\\beta');
      corrected = corrected.replace(/\bgamma\b/g, '\\gamma');
      corrected = corrected.replace(/\bdelta\b/g, '\\delta');
      corrected = corrected.replace(/\btheta\b/g, '\\theta');
      corrected = corrected.replace(/\bpi\b/g, '\\pi');
      corrected = corrected.replace(/\bmu\b/g, '\\mu');
      corrected = corrected.replace(/\bsigma\b/g, '\\sigma');
      corrected = corrected.replace(/\bphi\b/g, '\\phi');
      corrected = corrected.replace(/\bomega\b/g, '\\omega');
      
      return `$${corrected}$`;
    });
    
    return fixed;
  };

  // Debug mode - show raw content if it contains $1$
  const hasPlaceholders = content.includes('$1$');
  const showDebug = hasPlaceholders && process.env.NODE_ENV === 'development';
  
  const renderMathContent = (text: string) => {
    try {
      // First, preprocess to auto-wrap raw code
      const preprocessedText = preprocessContent(text);
      // Then, convert LaTeX notation to dollar notation
      const processedText = processContent(preprocessedText);
    
    // Handle markdown formatting that might interfere with math
    // Temporarily replace math expressions with placeholders to protect them
    const mathPlaceholders: string[] = [];
    let protectedText = processedText;
    
    // Extract and protect display math $$...$$
    protectedText = protectedText.replace(/\$\$([^$]+)\$\$/g, (match, mathContent) => {
      const placeholder = `__DISPLAYMATH_${mathPlaceholders.length}__`;
      mathPlaceholders.push(`$$${mathContent}$$`);
      return placeholder;
    });
    
    // Extract and protect inline math $...$
    protectedText = protectedText.replace(/\$([^$]+)\$/g, (match, mathContent) => {
      const placeholder = `__INLINEMATH_${mathPlaceholders.length}__`;
      mathPlaceholders.push(`$${mathContent}$`);
      return placeholder;
    });
    
    // Now process the text with ReactMarkdown (which handles bold, italic, etc.)
    const markdownProcessed = (
      <ReactMarkdown components={markdownComponents}>
        {protectedText}
      </ReactMarkdown>
    );
    
    // Convert back to string to restore math expressions
    const processMarkdownElement = (element: React.ReactElement): React.ReactNode => {
      if (typeof element === 'string') {
        // Restore math expressions
        let restored = element;
        mathPlaceholders.forEach((math, index) => {
          const displayPlaceholder = `__DISPLAYMATH_${index}__`;
          const inlinePlaceholder = `__INLINEMATH_${index}__`;
          
          if (restored.includes(displayPlaceholder)) {
            const mathContent = math.slice(2, -2); // Remove $$ ... $$
            restored = restored.replace(displayPlaceholder, `<DISPLAYMATH>${mathContent}</DISPLAYMATH>`);
          }
          
          if (restored.includes(inlinePlaceholder)) {
            const mathContent = math.slice(1, -1); // Remove $ ... $
            restored = restored.replace(inlinePlaceholder, `<INLINEMATH>${mathContent}</INLINEMATH>`);
          }
        });
        
        return restored;
      }
      
      if (React.isValidElement(element)) {
        const children = React.Children.map(element.props.children, processMarkdownElement);
        return React.cloneElement(element, {}, children);
      }
      
      return element;
    };
    
    // For now, let's use a simpler approach
    // Split by display math blocks first
    const displayMathRegex = /\$\$([^$]+)\$\$/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = displayMathRegex.exec(processedText)) !== null) {
      // Add text before display math
      if (match.index > lastIndex) {
        const beforeText = processedText.substring(lastIndex, match.index);
        parts.push(renderInlineMath(beforeText, parts.length));
      }
      
      // Add display math
      const mathContent = match[1].trim();
      if (mathContent) {
        try {
          parts.push(
            <div key={parts.length} className="my-4 text-center">
              <BlockMath math={mathContent} />
            </div>
          );
        } catch (error) {
          console.error('Display math error:', error);
          parts.push(
            <div key={parts.length} className="my-4 text-center text-red-600 bg-red-50 p-2 rounded">
              [Display Math Error: {mathContent}]
            </div>
          );
        }
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < processedText.length) {
      const remainingText = processedText.substring(lastIndex);
      parts.push(renderInlineMath(remainingText, parts.length));
    }
    
    return parts;
    } catch (error) {
      console.error('Error rendering math content:', error);
      // Fallback to simple ReactMarkdown rendering
      return (
        <ReactMarkdown components={markdownComponents}>
          {text}
        </ReactMarkdown>
      );
    }
  };
  
  const renderInlineMath = (text: string, baseKey: number) => {
    if (!text.trim()) return null;
    
    const inlineMathRegex = /\$([^$]+)\$/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = inlineMathRegex.exec(text)) !== null) {
      // Add text before inline math
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText.trim()) {
          parts.push(
            <ReactMarkdown key={`${baseKey}-text-${parts.length}`} components={markdownComponents}>
              {beforeText}
            </ReactMarkdown>
          );
        }
      }
      
      // Add inline math
      const mathContent = match[1].trim();
      if (mathContent) {
        try {
          parts.push(
            <InlineMath key={`${baseKey}-math-${parts.length}`} math={mathContent} />
          );
        } catch (error) {
          console.error('Inline math error:', error);
          parts.push(
            <span key={`${baseKey}-error-${parts.length}`} className="text-red-600 bg-red-50 px-1 rounded">
              [Inline Math Error: {mathContent}]
            </span>
          );
        }
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText.trim()) {
        parts.push(
          <ReactMarkdown key={`${baseKey}-text-${parts.length}`} components={markdownComponents}>
            {remainingText}
          </ReactMarkdown>
        );
      }
    }
    
    return parts.length > 0 ? parts : null;
  };

  // Helper function to render math within formatted text
  const renderMathInText = (text: string) => {
    const parts = [];
    const inlineMathRegex = /\$([^$]+)\$/g;
    let lastIndex = 0;
    let match;
    
    while ((match = inlineMathRegex.exec(text)) !== null) {
      // Add text before math
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText) {
          parts.push(beforeText);
        }
      }
      
      // Add inline math
      const mathContent = match[1].trim();
      if (mathContent) {
        try {
          parts.push(
            <InlineMath key={`math-${parts.length}`} math={mathContent} />
          );
        } catch (error) {
          console.error('Inline math error:', error);
          parts.push(
            <span key={`math-error-${parts.length}`} className="text-red-600 bg-red-50 px-1 rounded">
              [Math Error: {mathContent}]
            </span>
          );
        }
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText) {
        parts.push(remainingText);
      }
    }
    
    return parts.length > 0 ? parts : text;
  };
  
  const markdownComponents = {
    // Prevent wrapping in paragraphs for inline content
    p: ({ children }: any) => <span>{children}</span>,
    
    // Handle strong/bold text that might contain math
    strong: ({ children }: any) => {
      const content = React.Children.toArray(children).join('');
      // Check if the content contains math expressions
      if (typeof content === 'string' && content.includes('$')) {
        return <strong>{renderMathInText(content)}</strong>;
      }
      return <strong>{children}</strong>;
    },
    
    // Handle emphasis/italic text that might contain math
    em: ({ children }: any) => {
      const content = React.Children.toArray(children).join('');
      // Check if the content contains math expressions
      if (typeof content === 'string' && content.includes('$')) {
        return <em>{renderMathInText(content)}</em>;
      }
      return <em>{children}</em>;
    },
    
    // Handle code blocks
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      if (language === 'math') {
        try {
          return (
            <div className="my-4 text-center">
              <BlockMath math={String(children).replace(/\n$/, '')} />
            </div>
          );
        } catch (error) {
          return <pre className="bg-red-100 p-2 rounded">{children}</pre>;
        }
      }
      
      if (!inline && language) {
        const codeContent = String(children).replace(/\n$/, '');
        const isRunnable = isRunnableLanguage(language);
        
        return (
          <div className="relative my-4">
            <div className="flex items-center justify-between bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-t-lg border border-gray-300 dark:border-gray-600 border-b-0">
              <span className="text-xs font-mono font-medium text-gray-600 dark:text-gray-300 uppercase">
                {language}
              </span>
              <div className="flex items-center gap-2">
                {isRunnable && (
                  <button
                    onClick={() => setPreviewCode({ code: codeContent, language })}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                    title="Run code"
                  >
                    <Play className="h-3 w-3" />
                    Run
                  </button>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(codeContent)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  title="Copy code"
                >
                  Copy
                </button>
              </div>
            </div>
            <SyntaxHighlighter
              style={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? oneDark : oneLight}
              language={language}
              PreTag="div"
              className="!rounded-t-none rounded-b-lg !bg-gray-100 dark:!bg-gray-800 !border !border-gray-300 dark:!border-gray-600 !border-t-0 !mt-0"
              {...props}
            >
              {codeContent}
            </SyntaxHighlighter>
          </div>
        );
      }
      
      return (
        <code className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-300 dark:border-gray-600" {...props}>
          {children}
        </code>
      );
    },
    
    // Handle other markdown elements
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-base font-bold mb-2">{children}</h4>,
    h5: ({ children }: any) => <h5 className="text-sm font-bold mb-1">{children}</h5>,
    h6: ({ children }: any) => <h6 className="text-xs font-bold mb-1">{children}</h6>,
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    ul: ({ children }: any) => <ul className="list-disc list-inside mb-4">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside mb-4">{children}</ol>,
    li: ({ children }: any) => <li className="mb-1">{children}</li>,
    table: ({ children }: any) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
        {children}
      </td>
    ),
  };
  
  // Helper function to clean incomplete markdown during streaming
  const safeMarkdownForStreaming = (md: string) => {
    let cleaned = md;
    
    // Better code block detection - find complete code blocks
    const completeCodeBlocks: Array<{start: number, end: number}> = [];
    let currentPos = 0;
    
    while (true) {
      const openingIndex = cleaned.indexOf('```', currentPos);
      if (openingIndex === -1) break;
      
      // Look for closing ```
      const closingIndex = cleaned.indexOf('```', openingIndex + 3);
      if (closingIndex === -1) {
        // No closing found, this is incomplete - remove everything from this point
        cleaned = cleaned.substring(0, openingIndex);
        break;
      }
      
      // Found a complete code block
      completeCodeBlocks.push({ start: openingIndex, end: closingIndex + 3 });
      currentPos = closingIndex + 3;
    }
    
    // Remove incomplete math blocks ($$...$$)
    const mathBlocks = (cleaned.match(/\$\$/g) || []).length;
    if (mathBlocks % 2 !== 0) {
      // Find last incomplete math block and remove it
      const lastMathBlock = cleaned.lastIndexOf('$$');
      cleaned = cleaned.substring(0, lastMathBlock);
    }
    
    // Remove incomplete inline math ($...$) but be careful not to break valid single $ chars
    const singleDollars = cleaned.match(/\$[^$]*$/);
    if (singleDollars && !cleaned.endsWith('$$')) {
      // Find the last single $ that doesn't have a matching closing $
      const lastDollar = cleaned.lastIndexOf('$');
      if (lastDollar > -1 && cleaned.substring(lastDollar + 1).indexOf('$') === -1) {
        cleaned = cleaned.substring(0, lastDollar);
      }
    }
    
    // Remove incomplete bold text
    const bolds = (cleaned.match(/\*\*/g) || []).length;
    if (bolds % 2 !== 0) {
      // Find last incomplete bold and remove it
      const lastBold = cleaned.lastIndexOf('**');
      cleaned = cleaned.substring(0, lastBold);
    }
    
    // Remove incomplete italic text
    const italics = (cleaned.match(/(?<!\*)\*(?!\*)/g) || []).length;
    if (italics % 2 !== 0) {
      const lastItalic = cleaned.lastIndexOf('*');
      if (lastItalic > -1 && cleaned[lastItalic - 1] !== '*' && cleaned[lastItalic + 1] !== '*') {
        cleaned = cleaned.substring(0, lastItalic);
      }
    }
    
    // Remove incomplete inline code
    const inlineCodes = (cleaned.match(/(?<!`)`(?!`)/g) || []).length;
    if (inlineCodes % 2 !== 0) {
      const lastBacktick = cleaned.lastIndexOf('`');
      if (lastBacktick > -1 && cleaned[lastBacktick - 1] !== '`' && cleaned[lastBacktick + 1] !== '`') {
        cleaned = cleaned.substring(0, lastBacktick);
      }
    }
    
    return cleaned;
  };

  // During streaming, try to render as much as possible while being safe
  if (isStreaming) {
    // Check if this looks like raw code during streaming
    const { isCode } = detectRawCode(content);
    
    if (isCode) {
      // For raw code during streaming, show it with basic formatting
      // but don't wrap in fences yet until streaming is complete
      return (
        <div className="math-content max-w-none">
          <div className="leading-relaxed">
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
              <code className="text-sm font-mono">{content}</code>
            </pre>
            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
          </div>
        </div>
      );
    }
    
    // For regular markdown during streaming, be less aggressive - only clean up truly problematic incomplete syntax
    const safeContent = safeMarkdownForStreaming(content);
    
    // If the safe content is almost the full content, just render it all
    const contentRatio = safeContent.length / content.length;
    const shouldRenderFull = contentRatio > 0.95 || (content.length - safeContent.length) < 20;
    
    const contentToRender = shouldRenderFull ? content : safeContent;
    const remainingContent = shouldRenderFull ? '' : content.substring(safeContent.length);
    
    return (
      <div className="math-content max-w-none">
        <div className="leading-relaxed">
          {renderMathContent(contentToRender)}
          {/* Show remaining incomplete content as plain text */}
          {remainingContent && (
            <span className="opacity-70 whitespace-pre-wrap">
              {remainingContent}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="math-content max-w-none">
      {showDebug && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-bold text-red-800 mb-2">⚠️ Debug: Found $1$ placeholders</h3>
          <div className="text-sm mb-2">
            <strong>Raw content:</strong>
            <pre className="text-xs bg-white p-2 rounded border mt-1 whitespace-pre-wrap">
              {content}
            </pre>
          </div>
          <div className="text-sm mb-2">
            <strong>Processed content:</strong>
            <pre className="text-xs bg-white p-2 rounded border mt-1 whitespace-pre-wrap">
              {processContent(content)}
            </pre>
          </div>
          <div className="text-sm">
            <strong>$1$ occurrences:</strong> {(content.match(/\$1\$/g) || []).length}
          </div>
        </div>
      )}
      {renderMathContent(content)}
      
      
      {/* Code Preview Modal */}
      {previewCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-6xl h-[90vh] overflow-hidden">
            <CodePreview 
              code={previewCode.code} 
              language={previewCode.language}
              onClose={() => setPreviewCode(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};