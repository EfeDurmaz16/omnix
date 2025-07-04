'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  FileText, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download,
  Settings,
  Eye,
  Trash2,
  Lock,
  Key,
  Activity,
  BarChart3,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getComplianceFramework, SOC2Control } from '@/lib/compliance/SOC2Framework';
import { getSSOManager } from '@/lib/auth/SSOIntegration';
import { getPrivacyManager } from '@/lib/privacy/PrivacyControls';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
}

function MetricsCard({ title, value, change, icon: Icon, trend }: MetricsCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <p className={`text-xs ${getTrendColor()}`}>
                {change}
              </p>
            )}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ComplianceDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [complianceData, setComplianceData] = useState<any>(null);
  const [ssoMetrics, setSSOMetrics] = useState<any>(null);
  const [privacyMetrics, setPrivacyMetrics] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      const compliance = getComplianceFramework();
      const sso = getSSOManager();
      const privacy = getPrivacyManager();

      const complianceReport = compliance.generateComplianceReport();
      const ssoStats = sso.getSSOMetrics();
      const privacyStats = privacy.getPrivacyMetrics();

      setComplianceData(complianceReport);
      setSSOMetrics(ssoStats);
      setPrivacyMetrics(privacyStats);
      setAuditEvents(complianceReport.recentAudits);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    }
  };

  const getControlsByCategory = (category: string): SOC2Control[] => {
    if (!complianceData) return [];
    if (category === 'all') return complianceData.controls;
    return complianceData.controls.filter((c: SOC2Control) => c.category === category);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'planned': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'implemented': return 'default';
      case 'in_progress': return 'secondary';
      case 'planned': return 'outline';
      default: return 'destructive';
    }
  };

  if (!complianceData || !ssoMetrics || !privacyMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading compliance dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SOC 2 Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Security, Availability, Processing Integrity, Confidentiality & Privacy Controls
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadComplianceData}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Compliance Score"
          value={`${complianceData.summary.complianceScore}%`}
          change="+2% from last month"
          icon={Shield}
          trend="up"
        />
        <MetricsCard
          title="Implemented Controls"
          value={`${complianceData.summary.implementedControls}/${complianceData.summary.totalControls}`}
          icon={CheckCircle}
        />
        <MetricsCard
          title="Active SSO Sessions"
          value={ssoMetrics.activeSessions}
          change="+12% from yesterday"
          icon={Key}
          trend="up"
        />
        <MetricsCard
          title="Privacy Requests"
          value={privacyMetrics.pendingExports + privacyMetrics.pendingDeletions}
          change="2 pending"
          icon={Users}
          trend="stable"
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="controls" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="controls">SOC 2 Controls</TabsTrigger>
          <TabsTrigger value="sso">SSO Management</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Controls</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* SOC 2 Controls Tab */}
        <TabsContent value="controls" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Security Controls</h2>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
                <SelectItem value="Availability">Availability</SelectItem>
                <SelectItem value="Processing Integrity">Processing Integrity</SelectItem>
                <SelectItem value="Confidentiality">Confidentiality</SelectItem>
                <SelectItem value="Privacy">Privacy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {getControlsByCategory(selectedCategory).map((control: SOC2Control) => (
              <Card key={control.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {control.id}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(control.status)}>
                      {control.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm">{control.title}</CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    {control.category}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs mb-3">
                    {control.description}
                  </CardDescription>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <span className="font-medium">Implementation:</span>
                      <p className="text-muted-foreground mt-1">{control.implementation}</p>
                    </div>
                    {control.evidence && control.evidence.length > 0 && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">
                          {control.evidence.length} evidence file(s)
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SSO Management Tab */}
        <TabsContent value="sso" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SSO Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total</span>
                    <span className="font-medium">{ssoMetrics.totalProviders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Enabled</span>
                    <span className="font-medium text-green-600">{ssoMetrics.enabledProviders}</span>
                  </div>
                  <Progress 
                    value={(ssoMetrics.enabledProviders / ssoMetrics.totalProviders) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ssoMetrics.activeSessions}</div>
                <p className="text-xs text-muted-foreground">Currently logged in</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Logins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ssoMetrics.recentLogins}</div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>SSO Provider Configuration</CardTitle>
              <CardDescription>
                Manage enterprise SSO integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Okta', 'Azure AD', 'Google Workspace', 'OneLogin', 'Auth0'].map((provider) => (
                  <div key={provider} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{provider}</p>
                        <p className="text-sm text-muted-foreground">
                          {provider === 'Okta' ? 'SAML 2.0' : provider === 'Azure AD' ? 'OIDC' : 'OAuth 2.0'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={provider === 'Okta' ? 'default' : 'secondary'}>
                        {provider === 'Okta' ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Controls Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Total Users</p>
                    <p className="text-xl font-bold">{privacyMetrics.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Active Consents</p>
                    <p className="text-xl font-bold">{privacyMetrics.activeConsents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Pending Exports</p>
                    <p className="text-xl font-bold">{privacyMetrics.pendingExports}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Pending Deletions</p>
                    <p className="text-xl font-bold">{privacyMetrics.pendingDeletions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Subject Rights</CardTitle>
                <CardDescription>
                  GDPR and CCPA compliance requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Right to Access</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Right to Portability</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Right to Erasure</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Right to Rectification</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy Compliance Score</CardTitle>
                <CardDescription>
                  Overall privacy compliance rating
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{privacyMetrics.complianceScore}%</span>
                    <Badge variant="default">Excellent</Badge>
                  </div>
                  <Progress value={privacyMetrics.complianceScore} className="h-3" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Consent Management</p>
                      <p className="font-medium">100%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data Processing</p>
                      <p className="font-medium">98%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Compliance Audit Trail</h2>
            <div className="flex items-center gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {auditEvents.slice(0, 10).map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        event.riskLevel === 'high' ? 'bg-red-500' :
                        event.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{event.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.userId || 'System'} • {event.resource}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {event.riskLevel}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}