import { ChatMessage, GenerationRequest, GenerationResult, User, UsageStats } from './types';
import { AI_MODELS, CREDIT_COSTS } from './constants';

// Mock delay function to simulate API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock user data
const mockUser: User = {
  id: 'user-123',
  email: 'demo@omnix.ai',
  name: 'Demo User',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  plan: 'pro',
  credits: 1500,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date(),
};

// Mock usage stats
const mockUsageStats: UsageStats = {
  totalTokens: 45000,
  textTokens: 35000,
  imageGenerations: 50,
  videoGenerations: 5,
  remainingCredits: 1500,
  monthlyUsage: 500,
  lastReset: new Date(),
};

// Mock chat responses
const mockChatResponses = [
  "I'm an AI assistant here to help you with any questions or tasks you have. How can I assist you today?",
  "That's an interesting question! Let me provide you with a comprehensive answer based on my knowledge.",
  "I understand what you're looking for. Here's my detailed response to your request.",
  "Great question! I'd be happy to help you explore this topic further.",
  "Based on your input, I can provide several insights and suggestions that might be helpful.",
  "I see what you're trying to accomplish. Let me break this down for you step by step.",
  "That's a fascinating topic! Here's what I can tell you about it.",
  "I'm excited to help you with this project. Let me provide some detailed guidance.",
];

// Mock image URLs for generated images - using reliable placeholder services
const mockImageUrls = [
  'https://picsum.photos/512/512?random=1',
  'https://picsum.photos/512/512?random=2', 
  'https://picsum.photos/512/512?random=3',
  'https://picsum.photos/512/512?random=4',
  'https://picsum.photos/512/512?random=5',
  'https://placeholder.pics/svg/512x512/DEDEDE/555555/AI%20Generated',
  'https://via.placeholder.com/512x512/4F46E5/FFFFFF?text=AI+Image',
  'https://dummyimage.com/512x512/6366F1/FFFFFF&text=Generated+Image'
];

// Mock video URLs for generated videos
const mockVideoUrls = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
];

export const mockApi = {
  // Authentication
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    await delay(1000);
    return {
      user: mockUser,
      token: 'mock-jwt-token',
    };
  },

  async signup(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    await delay(1200);
    return {
      user: { ...mockUser, email, name },
      token: 'mock-jwt-token',
    };
  },

  async googleLogin(): Promise<{ user: User; token: string }> {
    await delay(800);
    return {
      user: mockUser,
      token: 'mock-jwt-token',
    };
  },

  async logout(): Promise<void> {
    await delay(300);
  },

  // User data
  async getCurrentUser(): Promise<User> {
    await delay(500);
    return mockUser;
  },

  async getUsageStats(): Promise<UsageStats> {
    await delay(600);
    return mockUsageStats;
  },

  // Chat functionality
  async sendChatMessage(message: string, model: string): Promise<ChatMessage> {
    await delay(1500 + Math.random() * 2000); // Simulate variable response time
    
    const randomResponse = mockChatResponses[Math.floor(Math.random() * mockChatResponses.length)];
    const modelInfo = AI_MODELS.find(m => m.id === model);
    
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `[${modelInfo?.name}] ${randomResponse}`,
      timestamp: new Date(),
      model,
      tokens: Math.floor(Math.random() * 500) + 50,
    };
  },

  // Generation functionality
  async generateContent(request: GenerationRequest): Promise<GenerationResult> {
    const baseDelay = request.type === 'text' ? 2000 : 
                     request.type === 'image' ? 8000 : 15000;
    
    await delay(baseDelay + Math.random() * 3000);
    
    let content = '';
    let url = '';
    let tokensUsed = 0;

    switch (request.type) {
      case 'text':
        content = `Generated text based on: "${request.prompt}"\n\n${mockChatResponses[Math.floor(Math.random() * mockChatResponses.length)]}`;
        tokensUsed = Math.floor(Math.random() * 1000) + 100;
        break;
      
      case 'image':
        content = `Image generated from prompt: "${request.prompt}"`;
        url = mockImageUrls[Math.floor(Math.random() * mockImageUrls.length)];
        tokensUsed = CREDIT_COSTS.imageGeneration;
        break;
      
      case 'video':
        content = `Video generated from prompt: "${request.prompt}"`;
        url = mockVideoUrls[Math.floor(Math.random() * mockVideoUrls.length)];
        tokensUsed = CREDIT_COSTS.videoGeneration;
        break;
    }

    return {
      id: `gen-${Date.now()}`,
      type: request.type,
      content,
      url,
      model: request.model,
      prompt: request.prompt,
      userId: mockUser.id,
      tokensUsed,
      createdAt: new Date(),
    };
  },

  // Streaming chat (for real-time responses)
  async* streamChatMessage(message: string, model: string): AsyncGenerator<string, void, unknown> {
    await delay(500);
    
    const response = mockChatResponses[Math.floor(Math.random() * mockChatResponses.length)];
    const modelInfo = AI_MODELS.find(m => m.id === model);
    const fullResponse = `[${modelInfo?.name}] ${response}`;
    
    // Simulate streaming by yielding chunks
    for (let i = 0; i < fullResponse.length; i += 3) {
      yield fullResponse.slice(i, i + 3);
      await delay(50 + Math.random() * 100);
    }
  },

  // Usage tracking
  async updateUsage(tokensUsed: number, type: 'text' | 'image' | 'video'): Promise<UsageStats> {
    await delay(300);
    
    // Update mock stats
    mockUsageStats.totalTokens += tokensUsed;
    mockUsageStats.remainingCredits -= tokensUsed;
    
    if (type === 'text') mockUsageStats.textTokens += tokensUsed;
    else if (type === 'image') mockUsageStats.imageGenerations += 1;
    else if (type === 'video') mockUsageStats.videoGenerations += 1;
    
    return mockUsageStats;
  },

  // Plan management
  async upgradePlan(planId: string): Promise<User> {
    await delay(1000);
    return { ...mockUser, plan: planId as 'free' | 'pro' | 'ultra' };
  },
}; 