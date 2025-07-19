'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw
} from 'lucide-react';

interface TeamInvitation {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  inviterName: string;
  createdAt: string;
  expiresAt: string;
}

interface TeamInvitationsProps {
  team: {
    id: string;
    name: string;
    role: string;
  };
  onUpdate: () => void;
}

export function TeamInvitations({ team, onUpdate }: TeamInvitationsProps) {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvitations();
  }, [team.id]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${team.id}/invitations`);
      if (!response.ok) throw new Error('Failed to fetch invitations');
      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      // Mock data for development
      setInvitations([
        {
          id: '1',
          email: 'alice@company.com',
          role: 'MEMBER',
          status: 'PENDING',
          inviterName: 'John Smith',
          createdAt: '2024-01-20T10:00:00Z',
          expiresAt: '2024-01-27T10:00:00Z'
        },
        {
          id: '2',
          email: 'bob@external.com',
          role: 'ADMIN',
          status: 'PENDING',
          inviterName: 'Sarah Wilson',
          createdAt: '2024-01-19T15:30:00Z',
          expiresAt: '2024-01-26T15:30:00Z'
        },
        {
          id: '3',
          email: 'charlie@partner.com',
          role: 'MEMBER',
          status: 'ACCEPTED',
          inviterName: 'John Smith',
          createdAt: '2024-01-18T09:15:00Z',
          expiresAt: '2024-01-25T09:15:00Z'
        },
        {
          id: '4',
          email: 'diana@client.com',
          role: 'MEMBER',
          status: 'DECLINED',
          inviterName: 'Mike Chen',
          createdAt: '2024-01-17T14:20:00Z',
          expiresAt: '2024-01-24T14:20:00Z'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/teams/${team.id}/invitations/${invitationId}/resend`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to resend invitation');

      await fetchInvitations(); // Refresh invitations
    } catch (error) {
      console.error('Failed to resend invitation:', error);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      const response = await fetch(`/api/teams/${team.id}/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to cancel invitation');

      await fetchInvitations(); // Refresh invitations
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'DECLINED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'EXPIRED':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500';
      case 'ACCEPTED': return 'bg-green-500';
      case 'DECLINED': return 'bg-red-500';
      case 'EXPIRED': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-blue-500';
      case 'MEMBER': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) return `${diffDays}d ${diffHours}h remaining`;
    if (diffHours > 0) return `${diffHours}h remaining`;
    return 'Less than 1h remaining';
  };

  const canManageInvitations = team.role === 'OWNER' || team.role === 'ADMIN';

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
          <h2 className="text-xl font-semibold">Team Invitations</h2>
          <p className="text-cultural-text-secondary">
            Manage pending and completed invitations
          </p>
        </div>
        <Button onClick={fetchInvitations} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Pending</p>
                <p className="text-2xl font-bold">
                  {invitations.filter(i => i.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Accepted</p>
                <p className="text-2xl font-bold">
                  {invitations.filter(i => i.status === 'ACCEPTED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Declined</p>
                <p className="text-2xl font-bold">
                  {invitations.filter(i => i.status === 'DECLINED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Total Sent</p>
                <p className="text-2xl font-bold">{invitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-cultural-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Invitations Yet</h3>
              <p className="text-cultural-text-secondary">
                Invitations you send will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Expires</TableHead>
                  {canManageInvitations && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-cultural-text-secondary" />
                        <span className="font-medium">{invitation.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getRoleBadgeColor(invitation.role)} text-white`}>
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(invitation.status)}
                        <Badge className={`${getStatusBadgeColor(invitation.status)} text-white`}>
                          {invitation.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{invitation.inviterName}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-cultural-text-secondary">
                          {formatTimeRemaining(invitation.expiresAt)}
                        </p>
                      </div>
                    </TableCell>
                    {canManageInvitations && (
                      <TableCell>
                        <div className="flex space-x-2">
                          {invitation.status === 'PENDING' && !isExpired(invitation.expiresAt) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resendInvitation(invitation.id)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Resend
                            </Button>
                          )}
                          {(invitation.status === 'PENDING' || invitation.status === 'EXPIRED') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelInvitation(invitation.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}