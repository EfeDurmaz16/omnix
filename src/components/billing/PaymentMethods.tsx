'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2,
  Check,
  AlertCircle,
  Lock,
  Calendar,
  DollarSign,
  Building
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  brand?: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  billingDetails: {
    name: string;
    email: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  createdAt: string;
}

interface PaymentMethodsProps {
  subscription: any;
  isTeamBilling?: boolean;
}

export function PaymentMethods({ subscription, isTeamBilling }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, [subscription?.id, isTeamBilling]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const url = isTeamBilling 
        ? `/api/billing/payment-methods?teamId=${subscription?.teamId}`
        : '/api/billing/payment-methods';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      const data = await response.json();
      setPaymentMethods(data.paymentMethods);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      // Mock data for development
      setPaymentMethods([
        {
          id: 'pm_1',
          type: 'card',
          brand: 'visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true,
          billingDetails: {
            name: 'John Doe',
            email: 'john@example.com',
            address: {
              line1: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              postal_code: '94105',
              country: 'US'
            }
          },
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'pm_2',
          type: 'card',
          brand: 'mastercard',
          last4: '5555',
          expiryMonth: 8,
          expiryYear: 2026,
          isDefault: false,
          billingDetails: {
            name: 'John Doe',
            email: 'john@example.com'
          },
          createdAt: '2024-02-01T00:00:00Z'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getCardIcon = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'amex': return '💳';
      case 'discover': return '💳';
      default: return '💳';
    }
  };

  const getMethodTypeIcon = (type: string) => {
    switch (type) {
      case 'card': return <CreditCard className="h-5 w-5" />;
      case 'bank_account': return <Building className="h-5 w-5" />;
      case 'paypal': return <DollarSign className="h-5 w-5" />;
      default: return <CreditCard className="h-5 w-5" />;
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const response = await fetch(`/api/billing/payment-methods/${methodId}/set-default`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to set default payment method');
      
      setPaymentMethods(methods => 
        methods.map(method => ({
          ...method,
          isDefault: method.id === methodId
        }))
      );
    } catch (error) {
      console.error('Failed to set default payment method:', error);
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    
    try {
      const response = await fetch(`/api/billing/payment-methods/${methodId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete payment method');
      
      setPaymentMethods(methods => methods.filter(method => method.id !== methodId));
    } catch (error) {
      console.error('Failed to delete payment method:', error);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMethod(true);
    
    try {
      // In a real implementation, this would integrate with Stripe or another payment processor
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      const newMethod: PaymentMethod = {
        id: `pm_${Date.now()}`,
        type: 'card',
        brand: 'visa',
        last4: '1234',
        expiryMonth: 12,
        expiryYear: 2026,
        isDefault: paymentMethods.length === 0,
        billingDetails: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        createdAt: new Date().toISOString()
      };
      
      setPaymentMethods(methods => [...methods, newMethod]);
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add payment method:', error);
    } finally {
      setAddingMethod(false);
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
          <h2 className="text-2xl font-bold">Payment Methods</h2>
          <p className="text-cultural-text-secondary">
            Manage your payment methods and billing information
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Lock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Secure Payment Processing</p>
              <p className="text-sm text-blue-700">
                All payment information is encrypted and processed securely through our payment partners.
                We never store your complete card details.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods List */}
      <div className="grid gap-4">
        {paymentMethods.map((method) => (
          <Card key={method.id} className={method.isDefault ? 'border-green-300 bg-green-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getMethodTypeIcon(method.type)}
                    <span className="text-2xl">{getCardIcon(method.brand || '')}</span>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">
                        {method.brand ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1) : 'Card'} 
                        ending in {method.last4}
                      </p>
                      {method.isDefault && (
                        <Badge className="bg-green-500 text-white">
                          <Check className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-cultural-text-secondary mt-1">
                      {method.expiryMonth && method.expiryYear && (
                        <span>Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear.toString().slice(-2)}</span>
                      )}
                      <span>Added {new Date(method.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    {method.billingDetails.name && (
                      <p className="text-sm text-cultural-text-secondary mt-1">
                        {method.billingDetails.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!method.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMethod(method.id)}
                    disabled={method.isDefault}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {method.billingDetails.address && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-cultural-text-secondary">Billing Address:</p>
                  <p className="text-sm">
                    {method.billingDetails.address.line1}
                    {method.billingDetails.address.line2 && `, ${method.billingDetails.address.line2}`}
                  </p>
                  <p className="text-sm">
                    {method.billingDetails.address.city}, {method.billingDetails.address.state} {method.billingDetails.address.postal_code}
                  </p>
                  <p className="text-sm">{method.billingDetails.address.country}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {paymentMethods.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-cultural-text-secondary mb-4" />
              <p className="text-cultural-text-secondary mb-4">No payment methods added yet</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Payment Method
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Payment Method Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPaymentMethod} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Card Number</label>
                  <Input
                    placeholder="1234 5678 9012 3456"
                    required
                    disabled={addingMethod}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cardholder Name</label>
                  <Input
                    placeholder="John Doe"
                    required
                    disabled={addingMethod}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Expiry Date</label>
                  <Input
                    placeholder="MM/YY"
                    required
                    disabled={addingMethod}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CVC</label>
                  <Input
                    placeholder="123"
                    required
                    disabled={addingMethod}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Billing Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Address Line 1</label>
                    <Input
                      placeholder="123 Main Street"
                      required
                      disabled={addingMethod}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Address Line 2 (Optional)</label>
                    <Input
                      placeholder="Apartment, suite, etc."
                      disabled={addingMethod}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">City</label>
                    <Input
                      placeholder="San Francisco"
                      required
                      disabled={addingMethod}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State</label>
                    <Input
                      placeholder="CA"
                      required
                      disabled={addingMethod}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Postal Code</label>
                    <Input
                      placeholder="94105"
                      required
                      disabled={addingMethod}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Country</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                      disabled={addingMethod}
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="setDefault"
                  className="rounded"
                  disabled={addingMethod}
                />
                <label htmlFor="setDefault" className="text-sm">
                  Set as default payment method
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  disabled={addingMethod}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addingMethod}>
                  {addingMethod ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    'Add Payment Method'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-cultural-text-secondary">Next Payment</p>
              <p className="font-semibold">
                ${subscription?.nextInvoiceAmount || '0.00'} on {subscription?.nextInvoiceDate ? new Date(subscription.nextInvoiceDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-cultural-text-secondary">Billing Cycle</p>
              <p className="font-semibold capitalize">
                {subscription?.billingCycle?.toLowerCase() || 'Monthly'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Important Billing Information</p>
                <ul className="text-sm text-cultural-text-secondary mt-1 space-y-1">
                  <li>• Payments are processed automatically using your default payment method</li>
                  <li>• You'll receive email notifications before each charge</li>
                  <li>• Failed payments may result in service interruption</li>
                  <li>• You can update your payment methods at any time</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}