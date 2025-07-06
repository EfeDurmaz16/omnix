'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Bot, 
  Plus, 
  Search, 
  Settings, 
  Play, 
  Trash2, 
  Copy, 
  Download, 
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Brain,
  Users,
  BarChart3
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  personality: {
    name: string;
    role: string;
    expertise: string[];
    communicationStyle: string;
    responseLength: string;
    creativity: number;
    precision: number;
    proactiveness: number;
  };
  availableTools: string[];
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  model: string;
  enabled: boolean;
  autoStart: boolean;
  triggerKeywords: string[];
  permissions: {
    canAccessInternet: boolean;
    canModifyFiles: boolean;
    canSendEmails: boolean;
    canMakePurchases: boolean;
    canAccessPrivateData: boolean;
    maxCostPerHour: number;
  };
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentTemplate {
  name: string;
  description: string;
  personality: Agent['personality'];
  systemPrompt: string;
  availableTools: string[];
  triggerKeywords: string[];
}

interface AgentExecution {
  executionId: string;
  agentId: string;
  status: string;
  steps: number;
  totalCost: number;
  tokensUsed: number;
  result: any;
  startTime: string;
  endTime?: string;
}

const AVAILABLE_TOOLS = [
  { id: 'web-search', name: 'Web Search', category: 'web' },
  { id: 'fact-checker', name: 'Fact Checker', category: 'ai' },
  { id: 'data-analyzer', name: 'Data Analyzer', category: 'utility' },
  { id: 'content-generator', name: 'Content Generator', category: 'ai' },
  { id: 'image-generator', name: 'Image Generator', category: 'ai' },
  { id: 'code-executor', name: 'Code Executor', category: 'utility' },
  { id: 'calendar-api', name: 'Calendar API', category: 'api' },
  { id: 'email-sender', name: 'Email Sender', category: 'communication' },
  { id: 'social-media-publisher', name: 'Social Media Publisher', category: 'communication' },
  { id: 'trend-analyzer', name: 'Trend Analyzer', category: 'ai' },
  { id: 'citation-generator', name: 'Citation Generator', category: 'utility' },
  { id: 'github-api', name: 'GitHub API', category: 'api' },
  { id: 'documentation-generator', name: 'Documentation Generator', category: 'utility' },
  { id: 'code-analyzer', name: 'Code Analyzer', category: 'utility' },
  { id: 'chart-generator', name: 'Chart Generator', category: 'utility' },
  { id: 'statistical-analyzer', name: 'Statistical Analyzer', category: 'ai' },
  { id: 'ml-model', name: 'ML Model', category: 'ai' },
  { id: 'reminder-system', name: 'Reminder System', category: 'utility' },
  { id: 'task-manager', name: 'Task Manager', category: 'utility' }
];

const COMMUNICATION_STYLES = [
  'formal', 'casual', 'technical', 'friendly', 'professional'
];

const RESPONSE_LENGTHS = [
  'concise', 'detailed', 'comprehensive'
];

const AI_MODELS = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku'
];

export function AgentDashboard() {
  const { updateCredits } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [executingAgent, setExecutingAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<AgentExecution | null>(null);

  // Form states for creating/editing agents
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedTemplate: '',
    systemPrompt: '',
    availableTools: [] as string[],
    triggerKeywords: [] as string[],
    model: 'gpt-4',
    maxTokens: 4000,
    temperature: 0.7,
    topP: 0.9,
    enabled: true,
    autoStart: false,
    personality: {
      name: '',
      role: '',
      expertise: [] as string[],
      communicationStyle: 'professional' as const,
      responseLength: 'detailed' as const,
      creativity: 5,
      precision: 7,
      proactiveness: 6
    },
    permissions: {
      canAccessInternet: false,
      canModifyFiles: false,
      canSendEmails: false,
      canMakePurchases: false,
      canAccessPrivateData: false,
      maxCostPerHour: 5.0
    }
  });

  const [taskDescription, setTaskDescription] = useState('');

  useEffect(() => {
    loadAgents();
    loadTemplates();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      console.log('📥 Loading agents...');
      
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setAgents(data.data);
        console.log('✅ Loaded agents:', data.data.length);
      }
    } catch (error) {
      console.error('❌ Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/agents/templates');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
        console.log('✅ Loaded templates:', data.data.length);
      }
    } catch (error) {
      console.error('❌ Failed to load templates:', error);
    }
  };

  const handleCreateAgent = async () => {
    if (!formData.name.trim()) return;

    setCreating(true);
    try {
      console.log('🤖 Creating agent:', formData.name);
      
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: formData.selectedTemplate || undefined,
          config: {
            name: formData.name,
            description: formData.description,
            systemPrompt: formData.systemPrompt,
            availableTools: formData.availableTools,
            triggerKeywords: formData.triggerKeywords,
            model: formData.model,
            maxTokens: formData.maxTokens,
            temperature: formData.temperature,
            topP: formData.topP,
            enabled: formData.enabled,
            autoStart: formData.autoStart,
            personality: formData.personality,
            permissions: formData.permissions
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        console.log('✅ Agent created successfully');
        await loadAgents();
        setShowCreateDialog(false);
        resetForm();
        alert(`🤖 Agent "${formData.name}" created successfully!`);
      }
    } catch (error) {
      console.error('❌ Failed to create agent:', error);
      alert(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleExecuteAgent = async () => {
    if (!executingAgent || !taskDescription.trim()) return;

    setExecuting(true);
    try {
      console.log('🚀 Executing agent task:', executingAgent.name);
      
      const response = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: executingAgent.id,
          taskDescription: taskDescription,
          context: {}
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        console.log('✅ Agent execution completed');
        setLastExecution(data.data);
        setShowExecuteDialog(false);
        setTaskDescription('');
        updateCredits(Math.ceil(data.data.totalCost * 100)); // Convert to credits
        alert(`🎉 Task completed successfully!\n\nSteps: ${data.data.steps}\nCost: $${data.data.totalCost.toFixed(4)}\nTokens: ${data.data.tokensUsed}`);
      }
    } catch (error) {
      console.error('❌ Failed to execute agent task:', error);
      alert(`Failed to execute task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleDeleteAgent = async (agent: Agent) => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/agents?id=${agent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        await loadAgents();
        alert(`🗑️ Agent "${agent.name}" deleted successfully!`);
      }
    } catch (error) {
      console.error('❌ Failed to delete agent:', error);
      alert(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTemplateSelect = (templateName: string) => {
    if (templateName === 'custom') {
      setFormData(prev => ({
        ...prev,
        selectedTemplate: templateName,
        name: '',
        description: '',
        systemPrompt: '',
        availableTools: [],
        triggerKeywords: [],
        personality: {
          name: '',
          role: '',
          expertise: [],
          communicationStyle: 'professional',
          responseLength: 'detailed',
          creativity: 5,
          precision: 7,
          proactiveness: 6
        }
      }));
      return;
    }

    const template = templates.find(t => t.name === templateName);
    if (template) {
      setFormData(prev => ({
        ...prev,
        selectedTemplate: templateName,
        name: template.name,
        description: template.description,
        systemPrompt: template.systemPrompt,
        availableTools: template.availableTools,
        triggerKeywords: template.triggerKeywords,
        personality: template.personality
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      selectedTemplate: '',
      systemPrompt: '',
      availableTools: [],
      triggerKeywords: [],
      model: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.7,
      topP: 0.9,
      enabled: true,
      autoStart: false,
      personality: {
        name: '',
        role: '',
        expertise: [],
        communicationStyle: 'professional',
        responseLength: 'detailed',
        creativity: 5,
        precision: 7,
        proactiveness: 6
      },
      permissions: {
        canAccessInternet: false,
        canModifyFiles: false,
        canSendEmails: false,
        canMakePurchases: false,
        canAccessPrivateData: false,
        maxCostPerHour: 5.0
      }
    });
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.personality.expertise.some(skill => 
      skill.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="cultural-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-6 w-6 text-primary" />
              <CardTitle className="cultural-text-primary">AI Agents</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search agents..."
                  className="pl-10 w-64"
                />
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Agent
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-800">
                  <DialogHeader className="pb-6 border-b border-gray-200 dark:border-gray-700">
                    <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Bot className="h-6 w-6 text-blue-600" />
                      Create AI Agent
                    </DialogTitle>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                      Design your custom AI assistant with specific capabilities and personality
                    </p>
                  </DialogHeader>
                  
                  <Tabs defaultValue="template" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                      <TabsTrigger value="template" className="bg-transparent data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300">Template</TabsTrigger>
                      <TabsTrigger value="basic" className="bg-transparent data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300">Basic</TabsTrigger>
                      <TabsTrigger value="personality" className="bg-transparent data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300">Personality</TabsTrigger>
                      <TabsTrigger value="advanced" className="bg-transparent data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300">Advanced</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="template" className="space-y-6 mt-6 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                      <div>
                        <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">Choose Template</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Start with a pre-built template or create your own custom agent from scratch
                        </p>
                        <Select value={formData.selectedTemplate} onValueChange={handleTemplateSelect}>
                          <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                            <SelectValue placeholder="Select a template or start from scratch" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                            <SelectItem value="custom" className="text-gray-800 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-blue-600" />
                                <div>
                                  <div className="font-medium">Custom Agent</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Build from scratch</div>
                                </div>
                              </div>
                            </SelectItem>
                            {templates.map((template) => (
                              <SelectItem key={template.name} value={template.name} className="text-gray-800 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900">
                                <div className="flex items-center gap-2">
                                  <Brain className="h-4 w-4 text-green-600" />
                                  <div>
                                    <div className="font-medium">{template.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{template.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="basic" className="space-y-6 mt-6 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                      <div>
                        <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">Agent Name</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter agent name..."
                          className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder:text-gray-500"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">Description</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe what this agent does..."
                          rows={3}
                          className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder:text-gray-500"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">System Prompt</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Define how your agent should behave and what it should do
                        </p>
                        <Textarea
                          value={formData.systemPrompt}
                          onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                          placeholder="You are a helpful AI assistant that specializes in..."
                          rows={6}
                          className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder:text-gray-500"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">Available Tools</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Select the tools and capabilities your agent can use
                        </p>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {AVAILABLE_TOOLS.map((tool) => (
                            <div key={tool.id} className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                              <input
                                type="checkbox"
                                id={tool.id}
                                checked={formData.availableTools.includes(tool.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      availableTools: [...prev.availableTools, tool.id]
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      availableTools: prev.availableTools.filter(t => t !== tool.id)
                                    }));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <Label htmlFor={tool.id} className="text-sm text-gray-800 dark:text-white cursor-pointer flex-1">
                                <div className="font-medium">{tool.name}</div>
                                <Badge variant="outline" className="mt-1 text-xs border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-400">
                                  {tool.category}
                                </Badge>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="personality" className="space-y-6 mt-6 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">Personality Name</Label>
                          <Input
                            value={formData.personality.name}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              personality: { ...prev.personality, name: e.target.value }
                            }))}
                            placeholder="e.g., Alex Research"
                            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder:text-gray-500"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">Role</Label>
                          <Input
                            value={formData.personality.role}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              personality: { ...prev.personality, role: e.target.value }
                            }))}
                            placeholder="e.g., Research Specialist"
                            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder:text-gray-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">Communication Style</Label>
                          <Select 
                            value={formData.personality.communicationStyle} 
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              personality: { ...prev.personality, communicationStyle: value as any }
                            }))}
                          >
                            <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                              {COMMUNICATION_STYLES.map(style => (
                                <SelectItem key={style} value={style} className="text-gray-800 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900">
                                  {style.charAt(0).toUpperCase() + style.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">Response Length</Label>
                          <Select 
                            value={formData.personality.responseLength} 
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              personality: { ...prev.personality, responseLength: value as any }
                            }))}
                          >
                            <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                              {RESPONSE_LENGTHS.map(length => (
                                <SelectItem key={length} value={length} className="text-gray-800 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900">
                                  {length.charAt(0).toUpperCase() + length.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-6 mt-6">
                        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">
                            Creativity: {formData.personality.creativity}/10
                          </Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            How creative and imaginative should the agent be in its responses?
                          </p>
                          <Slider
                            value={[formData.personality.creativity]}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              personality: { ...prev.personality, creativity: value[0] }
                            }))}
                            max={10}
                            min={0}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                        
                        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">
                            Precision: {formData.personality.precision}/10
                          </Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            How accurate and detailed should the agent be in its responses?
                          </p>
                          <Slider
                            value={[formData.personality.precision]}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              personality: { ...prev.personality, precision: value[0] }
                            }))}
                            max={10}
                            min={0}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                        
                        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">
                            Proactiveness: {formData.personality.proactiveness}/10
                          </Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            How proactive should the agent be in taking initiative and suggesting actions?
                          </p>
                          <Slider
                            value={[formData.personality.proactiveness]}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              personality: { ...prev.personality, proactiveness: value[0] }
                            }))}
                            max={10}
                            min={0}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="advanced" className="space-y-6 mt-6 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">AI Model</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Choose the AI model that powers your agent
                          </p>
                          <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}>
                            <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                              {AI_MODELS.map(model => (
                                <SelectItem key={model} value={model} className="text-gray-800 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900">
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">Max Tokens</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Maximum length of responses (100-32000)
                          </p>
                          <Input
                            type="number"
                            value={formData.maxTokens}
                            onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 4000 }))}
                            min={100}
                            max={32000}
                            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder:text-gray-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">
                            Temperature: {formData.temperature}
                          </Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Controls randomness (0.0 = focused, 2.0 = creative)
                          </p>
                          <Slider
                            value={[formData.temperature]}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, temperature: value[0] }))}
                            max={2}
                            min={0}
                            step={0.1}
                            className="mt-2"
                          />
                        </div>
                        
                        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">
                            Top P: {formData.topP}
                          </Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Controls diversity (0.0 = narrow, 1.0 = diverse)
                          </p>
                          <Slider
                            value={[formData.topP]}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, topP: value[0] }))}
                            max={1}
                            min={0}
                            step={0.1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <Label className="text-gray-800 dark:text-white font-semibold text-base mb-4 block">Security & Permissions</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Configure what actions your agent is allowed to perform
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                              <Label className="text-gray-800 dark:text-white font-medium">Internet Access</Label>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Browse web and APIs</p>
                            </div>
                            <Switch
                              checked={formData.permissions.canAccessInternet}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                permissions: { ...prev.permissions, canAccessInternet: checked }
                              }))}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                              <Label className="text-gray-800 dark:text-white font-medium">Send Emails</Label>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Email communication</p>
                            </div>
                            <Switch
                              checked={formData.permissions.canSendEmails}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                permissions: { ...prev.permissions, canSendEmails: checked }
                              }))}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                              <Label className="text-gray-800 dark:text-white font-medium">Modify Files</Label>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Edit and create files</p>
                            </div>
                            <Switch
                              checked={formData.permissions.canModifyFiles}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                permissions: { ...prev.permissions, canModifyFiles: checked }
                              }))}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                              <Label className="text-gray-800 dark:text-white font-medium">Private Data</Label>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Access sensitive info</p>
                            </div>
                            <Switch
                              checked={formData.permissions.canAccessPrivateData}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                permissions: { ...prev.permissions, canAccessPrivateData: checked }
                              }))}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-6 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <Label className="text-gray-800 dark:text-white font-semibold text-base mb-3 block">
                            Max Cost Per Hour: ${formData.permissions.maxCostPerHour}
                          </Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Limit spending to prevent unexpected costs
                          </p>
                          <Slider
                            value={[formData.permissions.maxCostPerHour]}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              permissions: { ...prev.permissions, maxCostPerHour: value[0] }
                            }))}
                            max={50}
                            min={0.1}
                            step={0.1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-lg p-6 -m-6 mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateDialog(false)}
                      className="px-6 py-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateAgent} 
                      disabled={creating || !formData.name.trim()}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Agent...
                        </>
                      ) : (
                        <>
                          <Bot className="mr-2 h-4 w-4" />
                          Create Agent
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="cultural-card">
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4 text-primary" />
              <p className="cultural-text-muted">Loading agents...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agents Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <Card key={agent.id} className="cultural-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold cultural-text-primary">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground">{agent.personality.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {agent.enabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <p className="text-sm cultural-text-muted line-clamp-2">
                  {agent.description}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {agent.personality.expertise.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {agent.personality.expertise.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{agent.personality.expertise.length - 3}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{agent.availableTools.length} tools</span>
                  <span>{agent.model}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setExecutingAgent(agent);
                      setShowExecuteDialog(true);
                    }}
                    disabled={!agent.enabled}
                  >
                    <Play className="mr-2 h-3 w-3" />
                    Execute
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteAgent(agent)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAgents.length === 0 && (
        <Card className="cultural-card">
          <CardContent className="py-12">
            <div className="text-center cultural-text-muted">
              <Bot className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No agents found</p>
              <p className="text-sm">
                {searchQuery ? 'Try adjusting your search terms.' : 'Create your first AI agent to get started.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execute Agent Dialog */}
      <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Execute Agent Task</DialogTitle>
          </DialogHeader>
          
          {executingAgent && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <Bot className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">{executingAgent.name}</h3>
                    <p className="text-sm text-muted-foreground">{executingAgent.description}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Task Description</Label>
                <Textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe the task you want the agent to perform..."
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowExecuteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleExecuteAgent} 
                  disabled={executing || !taskDescription.trim()}
                >
                  {executing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    'Execute Task'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Last Execution Results */}
      {lastExecution && (
        <Card className="cultural-card">
          <CardHeader>
            <CardTitle className="cultural-text-primary">Last Execution Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={lastExecution.status === 'completed' ? 'default' : 'destructive'}>
                  {lastExecution.status}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Steps:</span>
                <span className="text-sm">{lastExecution.steps}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cost:</span>
                <span className="text-sm">${lastExecution.totalCost.toFixed(4)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tokens:</span>
                <span className="text-sm">{lastExecution.tokensUsed.toLocaleString()}</span>
              </div>
              
              {lastExecution.result && (
                <div>
                  <span className="text-sm font-medium">Result:</span>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(lastExecution.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}