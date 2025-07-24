export interface PreviewResult {
  status: 'success' | 'error' | 'incomplete' | 'unsupported';
  preview?: string;
  type?: 'iframe' | 'image' | 'text';
  error?: string;
}

export class CodePreviewService {
  private previewCache: Map<string, PreviewResult> = new Map();

  async generatePreview(code: string, language: string): Promise<PreviewResult> {
    // Wait for complete code block
    if (!this.isCompleteCode(code, language)) {
      return { status: 'incomplete', preview: undefined };
    }

    const cacheKey = this.hashCode(code);
    if (this.previewCache.has(cacheKey)) {
      return this.previewCache.get(cacheKey)!;
    }

    try {
      let preview: PreviewResult;
      
      switch (language.toLowerCase()) {
        case 'html':
        case 'css':
        case 'javascript':
        case 'js':
          preview = await this.generateWebPreview(code, language);
          break;
        case 'react':
        case 'tsx':
        case 'jsx':
          preview = await this.generateReactPreview(code);
          break;
        case 'python':
          preview = await this.generatePythonPreview(code);
          break;
        case 'svg':
          preview = await this.generateSVGPreview(code);
          break;
        default:
          preview = { status: 'unsupported', preview: undefined };
      }

      this.previewCache.set(cacheKey, preview);
      return preview;
    } catch (error) {
      return { 
        status: 'error', 
        preview: undefined, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private isCompleteCode(code: string, language: string): boolean {
    // Language-specific completeness checks
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        return this.isBalanced(code, [
          { open: '{', close: '}' },
          { open: '(', close: ')' },
          { open: '[', close: ']' }
        ]);
      case 'html':
        return this.isValidHTML(code);
      case 'python':
        return !code.trim().endsWith(':') || code.includes('\n    ');
      case 'jsx':
      case 'tsx':
      case 'react':
        return this.isBalanced(code, [
          { open: '{', close: '}' },
          { open: '(', close: ')' },
          { open: '[', close: ']' },
          { open: '<', close: '>' }
        ]);
      default:
        return true;
    }
  }

  private isBalanced(code: string, pairs: Array<{open: string, close: string}>): boolean {
    const stack: string[] = [];
    const openChars = new Set(pairs.map(p => p.open));
    const closeChars = new Map(pairs.map(p => [p.close, p.open]));
    
    let inString = false;
    let stringChar = '';
    let escaped = false;
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if (inString) {
        if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      } else {
        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
        } else if (openChars.has(char)) {
          stack.push(char);
        } else if (closeChars.has(char)) {
          if (stack.pop() !== closeChars.get(char)) {
            return false;
          }
        }
      }
    }
    
    return stack.length === 0 && !inString;
  }

  private isValidHTML(code: string): boolean {
    try {
      // Basic HTML validation
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, 'text/html');
      const errors = doc.querySelectorAll('parsererror');
      return errors.length === 0;
    } catch {
      return false;
    }
  }

  private async generateWebPreview(code: string, language: string): Promise<PreviewResult> {
    return new Promise((resolve) => {
      // Create sandboxed iframe for preview
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      document.body.appendChild(iframe);
      
      try {
        let content = '';
        
        if (language === 'html') {
          content = code;
        } else if (language === 'javascript' || language === 'js') {
          content = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; padding: 16px; }
                  #output { min-height: 100px; border: 1px solid #ccc; padding: 8px; }
                </style>
              </head>
              <body>
                <div id="output"></div>
                <script>
                  const output = document.getElementById('output');
                  const originalLog = console.log;
                  console.log = (...args) => {
                    const div = document.createElement('div');
                    div.innerHTML = args.map(arg => 
                      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                    ).join(' ');
                    output.appendChild(div);
                    originalLog(...args);
                  };
                  
                  try {
                    ${code}
                  } catch (error) {
                    const div = document.createElement('div');
                    div.style.color = 'red';
                    div.textContent = 'Error: ' + error.message;
                    output.appendChild(div);
                  }
                </script>
              </body>
            </html>
          `;
        } else if (language === 'css') {
          content = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>${code}</style>
              </head>
              <body>
                <div class="preview-container">
                  <h1>CSS Preview</h1>
                  <p>This is a paragraph with the applied styles.</p>
                  <div class="sample-box">Sample content</div>
                  <button>Sample Button</button>
                </div>
              </body>
            </html>
          `;
        }
        
        iframe.onload = () => {
          try {
            // Capture the rendered content as a data URL
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              // Convert the iframe content to a canvas for preview
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                canvas.width = 400;
                canvas.height = 300;
                
                // Create a simple preview representation
                const previewHtml = iframeDoc.documentElement.outerHTML;
                
                resolve({
                  status: 'success',
                  preview: previewHtml,
                  type: 'iframe'
                });
              } else {
                resolve({
                  status: 'error',
                  error: 'Failed to create preview canvas'
                });
              }
            } else {
              resolve({
                status: 'error',
                error: 'Failed to access iframe content'
              });
            }
          } catch (error) {
            resolve({
              status: 'error',
              error: error instanceof Error ? error.message : 'Preview generation failed'
            });
          } finally {
            document.body.removeChild(iframe);
          }
        };
        
        iframe.onerror = () => {
          document.body.removeChild(iframe);
          resolve({
            status: 'error',
            error: 'Failed to load preview content'
          });
        };
        
        // Set a timeout to prevent hanging
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
            resolve({
              status: 'error',
              error: 'Preview generation timeout'
            });
          }
        }, 5000);
        
        iframe.srcdoc = content;
        
      } catch (error) {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        resolve({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  private async generateReactPreview(code: string): Promise<PreviewResult> {
    // React preview would require a more complex setup with Babel transformation
    // For now, return unsupported
    return {
      status: 'unsupported',
      preview: undefined,
      error: 'React preview requires Babel transformation (not yet implemented)'
    };
  }

  private async generatePythonPreview(code: string): Promise<PreviewResult> {
    // Python preview would require Pyodide or similar
    return {
      status: 'unsupported',
      preview: undefined,
      error: 'Python preview requires server-side execution (not yet implemented)'
    };
  }

  private async generateSVGPreview(code: string): Promise<PreviewResult> {
    try {
      // Simple SVG validation and preview
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, 'image/svg+xml');
      const errors = doc.querySelectorAll('parsererror');
      
      if (errors.length > 0) {
        return {
          status: 'error',
          error: 'Invalid SVG syntax'
        };
      }
      
      return {
        status: 'success',
        preview: code,
        type: 'image'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'SVG parsing failed'
      };
    }
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Clear cache periodically to prevent memory leaks
  clearCache(): void {
    this.previewCache.clear();
  }
}