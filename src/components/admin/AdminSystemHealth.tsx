'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Activity, 
  Server, 
  Database,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Clock
} from 'lucide-react';

interface SystemMetrics {
  api: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    uptime: number;
    requestsPerMinute: number;
    errorRate: number;
    lastCheck: string;
  };
  database: {
    status: 'healthy' | 'degraded' | 'down';
    connections: number;
    maxConnections: number;
    queryTime: number;
    lastCheck: string;
  };
  redis: {
    status: 'healthy' | 'degraded' | 'down';
    memory: number;
    maxMemory: number;
    connections: number;
    hitRate: number;
    lastCheck: string;
  };
  providers: {
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    lastCheck: string;
    errorRate: number;
  }[];
  rateLimits: {
    endpoint: string;
    currentLoad: number;
    limit: number;
    resetTime: string;
  }[];
  serverMetrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

export function AdminSystemHealth() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system/health');
      if (!response.ok) throw new Error('Failed to fetch system metrics');
      const data = await response.json();
      setMetrics(data.metrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      // Mock data for development
      setMetrics({
        api: {
          status: 'healthy',
          responseTime: 145,
          uptime: 99.97,
          requestsPerMinute: 2340,
          errorRate: 0.23,
          lastCheck: new Date().toISOString()
        },
        database: {
          status: 'healthy',
          connections: 45,
          maxConnections: 100,
          queryTime: 12,
          lastCheck: new Date().toISOString()
        },
        redis: {
          status: 'healthy',
          memory: 512,
          maxMemory: 2048,
          connections: 23,
          hitRate: 94.5,
          lastCheck: new Date().toISOString()
        },
        providers: [
          { name: 'OpenAI', status: 'healthy', responseTime: 890, lastCheck: new Date().toISOString(), errorRate: 0.1 },
          { name: 'Anthropic', status: 'healthy', responseTime: 1250, lastCheck: new Date().toISOString(), errorRate: 0.05 },
          { name: 'Google Vertex', status: 'degraded', responseTime: 2100, lastCheck: new Date().toISOString(), errorRate: 1.2 },
          { name: 'Replicate', status: 'healthy', responseTime: 1850, lastCheck: new Date().toISOString(), errorRate: 0.3 }
        ],
        rateLimits: [
          { endpoint: '/api/chat', currentLoad: 234, limit: 1000, resetTime: new Date(Date.now() + 45000).toISOString() },
          { endpoint: '/api/generate/image', currentLoad: 89, limit: 500, resetTime: new Date(Date.now() + 32000).toISOString() },
          { endpoint: '/api/generate/video', currentLoad: 12, limit: 100, resetTime: new Date(Date.now() + 18000).toISOString() }
        ],
        serverMetrics: {
          cpu: 34.5,
          memory: 67.2,
          disk: 42.8,
          network: 23.1
        }
      });
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const formatMemory = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cultural-primary"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Failed to load system metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Health</h2>
          <p className="text-cultural-text-secondary">
            Monitor system status and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-cultural-text-secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button onClick={fetchSystemMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Core Services Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Service</CardTitle>
            {getStatusIcon(metrics.api.status)}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Response Time</span>
                <span className="text-sm font-medium">{metrics.api.responseTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Uptime</span>
                <span className="text-sm font-medium">{formatUptime(metrics.api.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Requests/min</span>
                <span className="text-sm font-medium">{metrics.api.requestsPerMinute}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Error Rate</span>
                <span className="text-sm font-medium">{metrics.api.errorRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            {getStatusIcon(metrics.database.status)}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Connections</span>
                <span className="text-sm font-medium">
                  {metrics.database.connections}/{metrics.database.maxConnections}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Query Time</span>
                <span className="text-sm font-medium">{metrics.database.queryTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Status</span>
                <Badge className={`${getStatusBadgeColor(metrics.database.status)} text-white`}>
                  {metrics.database.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redis Cache</CardTitle>
            {getStatusIcon(metrics.redis.status)}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Memory</span>
                <span className="text-sm font-medium">
                  {formatMemory(metrics.redis.memory)}/{formatMemory(metrics.redis.maxMemory)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Connections</span>
                <span className="text-sm font-medium">{metrics.redis.connections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Hit Rate</span>
                <span className="text-sm font-medium">{metrics.redis.hitRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>Server Resources</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <Cpu className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">CPU Usage</p>
                <p className="text-lg font-semibold">{metrics.serverMetrics.cpu}%</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MemoryStick className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Memory</p>
                <p className="text-lg font-semibold">{metrics.serverMetrics.memory}%</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <HardDrive className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Disk Usage</p>
                <p className="text-lg font-semibold">{metrics.serverMetrics.disk}%</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Wifi className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Network</p>
                <p className="text-lg font-semibold">{metrics.serverMetrics.network}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Providers Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>AI Providers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Error Rate</TableHead>
                <TableHead>Last Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.providers.map((provider) => (
                <TableRow key={provider.name}>
                  <TableCell className="font-medium">{provider.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(provider.status)}
                      <Badge className={`${getStatusBadgeColor(provider.status)} text-white`}>
                        {provider.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{provider.responseTime}ms</TableCell>
                  <TableCell>{provider.errorRate}%</TableCell>
                  <TableCell>
                    {new Date(provider.lastCheck).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rate Limits Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Rate Limits</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.rateLimits.map((limit) => (
              <div key={limit.endpoint} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{limit.endpoint}</p>
                  <p className="text-sm text-cultural-text-secondary">
                    {limit.currentLoad}/{limit.limit} requests
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {((limit.currentLoad / limit.limit) * 100).toFixed(1)}% used
                  </p>
                  <p className="text-xs text-cultural-text-secondary">
                    Resets in {Math.max(0, Math.ceil((new Date(limit.resetTime).getTime() - Date.now()) / 1000))}s
                  </p>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (limit.currentLoad / limit.limit) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}