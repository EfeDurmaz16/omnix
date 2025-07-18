'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Plus, FileText, Play, Download, Copy } from 'lucide-react';

const DEFAULT_TEMPLATES = {
  html: `<!DOCTYPE html>
<html>
<head>
  <title>HTML Sandbox</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .demo-box { 
      background: #f8f9fa; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0;
      border-left: 4px solid #667eea;
    }
    .button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      transition: background 0.2s;
    }
    .button:hover {
      background: #5a6fd8;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 HTML Sandbox</h1>
    <p>Welcome to the HTML playground! Start building your ideas here.</p>
    
    <div class="demo-box">
      <h2>✨ Interactive Demo</h2>
      <p>This is a styled demo box. Try editing the HTML and CSS!</p>
      <button class="button" onclick="alert('Hello from HTML Sandbox!')">
        Click Me!
      </button>
    </div>
    
    <div class="demo-box">
      <h3>📝 Getting Started</h3>
      <ul>
        <li>Edit the HTML in the left panel</li>
        <li>See live changes in the right panel</li>
        <li>Try adding more CSS styles</li>
        <li>Create interactive elements with JavaScript</li>
      </ul>
    </div>
  </div>
</body>
</html>`,

  javascript: `// 🚀 JavaScript Sandbox
console.log("Welcome to JavaScript Sandbox!");

// Interactive Demo Functions
function createInteractiveDemo() {
  // Create a colorful header
  const header = document.createElement('div');
  header.innerHTML = '<h1 style="color: #667eea; text-align: center;">🎯 JavaScript Playground</h1>';
  document.body.appendChild(header);

  // Create a counter demo
  const counterDiv = document.createElement('div');
  counterDiv.style.cssText = 'text-align: center; margin: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;';
  
  let count = 0;
  const countDisplay = document.createElement('h2');
  countDisplay.textContent = \`Count: \${count}\`;
  
  const incrementBtn = document.createElement('button');
  incrementBtn.textContent = '➕ Increment';
  incrementBtn.style.cssText = 'margin: 10px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer;';
  
  const decrementBtn = document.createElement('button');
  decrementBtn.textContent = '➖ Decrement';
  decrementBtn.style.cssText = 'margin: 10px; padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer;';
  
  incrementBtn.onclick = () => {
    count++;
    countDisplay.textContent = \`Count: \${count}\`;
  };
  
  decrementBtn.onclick = () => {
    count--;
    countDisplay.textContent = \`Count: \${count}\`;
  };
  
  counterDiv.appendChild(countDisplay);
  counterDiv.appendChild(incrementBtn);
  counterDiv.appendChild(decrementBtn);
  document.body.appendChild(counterDiv);
}

// Math Functions Demo
function mathDemo() {
  console.log("🔢 Math Functions Demo:");
  
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  
  console.log("Original numbers:", numbers);
  console.log("Squared:", numbers.map(n => n * n));
  console.log("Sum:", numbers.reduce((a, b) => a + b, 0));
  console.log("Even numbers:", numbers.filter(n => n % 2 === 0));
}

// Initialize demos
createInteractiveDemo();
mathDemo();

// Fun animation
setInterval(() => {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
  document.body.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)] + '20';
}, 2000);`,

  jsx: `// ⚛️ React JSX Sandbox
function TodoApp() {
  const [todos, setTodos] = React.useState([
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Build something awesome', completed: false }
  ]);
  const [inputValue, setInputValue] = React.useState('');

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, { 
        id: Date.now(), 
        text: inputValue, 
        completed: false 
      }]);
      setInputValue('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        color: '#667eea',
        marginBottom: '30px'
      }}>
        📝 React Todo App
      </h1>
      
      <div style={{ 
        display: 'flex', 
        marginBottom: '20px',
        gap: '10px'
      }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add a new todo..."
          style={{
            flex: 1,
            padding: '10px',
            border: '2px solid #e9ecef',
            borderRadius: '6px',
            fontSize: '16px'
          }}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
        />
        <button
          onClick={addTodo}
          style={{
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ➕ Add
        </button>
      </div>

      <div>
        {todos.map(todo => (
          <div key={todo.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '15px',
            margin: '10px 0',
            background: todo.completed ? '#e8f5e8' : '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              style={{ marginRight: '15px', transform: 'scale(1.2)' }}
            />
            <span style={{
              flex: 1,
              textDecoration: todo.completed ? 'line-through' : 'none',
              color: todo.completed ? '#6c757d' : '#212529',
              fontSize: '16px'
            }}>
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
      
      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        color: '#6c757d'
      }}>
        Total: {todos.length} | Completed: {todos.filter(t => t.completed).length}
      </div>
    </div>
  );
}

// Render the app
ReactDOM.render(<TodoApp />, document.getElementById('root'));`,

  css: `/* 🎨 CSS Sandbox */
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin: 20px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.card h2 {
  color: #333;
  margin-bottom: 16px;
  font-size: 1.5rem;
}

.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  background: #667eea;
  color: white;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.fade-in {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Demo elements */
.demo-box {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  border-left: 4px solid #667eea;
}

.demo-box h3 {
  color: #667eea;
  margin-bottom: 10px;
}`
};

export default function SandboxPage() {
  const [activeTab, setActiveTab] = useState('playground');
  const [currentCode, setCurrentCode] = useState(DEFAULT_TEMPLATES.html);
  const [currentLanguage, setCurrentLanguage] = useState('html');

  const handleNewSandbox = (language: string) => {
    const template = DEFAULT_TEMPLATES[language as keyof typeof DEFAULT_TEMPLATES] || '';
    setCurrentCode(template);
    setCurrentLanguage(language);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    alert('Code copied to clipboard!');
  };

  const downloadCode = () => {
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandbox-code.${currentLanguage}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportHTML = () => {
    let content = currentCode;
    if (currentLanguage === 'javascript') {
      content = `<!DOCTYPE html>
<html>
<head>
  <title>JavaScript Sandbox</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .console-output { background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; }
  </style>
</head>
<body>
  <div id="output"></div>
  <script>
    ${currentCode}
  </script>
</body>
</html>`;
    } else if (currentLanguage === 'jsx') {
      content = `<!DOCTYPE html>
<html>
<head>
  <title>React Sandbox</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${currentCode}
  </script>
</body>
</html>`;
    } else if (currentLanguage === 'css') {
      content = `<!DOCTYPE html>
<html>
<head>
  <title>CSS Sandbox</title>
  <style>
    ${currentCode}
  </style>
</head>
<body>
  <div class="container">
    <h1>CSS Sandbox</h1>
    <div class="card fade-in">
      <h2>🎨 Styled Card</h2>
      <p>This card demonstrates your CSS styling!</p>
      <button class="button pulse">Awesome Button</button>
      <span class="badge">CSS</span>
    </div>
    <div class="grid">
      <div class="demo-box">
        <h3>Demo Box 1</h3>
        <p>Your CSS styles are applied here.</p>
      </div>
      <div class="demo-box">
        <h3>Demo Box 2</h3>
        <p>Try hovering over the cards!</p>
      </div>
    </div>
  </div>
</body>
</html>`;
    }
    
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sandbox-preview.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const languages = [
    { value: 'html', label: 'HTML', icon: '🌐' },
    { value: 'javascript', label: 'JavaScript', icon: '⚡' },
    { value: 'jsx', label: 'React JSX', icon: '⚛️' },
    { value: 'css', label: 'CSS', icon: '🎨' }
  ];

  return (
    <div className="h-screen cultural-bg">
      <Navbar />
      <div className="h-[calc(100vh-64px)] flex flex-col">
        <div className="container mx-auto px-4 py-6 flex-1">
          <Card className="w-full h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Code Sandbox
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Create, edit, and preview your code in real-time
              </p>
            </CardHeader>
            <CardContent className="h-[calc(100%-120px)]">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="playground">
                      <Play className="h-4 w-4 mr-2" />
                      Playground
                    </TabsTrigger>
                    <TabsTrigger value="templates">
                      <FileText className="h-4 w-4 mr-2" />
                      Templates
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyCode}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadCode}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportHTML}>
                      Export HTML
                    </Button>
                  </div>
                </div>

                <TabsContent value="playground" className="h-[calc(100%-80px)]">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-4">
                      <select 
                        value={currentLanguage} 
                        onChange={(e) => setCurrentLanguage(e.target.value)}
                        className="px-3 py-2 border rounded-md"
                      >
                        {languages.map(lang => (
                          <option key={lang.value} value={lang.value}>
                            {lang.icon} {lang.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        onClick={() => handleNewSandbox(currentLanguage)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Load Template
                      </Button>
                    </div>
                    
                    <div className="flex-1 border rounded-lg overflow-hidden">
                      <div className="h-full flex">
                        <div className="w-1/2 h-full border-r">
                          <div className="h-8 bg-gray-100 flex items-center px-4 text-sm font-medium">
                            Code Editor
                          </div>
                          <textarea
                            value={currentCode}
                            onChange={(e) => setCurrentCode(e.target.value)}
                            className="w-full h-[calc(100%-2rem)] p-4 font-mono text-sm resize-none border-none outline-none"
                            placeholder="Enter your code here..."
                          />
                        </div>
                        <div className="w-1/2 h-full">
                          <div className="h-8 bg-gray-100 flex items-center px-4 text-sm font-medium">
                            Live Preview
                          </div>
                          <iframe
                            srcDoc={currentCode}
                            className="w-full h-[calc(100%-2rem)] border-none bg-white"
                            sandbox="allow-scripts allow-same-origin"
                            title="Code Preview"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="templates" className="h-[calc(100%-80px)]">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Code Templates</h3>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      {Object.entries(DEFAULT_TEMPLATES).map(([language, template]) => {
                        const lang = languages.find(l => l.value === language);
                        return (
                          <Card key={language} className="cursor-pointer hover:bg-gray-50">
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <span className="text-xl">{lang?.icon}</span>
                                {lang?.label}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between">
                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto flex-1 mr-4">
                                  <code>{template.substring(0, 100)}...</code>
                                </pre>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleNewSandbox(language)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Use Template
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}