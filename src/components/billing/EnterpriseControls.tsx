'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building2, 
  Shield, 
  Users,
  DollarSign,
  Calendar,
  Settings,
  Award,
  Crown,
  Zap,
  Lock,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface EnterpriseFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  premium: boolean;
}

interface CustomPricing {
  id: string;
  name: string;
  basePrice: number;
  discountPercent: number;
  customCredits: number;
  features: string[];
  validUntil: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED';
}

interface SupportTicket {
  id: string;
  subject: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  lastUpdate: string;
}

interface EnterpriseControlsProps {
  subscription: any;
  isTeamBilling?: boolean;
  onUpdate: () => void;
}

export function EnterpriseControls({ subscription, isTeamBilling, onUpdate }: EnterpriseControlsProps) {
  const [enterpriseFeatures, setEnterpriseFeatures] = useState<EnterpriseFeature[]>([]);
  const [customPricing, setCustomPricing] = useState<CustomPricing[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('features');

  const isEnterpriseEligible = ['TEAM', 'ULTRA'].includes(subscription?.plan) || subscription?.customPrice;

  useEffect(() => {
    if (isEnterpriseEligible) {
      fetchEnterpriseData();
    } else {
      setLoading(false);
    }
  }, [subscription?.id, isEnterpriseEligible]);

  const fetchEnterpriseData = async () => {
    try {
      setLoading(true);
      const url = isTeamBilling 
        ? `/api/billing/enterprise?teamId=${subscription?.teamId}`
        : '/api/billing/enterprise';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch enterprise data');
      const data = await response.json();
      
      setEnterpriseFeatures(data.features || mockFeatures);
      setCustomPricing(data.pricing || mockPricing);
      setSupportTickets(data.tickets || mockTickets);
    } catch (error) {
      console.error('Failed to fetch enterprise data:', error);
      // Mock data for development
      setEnterpriseFeatures(mockFeatures);
      setCustomPricing(mockPricing);
      setSupportTickets(mockTickets);
    } finally {
      setLoading(false);
    }
  };

  const mockFeatures: EnterpriseFeature[] = [
    {
      id: 'sso',
      name: 'Single Sign-On (SSO)',
      description: 'Integrate with your existing identity provider',
      enabled: true,
      premium: true
    },
    {
      id: 'audit_logs',
      name: 'Advanced Audit Logs',
      description: 'Comprehensive activity tracking and compliance',
      enabled: true,
      premium: true
    },
    {
      id: 'priority_support',
      name: 'Priority Support',
      description: '24/7 dedicated support with SLA guarantees',
      enabled: true,
      premium: true
    },
    {
      id: 'custom_models',
      name: 'Custom Model Access',
      description: 'Access to exclusive and custom-trained models',
      enabled: false,
      premium: true
    },
    {
      id: 'api_management',
      name: 'Advanced API Management',
      description: 'Enhanced rate limiting and API key management',
      enabled: true,
      premium: false
    },
    {
      id: 'white_label',
      name: 'White Label Options',
      description: 'Custom branding and white-label solutions',
      enabled: false,
      premium: true
    }
  ];

  const mockPricing: CustomPricing[] = [
    {
      id: 'enterprise_1',
      name: 'Enterprise Plan A',
      basePrice: 500,
      discountPercent: 20,
      customCredits: 50000,
      features: ['SSO', 'Priority Support', 'Custom Models', 'Audit Logs'],
      validUntil: '2024-12-31T23:59:59Z',
      status: 'ACTIVE'
    },
    {
      id: 'volume_discount',
      name: 'Volume Discount',
      basePrice: 300,
      discountPercent: 15,
      customCredits: 25000,
      features: ['Volume Pricing', 'Extended Support'],
      validUntil: '2024-06-30T23:59:59Z',
      status: 'PENDING'
    }
  ];

  const mockTickets: SupportTicket[] = [
    {
      id: 'ticket_1',
      subject: 'SSO Integration Setup',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      createdAt: '2024-01-15T10:00:00Z',
      lastUpdate: '2024-01-16T14:30:00Z'
    },
    {
      id: 'ticket_2',
      subject: 'Custom Model Training Request',
      priority: 'MEDIUM',
      status: 'OPEN',
      createdAt: '2024-01-14T09:15:00Z',
      lastUpdate: '2024-01-14T09:15:00Z'
    },
    {
      id: 'ticket_3',
      subject: 'Billing Inquiry - Volume Discounts',
      priority: 'LOW',
      status: 'RESOLVED',
      createdAt: '2024-01-10T16:20:00Z',
      lastUpdate: '2024-01-12T11:45:00Z'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-600';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-500';
      case 'IN_PROGRESS': return 'bg-yellow-500';
      case 'RESOLVED': return 'bg-green-500';
      case 'CLOSED': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const handleFeatureToggle = async (featureId: string) => {
    try {
      const response = await fetch(`/api/billing/enterprise/features/${featureId}/toggle`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to toggle feature');
      
      setEnterpriseFeatures(features => 
        features.map(feature => 
          feature.id === featureId 
            ? { ...feature, enabled: !feature.enabled }
            : feature
        )
      );
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    }
  };

  const handleContactSales = () => {
    // In a real app, this would open a contact form or redirect to sales
    alert('Redirecting to enterprise sales team...');
  };

  if (!isEnterpriseEligible) {
    return (
      <div className="space-y-6">
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardContent className="p-8 text-center">
            <Crown className="mx-auto h-16 w-16 text-purple-600 mb-4" />
            <h2 className="text-2xl font-bold text-purple-900 mb-2">Enterprise Features</h2>
            <p className="text-purple-700 mb-6">
              Unlock advanced features and customization options with our Enterprise plans
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white border border-purple-200 rounded-lg">
                <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Advanced Security</h3>
                <p className="text-sm text-gray-600">SSO, audit logs, compliance</p>
              </div>
              <div className="p-4 bg-white border border-purple-200 rounded-lg">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Team Management</h3>
                <p className="text-sm text-gray-600">Advanced permissions, bulk operations</p>
              </div>
              <div className="p-4 bg-white border border-purple-200 rounded-lg">
                <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Priority Support</h3>
                <p className="text-sm text-gray-600">24/7 dedicated support, SLA</p>
              </div>
            </div>

            <div className="flex justify-center space-x-3">
              <Button onClick={handleContactSales}>
                <Mail className="h-4 w-4 mr-2" />
                Contact Sales
              </Button>
              <Button variant="outline">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to TEAM
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Building2 className="h-6 w-6" />
            <span>Enterprise Controls</span>
          </h2>
          <p className="text-cultural-text-secondary">
            Advanced features and customization for enterprise customers
          </p>
        </div>
        <Badge className="bg-purple-500 text-white">
          <Crown className="h-3 w-3 mr-1" />
          Enterprise Customer
        </Badge>
      </div>

      {/* Enterprise Status */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Enterprise Features Activated</p>
              <p className="text-sm text-green-700">
                You have access to premium enterprise features and dedicated support.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'features', label: 'Features', icon: Settings },
            { id: 'pricing', label: 'Custom Pricing', icon: DollarSign },
            { id: 'support', label: 'Support', icon: Users }
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

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {enterpriseFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className={`p-4 border rounded-lg ${
                      feature.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {feature.premium && <Crown className="h-4 w-4 text-purple-500" />}
                        <div>
                          <h3 className="font-medium">{feature.name}</h3>
                          <p className="text-sm text-cultural-text-secondary">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {feature.enabled && (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                        <button
                          onClick={() => handleFeatureToggle(feature.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            feature.enabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              feature.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Custom Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Pricing Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customPricing.map((pricing) => (
                  <div key={pricing.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{pricing.name}</h3>
                        <p className="text-sm text-cultural-text-secondary">
                          Valid until {new Date(pricing.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={`${
                        pricing.status === 'ACTIVE' ? 'bg-green-500' :
                        pricing.status === 'PENDING' ? 'bg-yellow-500' : 'bg-gray-500'
                      } text-white`}>
                        {pricing.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-cultural-text-secondary">Base Price</p>
                        <p className="font-semibold">${pricing.basePrice}/month</p>
                      </div>
                      <div>
                        <p className="text-sm text-cultural-text-secondary">Discount</p>
                        <p className="font-semibold text-green-600">{pricing.discountPercent}% off</p>
                      </div>
                      <div>
                        <p className="text-sm text-cultural-text-secondary">Credits</p>
                        <p className="font-semibold">{pricing.customCredits.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-cultural-text-secondary mb-2">Included Features:</p>
                      <div className="flex flex-wrap gap-2">
                        {pricing.features.map((feature, index) => (
                          <Badge key={index} variant="outline">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Need Custom Pricing?</h3>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Our enterprise team can create custom pricing plans tailored to your specific needs and usage patterns.
                </p>
                <Button variant="outline" onClick={handleContactSales}>
                  Request Custom Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Support Tab */}
      {activeTab === 'support' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-semibold text-green-900">Priority Support</h3>
                <p className="text-sm text-green-700">24/7 dedicated support team</p>
              </CardContent>
            </Card>
            
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 text-center">
                <Shield className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-semibold text-blue-900">SLA Guarantee</h3>
                <p className="text-sm text-blue-700">99.9% uptime guarantee</p>
              </CardContent>
            </Card>
            
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4 text-center">
                <Users className="mx-auto h-8 w-8 text-purple-600 mb-2" />
                <h3 className="font-semibold text-purple-900">Dedicated CSM</h3>
                <p className="text-sm text-purple-700">Personal customer success manager</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Support Tickets</CardTitle>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ticket.subject}</p>
                          <p className="text-sm text-cultural-text-secondary">#{ticket.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getPriorityColor(ticket.priority)} text-white`}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(ticket.status)} text-white`}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.lastUpdate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Enterprise Support</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <h3 className="font-medium">Email Support</h3>
                  </div>
                  <p className="text-sm text-cultural-text-secondary mb-3">
                    Get help via email with guaranteed response times
                  </p>
                  <p className="text-sm font-medium">enterprise@example.com</p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <Phone className="h-5 w-5 text-green-500" />
                    <h3 className="font-medium">Phone Support</h3>
                  </div>
                  <p className="text-sm text-cultural-text-secondary mb-3">
                    Direct line to our enterprise support team
                  </p>
                  <p className="text-sm font-medium">+1 (555) 123-4567</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}