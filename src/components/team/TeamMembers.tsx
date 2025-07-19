'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  UserPlus, 
  MoreHorizontal, 
  Crown, 
  Shield, 
  User,
  Search,
  Mail
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  lastActive: string;
  creditsUsed: number;
}

interface TeamMembersProps {
  team: {
    id: string;
    name: string;
    role: string;
  };
  onUpdate: () => void;
}

export function TeamMembers({ team, onUpdate }: TeamMembersProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, [team.id]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${team.id}/members`);
      if (!response.ok) throw new Error('Failed to fetch team members');
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      // Mock data for development
      setMembers([
        {
          id: '1',
          name: 'John Smith',
          email: 'john@company.com',
          role: 'OWNER',
          joinedAt: '2024-01-15',
          lastActive: '5 minutes ago',
          creditsUsed: 1250
        },
        {
          id: '2',
          name: 'Sarah Wilson',
          email: 'sarah@company.com',
          role: 'ADMIN',
          joinedAt: '2024-01-18',
          lastActive: '2 hours ago',
          creditsUsed: 890
        },
        {
          id: '3',
          name: 'Mike Chen',
          email: 'mike@company.com',
          role: 'MEMBER',
          joinedAt: '2024-01-20',
          lastActive: '1 day ago',
          creditsUsed: 450
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async () => {
    if (!inviteEmail.trim()) return;

    try {
      setInviteLoading(true);
      const response = await fetch(`/api/teams/${team.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole
        }),
      });

      if (!response.ok) throw new Error('Failed to send invitation');

      setInviteEmail('');
      setInviteRole('MEMBER');
      setShowInviteDialog(false);
      onUpdate(); // Refresh the team data
    } catch (error) {
      console.error('Failed to send invitation:', error);
    } finally {
      setInviteLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      const response = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to update member role');

      await fetchTeamMembers(); // Refresh members
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove member');

      await fetchTeamMembers(); // Refresh members
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4 text-purple-500" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'MEMBER':
        return <User className="h-4 w-4 text-gray-500" />;
      default:
        return null;
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

  const canManageMembers = team.role === 'OWNER' || team.role === 'ADMIN';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cultural-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Team Members</h2>
          <p className="text-cultural-text-secondary">
            Manage team members and their roles
          </p>
        </div>
        {canManageMembers && (
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join {team.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Role
                  </label>
                  <Select value={inviteRole} onValueChange={(value: 'MEMBER' | 'ADMIN') => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={sendInvitation} disabled={inviteLoading || !inviteEmail.trim()}>
                    {inviteLoading ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-cultural-text-secondary" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({filteredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Credits Used</TableHead>
                {canManageMembers && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-cultural-primary/10 rounded-full flex items-center justify-center">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <span className="text-sm font-medium">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-cultural-text-secondary">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(member.role)}
                      <Badge className={`${getRoleBadgeColor(member.role)} text-white`}>
                        {member.role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-cultural-text-secondary">
                      {member.lastActive}
                    </span>
                  </TableCell>
                  <TableCell>
                    {member.creditsUsed.toLocaleString()}
                  </TableCell>
                  {canManageMembers && (
                    <TableCell>
                      {member.role !== 'OWNER' && (
                        <div className="flex space-x-2">
                          <Select
                            value={member.role}
                            onValueChange={(value: 'ADMIN' | 'MEMBER') => updateMemberRole(member.id, value)}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMember(member.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}