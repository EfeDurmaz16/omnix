'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Shield, 
  Cloud,
  Cpu,
  MemoryStick,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Users,
  Globe
} from 'lucide-react';

interface ServiceStatus {
  status: 'operational' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: string;
  uptime: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  version: string;
  timestamp: string;
  services: {
    database: ServiceStatus;
    auth: ServiceStatus;
    storage: ServiceStatus;
    ai_providers: {
      openai: ServiceStatus;
      anthropic: ServiceStatus;
      google: ServiceStatus;
    };
  };
  metrics: {
    activeUsers: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>;
}

export function SystemHealth() {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring/health');
      if (!response.ok) throw new Error('Failed to fetch health data');
      const data = await response.json();
      setHealthData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatUptime = (uptime: number) => {
    if (uptime >= 99.5) return `${uptime.toFixed(2)}%`;
    if (uptime >= 99) return `${uptime.toFixed(1)}%`;
    return `${uptime.toFixed(2)}%`;
  };

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cultural-primary"></div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="text-center py-8">
        <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <p className="text-cultural-text-secondary">Failed to load system health data</p>
        <Button onClick={fetchHealthData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {getStatusIcon(healthData.status)}
          <div>
            <h2 className="text-2xl font-bold">System Health</h2>
            <p className="text-cultural-text-secondary">
              Real-time monitoring of system components and performance
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <span className="text-sm text-cultural-text-secondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" onClick={fetchHealthData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className={`border-2 ${
        healthData.status === 'healthy' ? 'border-green-200 bg-green-50' :
        healthData.status === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
        'border-red-200 bg-red-50'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStatusIcon(healthData.status)}
              <div>
                <h3 className="text-xl font-bold capitalize">{healthData.status}</h3>
                <p className="text-cultural-text-secondary">
                  All systems {healthData.status === 'healthy' ? 'operational' : 'experiencing issues'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-cultural-text-secondary">System Uptime</p>
              <p className="text-2xl font-bold">{Math.floor(healthData.uptime / 3600)}h</p>
              <p className="text-sm text-cultural-text-secondary">Version {healthData.version}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Core Services</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Database */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Database</span>
                </div>
                <Badge className={`${getStatusColor(healthData.services.database.status)} text-white`}>
                  {healthData.services.database.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Response Time</span>
                  <span>{healthData.services.database.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime</span>
                  <span>{formatUptime(healthData.services.database.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Check</span>
                  <span>{new Date(healthData.services.database.lastChecked).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Authentication */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Authentication</span>
                </div>
                <Badge className={`${getStatusColor(healthData.services.auth.status)} text-white`}>
                  {healthData.services.auth.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Response Time</span>
                  <span>{healthData.services.auth.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime</span>
                  <span>{formatUptime(healthData.services.auth.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Check</span>
                  <span>{new Date(healthData.services.auth.lastChecked).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Storage */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Cloud className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Storage</span>
                </div>
                <Badge className={`${getStatusColor(healthData.services.storage.status)} text-white`}>
                  {healthData.services.storage.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Response Time</span>
                  <span>{healthData.services.storage.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime</span>
                  <span>{formatUptime(healthData.services.storage.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Check</span>
                  <span>{new Date(healthData.services.storage.lastChecked).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>AI Providers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(healthData.services.ai_providers).map(([provider, status]) => (
              <div key={provider} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-5 w-5 text-orange-500" />
                    <span className="font-medium capitalize">{provider}</span>
                  </div>
                  <Badge className={`${getStatusColor(status.status)} text-white`}>
                    {status.status}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Response Time</span>
                    <span>{status.responseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime</span>
                    <span>{formatUptime(status.uptime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Check</span>
                    <span>{new Date(status.lastChecked).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Active Users</span>
              </div>
              <span className="font-semibold">{healthData.metrics.activeUsers}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm">Requests/min</span>
              </div>
              <span className="font-semibold">{healthData.metrics.requestsPerMinute}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Avg Response Time</span>
              </div>
              <span className="font-semibold">{healthData.metrics.averageResponseTime}ms</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Error Rate</span>
              </div>
              <span className="font-semibold">{healthData.metrics.errorRate.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="h-5 w-5" />
              <span>Resource Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MemoryStick className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Memory Usage</span>
                </div>
                <span className="text-sm font-semibold">{healthData.metrics.memoryUsage.toFixed(1)}%</span>
              </div>
              <Progress value={healthData.metrics.memoryUsage} className="w-full" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-green-500" />
                  <span className="text-sm">CPU Usage</span>
                </div>
                <span className="text-sm font-semibold">{healthData.metrics.cpuUsage.toFixed(1)}%</span>
              </div>
              <Progress value={healthData.metrics.cpuUsage} className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>System Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 border rounded-lg ${getAlertLevelColor(alert.level)}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <span className="text-xs">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}