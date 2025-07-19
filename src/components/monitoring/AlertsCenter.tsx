'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Settings,
  Filter,
  Search,
  Clock,
  CreditCard,
  TrendingUp,
  XCircle,
  Calendar,
  Zap,
  Shield
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'CREDIT_LOW' | 'USAGE_HIGH' | 'PAYMENT_FAILED' | 'PLAN_EXPIRY' | 'RATE_LIMIT' | 'SYSTEM_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
  expiresAt?: string;
}

interface AlertPreferences {
  CREDIT_LOW: { enabled: boolean; threshold: number; channels: string[] };
  USAGE_HIGH: { enabled: boolean; threshold: number; channels: string[] };
  PAYMENT_FAILED: { enabled: boolean; channels: string[] };
  PLAN_EXPIRY: { enabled: boolean; daysAhead: number; channels: string[] };
  RATE_LIMIT: { enabled: boolean; threshold: number; channels: string[] };
  SYSTEM_ERROR: { enabled: boolean; channels: string[] };
}

export function AlertsCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null);

  useEffect(() => {
    fetchAlerts();
    fetchPreferences();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/monitoring/alerts/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      // Set default preferences
      setPreferences({
        CREDIT_LOW: { enabled: true, threshold: 1000, channels: ['email', 'dashboard'] },
        USAGE_HIGH: { enabled: true, threshold: 200, channels: ['email', 'dashboard'] },
        PAYMENT_FAILED: { enabled: true, channels: ['email', 'dashboard', 'push'] },
        PLAN_EXPIRY: { enabled: true, daysAhead: 7, channels: ['email', 'dashboard'] },
        RATE_LIMIT: { enabled: true, threshold: 80, channels: ['dashboard'] },
        SYSTEM_ERROR: { enabled: true, channels: ['email', 'dashboard', 'push'] }
      });
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'CREDIT_LOW': return <CreditCard className="h-4 w-4" />;
      case 'USAGE_HIGH': return <TrendingUp className="h-4 w-4" />;
      case 'PAYMENT_FAILED': return <XCircle className="h-4 w-4" />;
      case 'PLAN_EXPIRY': return <Calendar className="h-4 w-4" />;
      case 'RATE_LIMIT': return <Zap className="h-4 w-4" />;
      case 'SYSTEM_ERROR': return <Shield className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const handleMarkAsRead = async (alertIds: string[]) => {
    try {
      const response = await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds, action: 'mark_read' })
      });
      
      if (!response.ok) throw new Error('Failed to mark alerts as read');
      
      setAlerts(alerts => 
        alerts.map(alert => 
          alertIds.includes(alert.id) ? { ...alert, isRead: true } : alert
        )
      );
      setUnreadCount(prev => Math.max(0, prev - alertIds.length));
    } catch (error) {
      console.error('Failed to mark alerts as read:', error);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [alertId], action: 'dismiss' })
      });
      
      if (!response.ok) throw new Error('Failed to dismiss alert');
      
      setAlerts(alerts => alerts.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const handleMarkAllAsRead = () => {
    const unreadAlertIds = alerts.filter(alert => !alert.isRead).map(alert => alert.id);
    if (unreadAlertIds.length > 0) {
      handleMarkAsRead(unreadAlertIds);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const response = await fetch('/api/monitoring/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences })
      });
      
      if (!response.ok) throw new Error('Failed to save preferences');
      
      setShowPreferences(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || alert.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

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
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6" />
          <div>
            <h2 className="text-2xl font-bold">Alerts Center</h2>
            <p className="text-cultural-text-secondary">
              Monitor and manage system alerts and notifications
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div className="flex space-x-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowPreferences(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Critical</p>
                <p className="text-2xl font-bold">
                  {alerts.filter(a => a.severity === 'CRITICAL').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">High</p>
                <p className="text-2xl font-bold">
                  {alerts.filter(a => a.severity === 'HIGH').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Medium</p>
                <p className="text-2xl font-bold">
                  {alerts.filter(a => a.severity === 'MEDIUM').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Total</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cultural-text-secondary" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg ${
                  !alert.isRead ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                      alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                      alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium">{alert.title}</h3>
                        <Badge className={`${getSeverityColor(alert.severity)} text-white text-xs`}>
                          {alert.severity}
                        </Badge>
                        {!alert.isRead && (
                          <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-cultural-text-secondary mb-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-cultural-text-secondary">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(alert.createdAt).toLocaleString()}</span>
                        </div>
                        {alert.expiresAt && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Expires {new Date(alert.expiresAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!alert.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead([alert.id])}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissAlert(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredAlerts.length === 0 && (
              <div className="text-center py-8">
                <Bell className="mx-auto h-12 w-12 text-cultural-text-secondary mb-4" />
                <p className="text-cultural-text-secondary">No alerts found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Preferences Modal */}
      {showPreferences && preferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Alert Preferences</h3>
              <Button variant="ghost" onClick={() => setShowPreferences(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {Object.entries(preferences).map(([type, settings]) => (
                <div key={type} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getAlertIcon(type)}
                      <h4 className="font-medium">{type.replace('_', ' ')}</h4>
                    </div>
                    <button
                      onClick={() => {
                        setPreferences(prev => ({
                          ...prev!,
                          [type]: { ...settings, enabled: !settings.enabled }
                        }));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.enabled ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {settings.enabled && (
                    <div className="space-y-3">
                      {('threshold' in settings) && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Threshold {type === 'CREDIT_LOW' ? '(credits)' : '(%)'}
                          </label>
                          <Input
                            type="number"
                            value={settings.threshold}
                            onChange={(e) => {
                              setPreferences(prev => ({
                                ...prev!,
                                [type]: { ...settings, threshold: parseInt(e.target.value) || 0 }
                              }));
                            }}
                          />
                        </div>
                      )}

                      {('daysAhead' in settings) && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Days Ahead</label>
                          <Input
                            type="number"
                            value={settings.daysAhead}
                            onChange={(e) => {
                              setPreferences(prev => ({
                                ...prev!,
                                [type]: { ...settings, daysAhead: parseInt(e.target.value) || 0 }
                              }));
                            }}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">Notification Channels</label>
                        <div className="flex flex-wrap gap-2">
                          {['email', 'push', 'dashboard'].map(channel => (
                            <label key={channel} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={settings.channels.includes(channel)}
                                onChange={(e) => {
                                  const newChannels = e.target.checked
                                    ? [...settings.channels, channel]
                                    : settings.channels.filter(c => c !== channel);
                                  setPreferences(prev => ({
                                    ...prev!,
                                    [type]: { ...settings, channels: newChannels }
                                  }));
                                }}
                              />
                              <span className="text-sm capitalize">{channel}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowPreferences(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreferences}>
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}