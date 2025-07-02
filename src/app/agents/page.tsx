'use client';

import { AgentBuilder } from '@/components/agents/AgentBuilder';

export default function AgentsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          AI Agents
        </h1>
        <p className="text-muted-foreground mt-2">
          Create, manage, and deploy your personal AI agents
        </p>
      </div>
      <AgentBuilder />
    </div>
  );
}