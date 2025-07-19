'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Shield, 
  Search, 
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  success: boolean;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    severity: '',
    success: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      const searchParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/security/audit-logs?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data = await response.json();
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const searchParams = new URLSearchParams({
        format: 'csv',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/security/audit-logs/export?${searchParams}`);
      if (!response.ok) throw new Error('Failed to export audit logs');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
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

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) return <User className="h-4 w-4" />;
    if (action.includes('DELETE')) return <XCircle className="h-4 w-4" />;
    if (action.includes('CREATE') || action.includes('GENERATE')) return <CheckCircle className="h-4 w-4" />;
    if (action.includes('FAILED') || action.includes('ATTEMPT')) return <AlertTriangle className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    if (userAgent.includes('curl') || userAgent.includes('Python') || userAgent.includes('requests')) {
      return <Globe className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resource.toLowerCase().includes(searchLower) ||
      log.userEmail.toLowerCase().includes(searchLower) ||
      log.ipAddress.includes(searchTerm)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6" />
          <div>
            <h2 className="text-2xl font-bold">Audit Logs</h2>
            <p className="text-cultural-text-secondary">
              Monitor and track all system activities and security events
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Critical Events</p>
                <p className="text-2xl font-bold">
                  {logs.filter(log => log.severity === 'CRITICAL').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Failed Actions</p>
                <p className="text-2xl font-bold">
                  {logs.filter(log => !log.success).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Unique Users</p>
                <p className="text-2xl font-bold">
                  {new Set(logs.map(log => log.userId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Total Events</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cultural-text-secondary" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={filters.success}
              onChange={(e) => setFilters(prev => ({ ...prev, success: e.target.value }))}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="">All Results</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>

            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border rounded-lg"
            />

            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cultural-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActionIcon(log.action)}
                          <div>
                            <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-cultural-text-secondary">{log.resource}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.userName || 'Unknown'}</p>
                          <p className="text-sm text-cultural-text-secondary">{log.userEmail}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.resource}</p>
                          {log.resourceId && (
                            <p className="text-sm text-cultural-text-secondary">{log.resourceId}</p>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {log.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className={log.success ? 'text-green-600' : 'text-red-600'}>
                            {log.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={`${getSeverityColor(log.severity)} text-white`}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getDeviceIcon(log.userAgent)}
                          <div>
                            <p className="text-sm font-medium">{log.ipAddress}</p>
                            <p className="text-xs text-cultural-text-secondary">
                              {log.userAgent.length > 30 
                                ? `${log.userAgent.substring(0, 30)}...` 
                                : log.userAgent
                              }
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-cultural-text-secondary" />
                          <div>
                            <p className="text-sm">{new Date(log.timestamp).toLocaleDateString()}</p>
                            <p className="text-xs text-cultural-text-secondary">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredLogs.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-cultural-text-secondary mb-4" />
                  <p className="text-cultural-text-secondary">No audit logs found</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-cultural-text-secondary">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Audit Log Details</h3>
              <Button variant="ghost" onClick={() => setSelectedLog(null)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-cultural-text-secondary">Event ID</p>
                  <p className="font-mono text-sm">{selectedLog.id}</p>
                </div>
                <div>
                  <p className="text-sm text-cultural-text-secondary">Timestamp</p>
                  <p className="font-medium">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-cultural-text-secondary">User</p>
                  <p className="font-medium">{selectedLog.userName} ({selectedLog.userEmail})</p>
                </div>
                <div>
                  <p className="text-sm text-cultural-text-secondary">Action</p>
                  <p className="font-medium">{selectedLog.action.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-cultural-text-secondary">Resource</p>
                  <p className="font-medium">{selectedLog.resource}</p>
                </div>
                <div>
                  <p className="text-sm text-cultural-text-secondary">Status</p>
                  <Badge className={selectedLog.success ? 'bg-green-500' : 'bg-red-500'}>
                    {selectedLog.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-cultural-text-secondary">Severity</p>
                  <Badge className={`${getSeverityColor(selectedLog.severity)} text-white`}>
                    {selectedLog.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-cultural-text-secondary">IP Address</p>
                  <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-cultural-text-secondary mb-2">User Agent</p>
                <p className="text-sm bg-gray-100 p-2 rounded">{selectedLog.userAgent}</p>
              </div>

              {selectedLog.details && (
                <div>
                  <p className="text-sm text-cultural-text-secondary mb-2">Additional Details</p>
                  <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}