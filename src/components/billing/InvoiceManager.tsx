'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar,
  DollarSign,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}

interface InvoiceManagerProps {
  subscription: any;
  isTeamBilling?: boolean;
  teamId?: string;
}

export function InvoiceManager({ subscription, isTeamBilling, teamId }: InvoiceManagerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [subscription?.id, isTeamBilling, teamId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const url = isTeamBilling && teamId 
        ? `/api/billing/invoices?teamId=${teamId}`
        : '/api/billing/invoices';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      setInvoices(data.invoices);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      // Mock data for development
      setInvoices([
        {
          id: 'inv_1',
          invoiceNumber: 'INV-2024-001',
          status: 'PAID',
          subtotal: 100.00,
          discountAmount: 10.00,
          taxAmount: 7.20,
          total: 97.20,
          currency: 'USD',
          periodStart: '2024-01-01T00:00:00Z',
          periodEnd: '2024-01-31T23:59:59Z',
          dueDate: '2024-02-01T00:00:00Z',
          paidAt: '2024-01-28T10:30:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          lineItems: [
            { description: 'TEAM Plan - Monthly', quantity: 1, unitPrice: 100.00, amount: 100.00 }
          ]
        },
        {
          id: 'inv_2',
          invoiceNumber: 'INV-2024-002',
          status: 'OPEN',
          subtotal: 100.00,
          discountAmount: 10.00,
          taxAmount: 7.20,
          total: 97.20,
          currency: 'USD',
          periodStart: '2024-02-01T00:00:00Z',
          periodEnd: '2024-02-29T23:59:59Z',
          dueDate: '2024-03-01T00:00:00Z',
          createdAt: '2024-02-01T00:00:00Z',
          lineItems: [
            { description: 'TEAM Plan - Monthly', quantity: 1, unitPrice: 100.00, amount: 100.00 }
          ]
        },
        {
          id: 'inv_3',
          invoiceNumber: 'INV-2024-003',
          status: 'DRAFT',
          subtotal: 125.50,
          discountAmount: 12.55,
          taxAmount: 9.04,
          total: 121.99,
          currency: 'USD',
          periodStart: '2024-03-01T00:00:00Z',
          periodEnd: '2024-03-31T23:59:59Z',
          dueDate: '2024-04-01T00:00:00Z',
          createdAt: '2024-03-01T00:00:00Z',
          lineItems: [
            { description: 'TEAM Plan - Monthly', quantity: 1, unitPrice: 100.00, amount: 100.00 },
            { description: 'Additional Credits', quantity: 500, unitPrice: 0.051, amount: 25.50 }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'OPEN': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'DRAFT': return <FileText className="h-4 w-4 text-gray-500" />;
      case 'VOID': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'UNCOLLECTIBLE': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-500';
      case 'OPEN': return 'bg-yellow-500';
      case 'DRAFT': return 'bg-gray-500';
      case 'VOID': return 'bg-red-500';
      case 'UNCOLLECTIBLE': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}/download`);
      if (!response.ok) throw new Error('Failed to download invoice');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.lineItems.some(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
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
        <div>
          <h2 className="text-2xl font-bold">Invoices</h2>
          <p className="text-cultural-text-secondary">
            View and manage your billing invoices
          </p>
        </div>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Generate Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Total Paid</p>
                <p className="text-xl font-bold">
                  ${invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Outstanding</p>
                <p className="text-xl font-bold">
                  ${invoices.filter(i => i.status === 'OPEN').reduce((sum, i) => sum + i.total, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">Total Invoices</p>
                <p className="text-xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-cultural-text-secondary">This Month</p>
                <p className="text-xl font-bold">
                  ${invoices.filter(i => new Date(i.createdAt).getMonth() === new Date().getMonth()).reduce((sum, i) => sum + i.total, 0).toFixed(2)}
                </p>
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
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="PAID">Paid</option>
                <option value="OPEN">Open</option>
                <option value="DRAFT">Draft</option>
                <option value="VOID">Void</option>
                <option value="UNCOLLECTIBLE">Uncollectible</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-cultural-text-secondary" />
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-cultural-text-secondary">
                            {new Date(invoice.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(invoice.status)}
                        <Badge className={`${getStatusBadgeColor(invoice.status)} text-white`}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(invoice.periodStart).toLocaleDateString()}</p>
                        <p className="text-cultural-text-secondary">
                          to {new Date(invoice.periodEnd).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(invoice.dueDate).toLocaleDateString()}</p>
                        {invoice.paidAt && (
                          <p className="text-green-600">
                            Paid {new Date(invoice.paidAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <p className="font-semibold">${invoice.total.toFixed(2)}</p>
                        {invoice.discountAmount > 0 && (
                          <p className="text-sm text-green-600">
                            -{invoice.discountAmount.toFixed(2)} discount
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredInvoices.length === 0 && (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-cultural-text-secondary mb-4" />
                <p className="text-cultural-text-secondary">No invoices found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Invoice {selectedInvoice.invoiceNumber}</h3>
              <Button variant="ghost" onClick={() => setSelectedInvoice(null)}>
                ×
              </Button>
            </div>

            <div className="space-y-6">
              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-cultural-text-secondary">Status</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(selectedInvoice.status)}
                    <Badge className={`${getStatusBadgeColor(selectedInvoice.status)} text-white`}>
                      {selectedInvoice.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-cultural-text-secondary">Due Date</p>
                  <p className="font-medium">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-cultural-text-secondary">Period</p>
                  <p className="font-medium">
                    {new Date(selectedInvoice.periodStart).toLocaleDateString()} - {new Date(selectedInvoice.periodEnd).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-cultural-text-secondary">Total</p>
                  <p className="font-bold text-lg">${selectedInvoice.total.toFixed(2)}</p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-semibold mb-3">Line Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell>${item.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${selectedInvoice.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${selectedInvoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>${selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <Button onClick={() => handleDownloadInvoice(selectedInvoice.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {selectedInvoice.status === 'OPEN' && (
                  <Button variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}