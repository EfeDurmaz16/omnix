'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DollarSign, 
  CreditCard, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Search,
  Download,
  Eye
} from 'lucide-react';

interface BillingTransaction {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: 'SUBSCRIPTION' | 'CREDIT_PURCHASE' | 'REFUND' | 'CHARGEBACK';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  stripePaymentId?: string;
  stripeCustomerId?: string;
  planId?: string;
  creditsGranted?: number;
  createdAt: string;
  processedAt?: string;
  failureReason?: string;
}

interface BillingStats {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingAmount: number;
  refundedAmount: number;
  totalTransactions: number;
  failedTransactions: number;
  averageTransactionValue: number;
  conversionRate: number;
}

export function AdminBilling() {
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<BillingTransaction | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, statsRes] = await Promise.all([
        fetch('/api/admin/billing/transactions'),
        fetch('/api/admin/billing/stats')
      ]);
      
      if (!transactionsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch billing data');
      }
      
      const transactionsData = await transactionsRes.json();
      const statsData = await statsRes.json();
      
      setTransactions(transactionsData.transactions || []);
      setStats(statsData.stats || null);
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
      // Mock data for development
      setStats({
        totalRevenue: 45750.00,
        monthlyRevenue: 18750.00,
        pendingAmount: 2100.00,
        refundedAmount: 890.00,
        totalTransactions: 342,
        failedTransactions: 15,
        averageTransactionValue: 133.77,
        conversionRate: 95.6
      });
      
      setTransactions([
        {
          id: 'txn_1',
          userId: 'user_1',
          userEmail: 'john@company.com',
          userName: 'John Smith',
          type: 'SUBSCRIPTION',
          amount: 100.00,
          currency: 'USD',
          status: 'COMPLETED',
          stripePaymentId: 'pi_1234567890',
          stripeCustomerId: 'cus_1234567890',
          planId: 'TEAM',
          createdAt: '2024-01-15T10:30:00Z',
          processedAt: '2024-01-15T10:30:05Z'
        },
        {
          id: 'txn_2',
          userId: 'user_2',
          userEmail: 'sarah@startup.io',
          userName: 'Sarah Johnson',
          type: 'CREDIT_PURCHASE',
          amount: 50.00,
          currency: 'USD',
          status: 'COMPLETED',
          stripePaymentId: 'pi_0987654321',
          creditsGranted: 2500,
          createdAt: '2024-01-15T09:15:00Z',
          processedAt: '2024-01-15T09:15:03Z'
        },
        {
          id: 'txn_3',
          userId: 'user_3',
          userEmail: 'mike@agency.com',
          userName: 'Mike Chen',
          type: 'SUBSCRIPTION',
          amount: 20.00,
          currency: 'USD',
          status: 'FAILED',
          stripePaymentId: 'pi_failed123',
          planId: 'PRO',
          createdAt: '2024-01-15T08:45:00Z',
          failureReason: 'Insufficient funds'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const processRefund = async (transactionId: string, amount: number) => {
    try {
      const response = await fetch(`/api/admin/billing/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, amount }),
      });
      
      if (!response.ok) throw new Error('Failed to process refund');
      
      await fetchBillingData(); // Refresh data
    } catch (error) {
      console.error('Failed to process refund:', error);
    }
  };

  const exportTransactions = () => {
    const csv = [
      ['ID', 'User', 'Type', 'Amount', 'Status', 'Date'].join(','),
      ...filteredTransactions.map(t => [
        t.id,
        t.userEmail,
        t.type,
        t.amount,
        t.status,
        new Date(t.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'billing-transactions.csv';
    a.click();
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'PENDING': return 'bg-yellow-500';
      case 'FAILED': return 'bg-red-500';
      case 'REFUNDED': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'SUBSCRIPTION': return 'bg-blue-500';
      case 'CREDIT_PURCHASE': return 'bg-purple-500';
      case 'REFUND': return 'bg-orange-500';
      case 'CHARGEBACK': return 'bg-red-600';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Billing Management</h2>
          <p className="text-cultural-text-secondary">Monitor transactions, refunds, and revenue</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportTransactions}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchBillingData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-cultural-text-secondary">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-cultural-text-secondary">Monthly Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-cultural-text-secondary">Transactions</p>
                  <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-cultural-text-secondary">Success Rate</p>
                  <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions Management */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-cultural-text-secondary" />
                <Input
                  placeholder="Search by user, email, or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                <SelectItem value="CREDIT_PURCHASE">Credits</SelectItem>
                <SelectItem value="REFUND">Refund</SelectItem>
                <SelectItem value="CHARGEBACK">Chargeback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-sm">
                      {transaction.id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.userName}</p>
                        <p className="text-sm text-cultural-text-secondary">{transaction.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getTypeBadgeColor(transaction.type)} text-white`}>
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusBadgeColor(transaction.status)} text-white`}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedTransaction(transaction)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        {transaction.status === 'COMPLETED' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => processRefund(transaction.id, transaction.amount)}
                          >
                            Refund
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      {selectedTransaction && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>
                Complete information for transaction {selectedTransaction.id}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transaction ID</Label>
                  <p className="font-mono text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <Label>Stripe Payment ID</Label>
                  <p className="font-mono text-sm">{selectedTransaction.stripePaymentId || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User</Label>
                  <p>{selectedTransaction.userName}</p>
                  <p className="text-sm text-cultural-text-secondary">{selectedTransaction.userEmail}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="text-lg font-semibold">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Badge className={`${getTypeBadgeColor(selectedTransaction.type)} text-white`}>
                    {selectedTransaction.type}
                  </Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={`${getStatusBadgeColor(selectedTransaction.status)} text-white`}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Created</Label>
                  <p>{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Processed</Label>
                  <p>{selectedTransaction.processedAt ? new Date(selectedTransaction.processedAt).toLocaleString() : 'Not processed'}</p>
                </div>
              </div>

              {selectedTransaction.planId && (
                <div>
                  <Label>Plan</Label>
                  <p>{selectedTransaction.planId}</p>
                </div>
              )}

              {selectedTransaction.creditsGranted && (
                <div>
                  <Label>Credits Granted</Label>
                  <p>{selectedTransaction.creditsGranted.toLocaleString()}</p>
                </div>
              )}

              {selectedTransaction.failureReason && (
                <div>
                  <Label>Failure Reason</Label>
                  <p className="text-red-500">{selectedTransaction.failureReason}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}