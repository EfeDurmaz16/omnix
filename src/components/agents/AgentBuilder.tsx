"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Plus, 
  Settings, 
  Play, 
  Pause, 
  Trash2, 
  Brain, 
  Zap, 
  Target,
  MessageSquare,
  BarChart3,
  Edit,
  Copy,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  AgentConfig, 
  AgentCapability, 
  AgentPersonality, 
  AGENT_TEMPLATES
} from '@/types/agent';

interface AgentBuilderProps {
  onAgentCreated?: (agent: AgentConfig) => void;
}

export function AgentBuilder({ onAgentCreated }: AgentBuilderProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Form state for agent creation
  const [agentForm, setAgentForm] = useState<Partial<AgentConfig>>({
    name: '',
    description: '',
    personality: {
      name: '',
      description: '',
      communicationStyle: 'casual',
      expertise: [],
      constraints: [],
      systemPrompt: ''
    },
    capabilities: [],
    preferredModel: 'gpt-4o',
    fallbackModel: 'claude-3.5-sonnet',
    maxTokensPerTask: 4000,
    maxCostPerDay: 5.0,
    isActive: true
  });

  // Load user agents on mount
  useEffect(() => {
    loadUserAgents();
  }, []);

  const loadUserAgents = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const userAgents = await fetch('/api/agents').then(r => r.json());
      // For now, just use empty array
      setAgents([]);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!agentForm.name || !agentForm.description) {
      alert('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const agent = await fetch('/api/agents', { method: 'POST', body: JSON.stringify(agentForm) });
      const agent: AgentConfig = {
        id: `agent_${Date.now()}`,
        ...agentForm,
        isActive: false,
        createdAt: new Date(),
        usageCount: 0
      } as AgentConfig;
      setAgents(prev => [agent, ...prev]);
      setIsCreating(false);
      setAgentForm({
        name: '',
        description: '',
        personality: {
          name: '',
          description: '',
          communicationStyle: 'casual',
          expertise: [],
          constraints: [],
          systemPrompt: ''
        },
        capabilities: [],
        preferredModel: 'gpt-4o',
        fallbackModel: 'claude-3.5-sonnet',
        maxTokensPerTask: 4000,
        maxCostPerDay: 5.0,
        isActive: true
      });
      onAgentCreated?.(agent);
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert('Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = AGENT_TEMPLATES.find((_, index) => index.toString() === templateId);
    if (template) {
      setAgentForm(prev => ({
        ...prev,
        ...template,
        name: template.name || '',
        description: template.description || ''
      }));
    }
  };

  const handleToggleAgent = async (agentId: string) => {
    try {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        // TODO: Replace with actual API call
        // await fetch(`/api/agents/${agentId}`, { method: 'PATCH', body: JSON.stringify({ isActive: !agent.isActive }) });
        setAgents(prev => prev.map(a => 
          a.id === agentId ? { ...a, isActive: !a.isActive } : a
        ));
      }
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      try {
        // TODO: Replace with actual API call
        // await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
        setAgents(prev => prev.filter(a => a.id !== agentId));
      } catch (error) {
        console.error('Failed to delete agent:', error);
      }
    }
  };

  const AgentCard = ({ agent }: { agent: AgentConfig }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
      <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${agent.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{agent.name}</h3>
              <p className="text-sm text-gray-600">{agent.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={agent.isActive ? 'default' : 'secondary'}>
              {agent.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleAgent(agent.id)}
            >
              {agent.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteAgent(agent.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Model</p>
            <p className="text-sm text-gray-600">{agent.preferredModel}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Style</p>
            <p className="text-sm text-gray-600 capitalize">{agent.personality.communicationStyle}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Executions</p>
            <p className="text-sm text-gray-600">{agent.totalExecutions}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Total Cost</p>
            <p className="text-sm text-gray-600">${(agent.totalCost || 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {agent.capabilities.slice(0, 3).map((cap, index) => (
            <Badge key={cap.id || `${cap.type}-${index}`} variant="outline" className="text-xs">
              {cap.name}
            </Badge>
          ))}
          {agent.capabilities.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{agent.capabilities.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <BarChart3 className="h-4 w-4 mr-2" />
            Metrics
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );

  const AgentCreationForm = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Create New Agent</h3>
        <Button
          variant="ghost"
          onClick={() => setIsCreating(false)}
        >
          Cancel
        </Button>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="personality">Personality</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="mb-4">
            <Label htmlFor="template">Start from Template (Optional)</Label>
            <select
              className="w-full p-2 border rounded-md cultural-card cultural-border cultural-text-primary bg-input focus:ring-2 focus:ring-ring"
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                if (e.target.value) {
                  handleTemplateSelect(e.target.value);
                }
              }}
            >
              <option value="">Create from scratch</option>
              {AGENT_TEMPLATES.map((template, index) => (
                <option key={index} value={index.toString()}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="name">Agent Name *</Label>
            <Input
              id="name"
              value={agentForm.name}
              onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Assistant"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={agentForm.description}
              onChange={(e) => setAgentForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this agent does..."
              rows={3}
            />
          </div>
        </TabsContent>

        <TabsContent value="personality" className="space-y-4">
          <div>
            <Label htmlFor="personalityName">Personality Name</Label>
            <Input
              id="personalityName"
              value={agentForm.personality?.name || ''}
              onChange={(e) => setAgentForm(prev => ({
                ...prev,
                personality: { ...prev.personality!, name: e.target.value }
              }))}
              placeholder="Assistant"
            />
          </div>

          <div>
            <Label htmlFor="communicationStyle">Communication Style</Label>
            <select
              id="communicationStyle"
              className="w-full p-2 border rounded-md cultural-card cultural-border cultural-text-primary bg-input focus:ring-2 focus:ring-ring"
              value={agentForm.personality?.communicationStyle || 'casual'}
              onChange={(e) => setAgentForm(prev => ({
                ...prev,
                personality: { ...prev.personality!, communicationStyle: e.target.value as any }
              }))}
            >
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
              <option value="technical">Technical</option>
              <option value="creative">Creative</option>
              <option value="analytical">Analytical</option>
            </select>
          </div>

          <div>
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={agentForm.personality?.systemPrompt || ''}
              onChange={(e) => setAgentForm(prev => ({
                ...prev,
                personality: { ...prev.personality!, systemPrompt: e.target.value }
              }))}
              placeholder="You are a helpful AI assistant..."
              rows={4}
            />
          </div>
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-4">
          <div className="text-center text-gray-500 py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Capability configuration coming soon...</p>
            <p className="text-sm">Agents will have pre-configured capabilities based on templates</p>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preferredModel">Preferred Model</Label>
              <select
                id="preferredModel"
                className="w-full p-2 border rounded-md cultural-card cultural-border cultural-text-primary bg-input focus:ring-2 focus:ring-ring"
                value={agentForm.preferredModel}
                onChange={(e) => setAgentForm(prev => ({ ...prev, preferredModel: e.target.value }))}
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>

            <div>
              <Label htmlFor="fallbackModel">Fallback Model</Label>
              <select
                id="fallbackModel"
                className="w-full p-2 border rounded-md cultural-card cultural-border cultural-text-primary bg-input focus:ring-2 focus:ring-ring"
                value={agentForm.fallbackModel}
                onChange={(e) => setAgentForm(prev => ({ ...prev, fallbackModel: e.target.value }))}
              >
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </select>
            </div>

            <div>
              <Label htmlFor="maxTokens">Max Tokens per Task</Label>
              <Input
                id="maxTokens"
                type="number"
                value={agentForm.maxTokensPerTask}
                onChange={(e) => setAgentForm(prev => ({ ...prev, maxTokensPerTask: parseInt(e.target.value) }))}
              />
            </div>

            <div>
              <Label htmlFor="maxCost">Max Cost per Day ($)</Label>
              <Input
                id="maxCost"
                type="number"
                step="0.1"
                value={agentForm.maxCostPerDay}
                onChange={(e) => setAgentForm(prev => ({ ...prev, maxCostPerDay: parseFloat(e.target.value) }))}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-3 mt-6">
        <Button variant="outline" onClick={() => setIsCreating(false)}>
          Cancel
        </Button>
        <Button onClick={handleCreateAgent} disabled={loading}>
          {loading ? 'Creating...' : 'Create Agent'}
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600 mt-2">Create and manage autonomous AI assistants</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Agent</span>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {isCreating ? (
            <AgentCreationForm />
          ) : (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading agents...</p>
                </div>
              ) : agents.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
                  <p className="text-gray-600 mb-6">Create your first AI agent to get started</p>
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Agent
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {agents.map(agent => (
                      <AgentCard key={agent.id} agent={agent} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AGENT_TEMPLATES.map((template, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.capabilities?.slice(0, 2).map((cap, index) => (
                    <Badge key={cap.id || `${cap.type}-${index}`} variant="outline" className="text-xs">
                      {cap.name}
                    </Badge>
                  ))}
                </div>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    handleTemplateSelect(index.toString());
                    setIsCreating(true);
                  }}
                >
                  Use Template
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600">Comprehensive agent performance metrics coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 