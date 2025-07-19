'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Settings, 
  Save, 
  Trash2, 
  AlertTriangle,
  Shield,
  Users,
  CreditCard
} from 'lucide-react';

interface TeamSettingsProps {
  team: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    plan: string;
    credits: number;
    maxMembers: number;
    role: string;
  };
  onUpdate: () => void;
}

interface TeamSettings {
  allowMemberInvites: boolean;
  autoApproveInvites: boolean;
  creditSharing: 'owner_only' | 'admin_managed' | 'shared_pool';
  modelRestrictions: string[];
  requestLimits: {
    perUser: number;
    perHour: number;
  };
  notifications: {
    lowCredits: boolean;
    newMembers: boolean;
    highUsage: boolean;
  };
}

export function TeamSettings({ team, onUpdate }: TeamSettingsProps) {
  const [formData, setFormData] = useState({
    name: team.name,
    description: team.description || '',
    maxMembers: team.maxMembers
  });
  const [settings, setSettings] = useState<TeamSettings>({
    allowMemberInvites: true,
    autoApproveInvites: false,
    creditSharing: 'shared_pool' as const,
    modelRestrictions: [],
    requestLimits: {
      perUser: 100,
      perHour: 500
    },
    notifications: {
      lowCredits: true,
      newMembers: true,
      highUsage: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchTeamSettings();
  }, [team.id]);

  const fetchTeamSettings = async () => {
    try {
      const response = await fetch(`/api/teams/${team.id}/settings`);
      if (!response.ok) throw new Error('Failed to fetch team settings');
      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch team settings:', error);
    }
  };

  const saveBasicInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update team');

      onUpdate(); // Refresh parent component
    } catch (error) {
      console.error('Failed to update team:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${team.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to update settings');
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete team');

      onUpdate(); // This will refresh and likely redirect since team is deleted
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  const upgradeTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${team.id}/upgrade`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to upgrade team');

      onUpdate(); // Refresh to show new plan
    } catch (error) {
      console.error('Failed to upgrade team:', error);
    }
  };

  const isOwner = team.role === 'OWNER';
  const isAdmin = team.role === 'ADMIN' || team.role === 'OWNER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Team Settings</h2>
        <p className="text-cultural-text-secondary">
          Manage team configuration and preferences
        </p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Basic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxMembers">Max Members</Label>
              <Input
                id="maxMembers"
                type="number"
                min="1"
                max="100"
                value={formData.maxMembers}
                onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 1 })}
                disabled={!isOwner}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!isAdmin}
              rows={3}
            />
          </div>
          {isAdmin && (
            <Button onClick={saveBasicInfo} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plan Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Plan & Billing</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Plan</p>
              <p className="text-sm text-cultural-text-secondary">
                {team.credits.toLocaleString()} credits • {team.maxMembers} members
              </p>
            </div>
            <Badge className="bg-green-500 text-white">
              {team.plan}
            </Badge>
          </div>
          {isOwner && team.plan !== 'TEAM' && (
            <Button onClick={upgradeTeam}>
              Upgrade Plan
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Team Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Team Permissions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Allow member invites</p>
              <p className="text-sm text-cultural-text-secondary">
                Let team members invite new people
              </p>
            </div>
            <Switch
              checked={settings.allowMemberInvites}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allowMemberInvites: checked })
              }
              disabled={!isAdmin}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-approve invites</p>
              <p className="text-sm text-cultural-text-secondary">
                Automatically accept invitations without approval
              </p>
            </div>
            <Switch
              checked={settings.autoApproveInvites}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, autoApproveInvites: checked })
              }
              disabled={!isOwner}
            />
          </div>

          <div className="space-y-2">
            <Label>Credit Sharing Mode</Label>
            <Select 
              value={settings.creditSharing} 
              onValueChange={(value: 'owner_only' | 'admin_managed' | 'shared_pool') => 
                setSettings({ ...settings, creditSharing: value })
              }
              disabled={!isOwner}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner_only">Owner Only</SelectItem>
                <SelectItem value="admin_managed">Admin Managed</SelectItem>
                <SelectItem value="shared_pool">Shared Pool</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isAdmin && (
            <Button onClick={saveSettings} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Permissions
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Usage Limits</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Credits per User (daily)</Label>
              <Input
                type="number"
                value={settings.requestLimits.perUser}
                onChange={(e) => setSettings({
                  ...settings,
                  requestLimits: {
                    ...settings.requestLimits,
                    perUser: parseInt(e.target.value) || 0
                  }
                })}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Team Requests (hourly)</Label>
              <Input
                type="number"
                value={settings.requestLimits.perHour}
                onChange={(e) => setSettings({
                  ...settings,
                  requestLimits: {
                    ...settings.requestLimits,
                    perHour: parseInt(e.target.value) || 0
                  }
                })}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Low credits warning</p>
              <p className="text-sm text-cultural-text-secondary">
                Alert when credits are running low
              </p>
            </div>
            <Switch
              checked={settings.notifications.lowCredits}
              onCheckedChange={(checked) => 
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, lowCredits: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New member alerts</p>
              <p className="text-sm text-cultural-text-secondary">
                Notify when new members join
              </p>
            </div>
            <Switch
              checked={settings.notifications.newMembers}
              onCheckedChange={(checked) => 
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, newMembers: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">High usage alerts</p>
              <p className="text-sm text-cultural-text-secondary">
                Alert on unusual usage spikes
              </p>
            </div>
            <Switch
              checked={settings.notifications.highUsage}
              onCheckedChange={(checked) => 
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, highUsage: checked }
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Danger Zone</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Team</p>
                <p className="text-sm text-cultural-text-secondary">
                  Permanently delete this team and all its data
                </p>
              </div>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Team</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete "{team.name}"? This action cannot be undone.
                      All team data, members, and usage history will be permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={deleteTeam}
                    >
                      Yes, Delete Team
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}