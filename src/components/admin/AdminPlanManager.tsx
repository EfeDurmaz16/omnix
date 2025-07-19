'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Edit, 
  Save,
  RotateCcw,
  Users,
  CreditCard,
  Zap,
  Shield
} from 'lucide-react';
import { PLAN_LIMITS } from '@/lib/middleware/PlanEnforcer';
import { Plan as UserPlan } from '@prisma/client';

interface PlanConfig {
  plan: UserPlan;
  monthlyCredits: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  allowedModels: string[];
  features: string[];
  price: number;
  isActive: boolean;
  description: string;
}

export function AdminPlanManager() {
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPlanConfigs();
  }, []);

  const loadPlanConfigs = () => {
    // Load from PLAN_LIMITS and extend with additional config
    const configs: PlanConfig[] = Object.entries(PLAN_LIMITS).map(([plan, limits]) => ({
      plan: plan as UserPlan,
      monthlyCredits: limits.monthlyCredits,
      requestsPerMinute: limits.requestsPerMinute,
      requestsPerHour: limits.requestsPerHour,
      requestsPerDay: limits.requestsPerDay,
      allowedModels: limits.allowedModels,
      features: limits.features,
      price: getPlanPrice(plan as UserPlan),
      isActive: true,
      description: getPlanDescription(plan as UserPlan),
    }));
    
    setPlanConfigs(configs);
    setLoading(false);
  };

  const getPlanPrice = (plan: UserPlan): number => {
    switch (plan) {
      case 'FREE': return 0;
      case 'PRO': return 20;
      case 'ULTRA': return 50;
      case 'TEAM': return 100;
      default: return 0;
    }
  };

  const getPlanDescription = (plan: UserPlan): string => {
    switch (plan) {
      case 'FREE': return 'Basic access with limited features';
      case 'PRO': return 'Enhanced features for professionals';
      case 'ULTRA': return 'Advanced features with high limits';
      case 'TEAM': return 'Enterprise features for teams';
      default: return '';
    }
  };

  const savePlanChanges = async (plan: PlanConfig) => {
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      
      if (!response.ok) throw new Error('Failed to update plan');
      
      // Update local state
      setPlanConfigs(prev => 
        prev.map(p => p.plan === plan.plan ? plan : p)
      );
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update plan:', error);
    }
  };

  const resetToDefaults = () => {
    loadPlanConfigs();
    setHasChanges(false);
  };

  const getPlanBadgeColor = (plan: UserPlan) => {
    switch (plan) {
      case 'FREE': return 'bg-gray-500';
      case 'PRO': return 'bg-blue-500';
      case 'ULTRA': return 'bg-purple-500';
      case 'TEAM': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatModelCount = (models: string[]) => {
    if (models.includes('*')) return 'All Models';
    return `${models.length} Models`;
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
          <h2 className="text-2xl font-bold">Plan Management</h2>
          <p className="text-cultural-text-secondary">Configure subscription plans and limits</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          {hasChanges && (
            <Button onClick={() => selectedPlan && savePlanChanges(selectedPlan)}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Plan Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {planConfigs.map((plan) => (
          <Card key={plan.plan} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className={`${getPlanBadgeColor(plan.plan)} text-white`}>
                  {plan.plan}
                </Badge>
                <span className="text-2xl font-bold">
                  ${plan.price}{plan.price > 0 && '/mo'}
                </span>
              </div>
              <p className="text-sm text-cultural-text-secondary">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-cultural-text-secondary" />
                <span className="text-sm">{plan.monthlyCredits.toLocaleString()} credits/month</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-cultural-text-secondary" />
                <span className="text-sm">{plan.requestsPerMinute}/min rate limit</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-cultural-text-secondary" />
                <span className="text-sm">{formatModelCount(plan.allowedModels)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-cultural-text-secondary" />
                <span className="text-sm">{plan.features.length} features</span>
              </div>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Plan Configuration Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Plan Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Credits/Month</TableHead>
                  <TableHead>Rate Limits</TableHead>
                  <TableHead>Models</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planConfigs.map((plan) => (
                  <TableRow key={plan.plan}>
                    <TableCell>
                      <Badge className={`${getPlanBadgeColor(plan.plan)} text-white`}>
                        {plan.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>{plan.monthlyCredits.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{plan.requestsPerMinute}/min</div>
                        <div className="text-cultural-text-secondary">
                          {plan.requestsPerHour}/hr, {plan.requestsPerDay}/day
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatModelCount(plan.allowedModels)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {plan.features.slice(0, 2).join(', ')}
                        {plan.features.length > 2 && ` +${plan.features.length - 2} more`}
                      </div>
                    </TableCell>
                    <TableCell>
                      ${plan.price}{plan.price > 0 && '/mo'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Plan Dialog */}
      {selectedPlan && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure {selectedPlan.plan} Plan</DialogTitle>
              <DialogDescription>
                Adjust limits, features, and pricing for this plan
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monthly Credits</Label>
                  <Input
                    type="number"
                    value={selectedPlan.monthlyCredits}
                    onChange={(e) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        monthlyCredits: parseInt(e.target.value) || 0
                      });
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div>
                  <Label>Price ($/month)</Label>
                  <Input
                    type="number"
                    value={selectedPlan.price}
                    onChange={(e) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        price: parseFloat(e.target.value) || 0
                      });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              {/* Rate Limits */}
              <div>
                <Label className="text-base font-semibold">Rate Limits</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label>Per Minute</Label>
                    <Input
                      type="number"
                      value={selectedPlan.requestsPerMinute}
                      onChange={(e) => {
                        setSelectedPlan({
                          ...selectedPlan,
                          requestsPerMinute: parseInt(e.target.value) || 0
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Per Hour</Label>
                    <Input
                      type="number"
                      value={selectedPlan.requestsPerHour}
                      onChange={(e) => {
                        setSelectedPlan({
                          ...selectedPlan,
                          requestsPerHour: parseInt(e.target.value) || 0
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Per Day</Label>
                    <Input
                      type="number"
                      value={selectedPlan.requestsPerDay}
                      onChange={(e) => {
                        setSelectedPlan({
                          ...selectedPlan,
                          requestsPerDay: parseInt(e.target.value) || 0
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <Textarea
                  value={selectedPlan.description}
                  onChange={(e) => {
                    setSelectedPlan({
                      ...selectedPlan,
                      description: e.target.value
                    });
                    setHasChanges(true);
                  }}
                  placeholder="Plan description..."
                />
              </div>

              {/* Features */}
              <div>
                <Label className="text-base font-semibold">Features</Label>
                <div className="space-y-2 mt-2">
                  {selectedPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Badge variant="outline">{feature}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={selectedPlan.isActive}
                  onCheckedChange={(checked) => {
                    setSelectedPlan({
                      ...selectedPlan,
                      isActive: checked
                    });
                    setHasChanges(true);
                  }}
                />
                <Label>Plan is active</Label>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  savePlanChanges(selectedPlan);
                  setIsEditDialogOpen(false);
                }}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}