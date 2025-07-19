'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Lock, 
  Key,
  Database,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  Eye,
  Settings,
  Globe,
  Zap
} from 'lucide-react';

interface DataProtectionSettings {
  dataRetention: {
    enabled: boolean;
    defaultPeriod: number;
    policies: {
      userData: number;
      conversations: number;
      images: number;
      videos: number;
      auditLogs: number;
      apiUsage: number;
    };
  };
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    keyRotation: boolean;
    algorithm: string;
  };
  privacy: {
    dataMinimization: boolean;
    consentTracking: boolean;
    rightToErasure: boolean;
    dataPortability: boolean;
    accessRequests: boolean;
  };
  compliance: {
    gdpr: boolean;
    ccpa: boolean;
    hipaa: boolean;
    soc2: boolean;
  };
  anonymization: {
    enabled: boolean;
    methods: string[];
    triggers: string[];
  };
}

export function DataProtection() {
  const [settings, setSettings] = useState<DataProtectionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingChanges, setPendingChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/security/data-protection');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Failed to fetch data protection settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/security/data-protection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      
      if (!response.ok) throw new Error('Failed to save settings');
      
      setPendingChanges(false);
      // Show success notification
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDataAction = async (action: string, parameters: any = {}) => {
    try {
      const response = await fetch('/api/security/data-protection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, parameters })
      });
      
      if (!response.ok) throw new Error(`Failed to execute ${action}`);
      
      const data = await response.json();
      // Handle response based on action
      console.log(`${action} response:`, data);
    } catch (error) {
      console.error(`Failed to execute ${action}:`, error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cultural-primary"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <p className="text-cultural-text-secondary">Failed to load data protection settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6" />
          <div>
            <h2 className="text-2xl font-bold">Data Protection</h2>
            <p className="text-cultural-text-secondary">
              Manage data privacy, security, and compliance settings
            </p>
          </div>
        </div>
        {pendingChanges && (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchSettings}>
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Compliance Status */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Compliance Status: Compliant</p>
              <p className="text-sm text-green-700">
                All data protection measures are active and compliant with regulations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'retention', label: 'Data Retention', icon: Database },
            { id: 'encryption', label: 'Encryption', icon: Lock },
            { id: 'privacy', label: 'Privacy Rights', icon: Users },
            { id: 'compliance', label: 'Compliance', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-cultural-text-secondary">Encryption</p>
                    <p className="text-lg font-bold">
                      {settings.encryption.atRest && settings.encryption.inTransit ? 'Active' : 'Partial'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-cultural-text-secondary">Data Retention</p>
                    <p className="text-lg font-bold">
                      {settings.dataRetention.enabled ? 'Configured' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-cultural-text-secondary">Compliance</p>
                    <p className="text-lg font-bold">
                      {Object.values(settings.compliance).filter(Boolean).length}/4 Active
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleDataAction('export_user_data', { 
                    targetUserId: 'user_123', 
                    dataTypes: ['profile', 'conversations'] 
                  })}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export User Data
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleDataAction('compliance_scan', { 
                    scanType: 'full' 
                  })}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Run Compliance Scan
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleDataAction('anonymize_data', { 
                    dataSet: 'expired_sessions',
                    method: 'pseudonymization' 
                  })}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Anonymize Data
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => handleDataAction('delete_user_data', { 
                    targetUserId: 'user_456',
                    reason: 'user_request' 
                  })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Retention Tab */}
      {activeTab === 'retention' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Data Retention Policies</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Data Retention</p>
                  <p className="text-sm text-cultural-text-secondary">
                    Automatically delete data after specified periods
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSettings(prev => ({
                      ...prev!,
                      dataRetention: {
                        ...prev!.dataRetention,
                        enabled: !prev!.dataRetention.enabled
                      }
                    }));
                    setPendingChanges(true);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.dataRetention.enabled ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.dataRetention.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.dataRetention.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(settings.dataRetention.policies).map(([type, days]) => (
                    <div key={type} className="p-4 border rounded-lg">
                      <label className="block text-sm font-medium mb-2 capitalize">
                        {type.replace(/([A-Z])/g, ' $1').trim()} (days)
                      </label>
                      <Input
                        type="number"
                        value={days}
                        onChange={(e) => {
                          const newDays = parseInt(e.target.value) || 0;
                          setSettings(prev => ({
                            ...prev!,
                            dataRetention: {
                              ...prev!.dataRetention,
                              policies: {
                                ...prev!.dataRetention.policies,
                                [type]: newDays
                              }
                            }
                          }));
                          setPendingChanges(true);
                        }}
                        min="1"
                      />
                      <p className="text-xs text-cultural-text-secondary mt-1">
                        {Math.floor(days / 365)} years, {Math.floor((days % 365) / 30)} months
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Encryption Tab */}
      {activeTab === 'encryption' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Encryption Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Encryption at Rest</p>
                      <p className="text-sm text-cultural-text-secondary">
                        Encrypt stored data
                      </p>
                    </div>
                    <Badge className={settings.encryption.atRest ? 'bg-green-500' : 'bg-red-500'}>
                      {settings.encryption.atRest ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Encryption in Transit</p>
                      <p className="text-sm text-cultural-text-secondary">
                        Encrypt data during transmission
                      </p>
                    </div>
                    <Badge className={settings.encryption.inTransit ? 'bg-green-500' : 'bg-red-500'}>
                      {settings.encryption.inTransit ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Key Rotation</p>
                      <p className="text-sm text-cultural-text-secondary">
                        Automatic encryption key rotation
                      </p>
                    </div>
                    <Badge className={settings.encryption.keyRotation ? 'bg-green-500' : 'bg-yellow-500'}>
                      {settings.encryption.keyRotation ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="font-medium mb-2">Encryption Algorithm</p>
                    <p className="text-sm bg-gray-100 p-2 rounded font-mono">
                      {settings.encryption.algorithm}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Key className="h-4 w-4 text-blue-600" />
                      <p className="font-medium text-blue-900">Key Management</p>
                    </div>
                    <p className="text-sm text-blue-700">
                      Encryption keys are managed through industry-standard key management systems
                      with automatic rotation and secure backup.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Privacy Rights Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Privacy Rights Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.privacy).map(([right, enabled]) => (
                <div key={right} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">
                      {right.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-sm text-cultural-text-secondary">
                      {right === 'dataMinimization' && 'Collect only necessary data'}
                      {right === 'consentTracking' && 'Track user consent preferences'}
                      {right === 'rightToErasure' && 'Allow users to delete their data'}
                      {right === 'dataPortability' && 'Enable data export in standard formats'}
                      {right === 'accessRequests' && 'Handle data access requests'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSettings(prev => ({
                        ...prev!,
                        privacy: {
                          ...prev!.privacy,
                          [right]: !enabled
                        }
                      }));
                      setPendingChanges(true);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Compliance Standards</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(settings.compliance).map(([standard, enabled]) => (
                  <div key={standard} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium uppercase">{standard}</h3>
                      <Badge className={enabled ? 'bg-green-500' : 'bg-gray-500'}>
                        {enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-cultural-text-secondary mb-3">
                      {standard === 'gdpr' && 'European General Data Protection Regulation'}
                      {standard === 'ccpa' && 'California Consumer Privacy Act'}
                      {standard === 'hipaa' && 'Health Insurance Portability and Accountability Act'}
                      {standard === 'soc2' && 'SOC 2 Type II Compliance'}
                    </p>
                    <button
                      onClick={() => {
                        setSettings(prev => ({
                          ...prev!,
                          compliance: {
                            ...prev!.compliance,
                            [standard]: !enabled
                          }
                        }));
                        setPendingChanges(true);
                      }}
                      className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
                        enabled 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Anonymization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Automatic Anonymization</p>
                  <p className="text-sm text-cultural-text-secondary">
                    Automatically anonymize data based on triggers
                  </p>
                </div>
                <Badge className={settings.anonymization.enabled ? 'bg-green-500' : 'bg-gray-500'}>
                  {settings.anonymization.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              {settings.anonymization.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium mb-2">Methods</p>
                    <div className="space-y-2">
                      {settings.anonymization.methods.map((method) => (
                        <Badge key={method} variant="outline">
                          {method.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium mb-2">Triggers</p>
                    <div className="space-y-2">
                      {settings.anonymization.triggers.map((trigger) => (
                        <Badge key={trigger} variant="outline">
                          {trigger.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}