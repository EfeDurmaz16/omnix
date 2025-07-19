'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamOverview } from './TeamOverview';
import { TeamMembers } from './TeamMembers';
import { TeamUsage } from './TeamUsage';
import { TeamSettings } from './TeamSettings';
import { TeamInvitations } from './TeamInvitations';
import { CreateTeamDialog } from './CreateTeamDialog';
import { 
  Users, 
  Settings, 
  BarChart3, 
  UserPlus,
  Crown,
  Plus
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  plan: string;
  credits: number;
  maxMembers: number;
  memberCount: number;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  createdAt: string;
}

export function TeamDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchUserTeams();
  }, []);

  const fetchUserTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.teams || []);
      if (data.teams?.length > 0 && !currentTeam) {
        setCurrentTeam(data.teams[0]);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (teamData: { name: string; description?: string }) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData),
      });
      
      if (!response.ok) throw new Error('Failed to create team');
      
      await fetchUserTeams(); // Refresh teams
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create team:', error);
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'FREE': return 'bg-gray-500';
      case 'PRO': return 'bg-blue-500';
      case 'ULTRA': return 'bg-purple-500';
      case 'TEAM': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-purple-500';
      case 'ADMIN': return 'bg-blue-500';
      case 'MEMBER': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cultural-primary"></div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Users className="h-12 w-12 text-cultural-text-secondary" />
        <h3 className="text-lg font-semibold">No Teams Yet</h3>
        <p className="text-cultural-text-secondary text-center max-w-md">
          Create or join a team to collaborate with others and share resources.
        </p>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
        <CreateTeamDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateTeam={createTeam}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold cultural-text-primary">Team Management</h1>
          <p className="text-cultural-text-secondary mt-2">
            Manage your teams, members, and shared resources
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Team Selector */}
      {teams.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    currentTeam?.id === team.id 
                      ? 'border-cultural-primary bg-cultural-primary/5' 
                      : 'border-cultural-border hover:border-cultural-primary/50'
                  }`}
                  onClick={() => setCurrentTeam(team)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{team.name}</h3>
                    <div className="flex space-x-1">
                      <Badge className={`${getPlanBadgeColor(team.plan)} text-white`}>
                        {team.plan}
                      </Badge>
                      <Badge className={`${getRoleBadgeColor(team.role)} text-white`}>
                        {team.role === 'OWNER' && <Crown className="h-3 w-3 mr-1" />}
                        {team.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-cultural-text-secondary">
                    <p>{team.memberCount} members • {team.credits.toLocaleString()} credits</p>
                    {team.description && <p className="mt-1">{team.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Dashboard */}
      {currentTeam && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 cultural-card">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Invitations</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Usage</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <TeamOverview team={currentTeam} />
          </TabsContent>

          <TabsContent value="members">
            <TeamMembers team={currentTeam} onUpdate={fetchUserTeams} />
          </TabsContent>

          <TabsContent value="invitations">
            <TeamInvitations team={currentTeam} onUpdate={fetchUserTeams} />
          </TabsContent>

          <TabsContent value="usage">
            <TeamUsage team={currentTeam} />
          </TabsContent>

          <TabsContent value="settings">
            <TeamSettings team={currentTeam} onUpdate={fetchUserTeams} />
          </TabsContent>
        </Tabs>
      )}

      <CreateTeamDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateTeam={createTeam}
      />
    </div>
  );
}