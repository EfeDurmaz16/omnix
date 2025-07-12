/**
 * Gemini AI Tool - Direct integration with Google's Gemini 2.5 model
 */

// Use dynamic import to avoid bundling issues
let GoogleGenerativeAI: any = null;
let GenerativeModel: any = null;
let ChatSession: any = null;

// Initialize Google Generative AI only if available
if (typeof window === 'undefined') {
  try {
    const genAI = require('@google/generative-ai');
    GoogleGenerativeAI = genAI.GoogleGenerativeAI;
    GenerativeModel = genAI.GenerativeModel;
    ChatSession = genAI.ChatSession;
  } catch (error) {
    console.warn('⚠️ Google Generative AI not available:', error);
  }
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export class GeminiTool {
  private genAI: any;
  private model: any;
  private chatSession?: any;
  private config: GeminiConfig;
  private available: boolean;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.available = GoogleGenerativeAI !== null;
    
    if (this.available) {
      this.genAI = new GoogleGenerativeAI(config.apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: config.model,
        generationConfig: {
          temperature: config.temperature || 0.7,
          topK: config.topK || 40,
          topP: config.topP || 0.95,
          maxOutputTokens: config.maxOutputTokens || 8192,
        }
      });
    } else {
      console.warn('⚠️ GeminiTool: Google Generative AI not available, using mock responses');
    }
  }

  /**
   * Generate single response
   */
  async generate(prompt: string, context?: string): Promise<GeminiResponse> {
    try {
      if (!this.available) {
        console.log('🤖 Mock Gemini response for:', prompt.substring(0, 100) + '...');
        const mockText = `Mock response for: ${prompt.substring(0, 100)}...\n\nThis is a simulated response from Gemini AI. The actual Gemini API is not configured.`;
        return {
          text: mockText,
          usage: {
            promptTokens: Math.ceil(prompt.length / 4),
            completionTokens: Math.ceil(mockText.length / 4),
            totalTokens: Math.ceil((prompt.length + mockText.length) / 4)
          }
        };
      }

      const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
      
      console.log('🤖 Gemini generating response for:', prompt.substring(0, 100) + '...');
      
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        usage: {
          promptTokens: await this.countTokens(fullPrompt),
          completionTokens: await this.countTokens(text),
          totalTokens: await this.countTokens(fullPrompt) + await this.countTokens(text)
        }
      };
    } catch (error) {
      console.error('❌ Gemini generation failed:', error);
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start chat session
   */
  startChat(history: ChatMessage[] = []): void {
    if (!this.available) {
      console.log('💬 Mock chat session started');
      this.chatSession = { mock: true };
      return;
    }

    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    this.chatSession = this.model.startChat({
      history: chatHistory as any
    });
  }

  /**
   * Send message in chat session
   */
  async sendMessage(message: string): Promise<GeminiResponse> {
    if (!this.available) {
      console.log('💬 Mock Gemini chat:', message.substring(0, 100) + '...');
      const mockText = `Mock chat response for: ${message.substring(0, 100)}...\n\nThis is a simulated chat response from Gemini AI.`;
      return {
        text: mockText,
        usage: {
          promptTokens: Math.ceil(message.length / 4),
          completionTokens: Math.ceil(mockText.length / 4),
          totalTokens: Math.ceil((message.length + mockText.length) / 4)
        }
      };
    }

    if (!this.chatSession) {
      this.startChat();
    }

    try {
      console.log('💬 Gemini chat message:', message.substring(0, 100) + '...');
      
      const result = await this.chatSession!.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        usage: {
          promptTokens: await this.countTokens(message),
          completionTokens: await this.countTokens(text),
          totalTokens: await this.countTokens(message) + await this.countTokens(text)
        }
      };
    } catch (error) {
      console.error('❌ Gemini chat failed:', error);
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate code
   */
  async generateCode(prompt: string, language: string = 'javascript'): Promise<GeminiResponse> {
    const codePrompt = `Generate ${language} code for the following request. Only return the code with minimal explanation:

${prompt}

Requirements:
- Use modern best practices
- Include error handling
- Add brief comments for complex logic
- Make it production-ready

Language: ${language}`;

    return this.generate(codePrompt);
  }

  /**
   * Analyze data
   */
  async analyzeData(data: any[], question: string): Promise<GeminiResponse> {
    const dataPrompt = `Analyze the following data and answer the question:

Data (JSON format):
${JSON.stringify(data, null, 2)}

Question: ${question}

Please provide:
1. Direct answer to the question
2. Key insights from the data
3. Recommendations based on the analysis
4. Any notable patterns or outliers`;

    return this.generate(dataPrompt);
  }

  /**
   * Summarize text
   */
  async summarize(text: string, length: 'short' | 'medium' | 'long' = 'medium'): Promise<GeminiResponse> {
    const lengthInstructions = {
      short: 'in 2-3 sentences',
      medium: 'in 1-2 paragraphs',
      long: 'in 3-4 paragraphs with detailed analysis'
    };

    const summarizePrompt = `Summarize the following text ${lengthInstructions[length]}:

${text}

Focus on the main points, key insights, and important conclusions.`;

    return this.generate(summarizePrompt);
  }

  /**
   * Generate email
   */
  async generateEmail(purpose: string, tone: 'formal' | 'casual' | 'friendly' = 'professional', details: string = ''): Promise<GeminiResponse> {
    const emailPrompt = `Generate a ${tone} email for the following purpose:

Purpose: ${purpose}
${details ? `Additional details: ${details}` : ''}

Requirements:
- Use appropriate subject line
- Include proper greeting and closing
- Keep it concise and clear
- Use ${tone} tone throughout
- Include call to action if needed

Format:
Subject: [subject line]
Body: [email body]`;

    return this.generate(emailPrompt);
  }

  /**
   * Translate text
   */
  async translate(text: string, targetLanguage: string, sourceLanguage: string = 'auto'): Promise<GeminiResponse> {
    const translatePrompt = `Translate the following text ${sourceLanguage !== 'auto' ? `from ${sourceLanguage}` : ''} to ${targetLanguage}:

${text}

Requirements:
- Maintain the original meaning and context
- Use natural phrasing in the target language
- Preserve formatting if any
- Only return the translated text`;

    return this.generate(translatePrompt);
  }

  /**
   * Generate creative content
   */
  async generateCreative(type: 'story' | 'poem' | 'article' | 'script', topic: string, style?: string): Promise<GeminiResponse> {
    const creativePrompt = `Generate a ${type} about "${topic}"${style ? ` in ${style} style` : ''}.

Requirements:
- Make it engaging and well-structured
- Use appropriate tone for the content type
- Include vivid descriptions and compelling narrative
- Ensure it's original and creative
- Length should be appropriate for the content type`;

    return this.generate(creativePrompt);
  }

  /**
   * Get chat history
   */
  async getChatHistory(): Promise<ChatMessage[]> {
    if (!this.chatSession) {
      return [];
    }

    try {
      const history = await this.chatSession.getHistory();
      return history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.parts[0].text || '',
        timestamp: new Date()
      }));
    } catch (error) {
      console.error('❌ Failed to get chat history:', error);
      return [];
    }
  }

  /**
   * Count tokens in text
   */
  private async countTokens(text: string): Promise<number> {
    try {
      const result = await this.model.countTokens(text);
      return result.totalTokens;
    } catch (error) {
      // Fallback estimation: roughly 4 characters per token
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Clear chat session
   */
  clearChat(): void {
    this.chatSession = undefined;
  }
}

// Default Gemini configuration
export const defaultGeminiConfig: GeminiConfig = {
  apiKey: process.env.GOOGLE_API_KEY || '',
  model: 'gemini-2.0-flash-exp',
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 8192
};

// Default Gemini tool instance
export const geminiTool = new GeminiTool(defaultGeminiConfig);