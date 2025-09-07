import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertSocialMediaAccountSchema } from '@shared/schema';
import { z } from 'zod';
import { 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  Eye,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const formSchema = insertSocialMediaAccountSchema.extend({
  automationDataString: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

export default function AccountManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['/api/social-accounts', selectedPlatform !== 'all' ? selectedPlatform : undefined],
    queryFn: () => apiRequest(`/api/social-accounts${selectedPlatform !== 'all' ? `?platform=${selectedPlatform}` : ''}`, 'GET')
  });

  const { data: healthSummary } = useQuery({
    queryKey: ['/api/social-accounts/health/summary', selectedPlatform !== 'all' ? selectedPlatform : undefined],
    queryFn: () => apiRequest(`/api/social-accounts/health/summary${selectedPlatform !== 'all' ? `?platform=${selectedPlatform}` : ''}`, 'GET')
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { automationDataString, ...accountData } = data;
      const payload = {
        ...accountData,
        automationData: automationDataString ? JSON.parse(automationDataString) : null
      };
      return apiRequest('/api/social-accounts', 'POST', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts/health/summary'] });
      setIsAddDialogOpen(false);
      toast({ title: 'Account created successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create account', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<FormData>) => {
      const { automationDataString, ...accountData } = data;
      const payload = {
        ...accountData,
        ...(automationDataString !== undefined && {
          automationData: automationDataString ? JSON.parse(automationDataString) : null
        })
      };
      return apiRequest(`/api/social-accounts/${id}`, 'PATCH', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts/health/summary'] });
      setEditingAccount(null);
      toast({ title: 'Account updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update account', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/social-accounts/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts/health/summary'] });
      toast({ title: 'Account deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete account', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const validateAccountsMutation = useMutation({
    mutationFn: () => apiRequest('/api/social-accounts/validate', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts'] });
      toast({ title: 'Account validation completed' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to validate accounts', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const testAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      return apiRequest(`/api/social-accounts/${accountId}/test`, 'POST');
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Account test completed', 
        description: (data as any)?.canPost ? 'Account is ready for posting' : 'Account cannot post right now'
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to test account', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const getStatusBadge = (status: string, errorCount: number) => {
    switch (status) {
      case 'active':
        return errorCount > 0 ? 
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Warning
          </Badge> :
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>;
      case 'error':
        return <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>;
      case 'rate_limited':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
          <Clock className="w-3 h-3 mr-1" />
          Rate Limited
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const AccountForm = ({ account, onSubmit, isLoading }: { 
    account?: any; 
    onSubmit: (data: FormData) => void; 
    isLoading: boolean;
  }) => {
    const form = useForm<FormData>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        name: account?.name || '',
        platform: account?.platform || 'tiktok',
        username: account?.username || '',
        accountType: account?.accountType || 'official',
        accessToken: account?.accessToken || '',
        refreshToken: account?.refreshToken || '',
        businessAccountId: account?.businessAccountId || '',
        advertiserAccountId: account?.advertiserAccountId || '',
        automationDataString: account?.automationData ? JSON.stringify(account.automationData, null, 2) : '',
        isActive: account?.isActive ?? true,
        postingPriority: account?.postingPriority || 1,
        maxDailyPosts: account?.maxDailyPosts || 5
      }
    });

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="account-form">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Main TikTok Account" data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-platform">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="@username" data-testid="input-username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-account-type">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="official">Official API</SelectItem>
                      <SelectItem value="unofficial">Browser Automation</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {form.watch('accountType') === 'official' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Official API Credentials</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} type="password" data-testid="input-access-token" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="refreshToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refresh Token</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} type="password" data-testid="input-refresh-token" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Account ID</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-business-id" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="advertiserAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Advertiser Account ID</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-advertiser-id" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {form.watch('accountType') === 'unofficial' && (
            <div className="space-y-4 p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-900">Browser Automation Data</h4>
              <FormField
                control={form.control}
                name="automationDataString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Data (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        rows={6} 
                        placeholder='{"cookies": [...], "sessionData": {...}}'
                        data-testid="textarea-automation-data" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <FormField
              control={form.control}
              name="postingPriority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority (1-10)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      min={1} 
                      max={10} 
                      value={field.value || ''}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                      data-testid="input-priority"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxDailyPosts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Daily Posts</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      min={1} 
                      max={50}
                      value={field.value || ''}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                      data-testid="input-max-posts"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                  </div>
                  <FormControl>
                    <Switch 
                      checked={field.value || false} 
                      onCheckedChange={field.onChange}
                      data-testid="switch-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false);
                setEditingAccount(null);
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              data-testid="button-save"
            >
              {isLoading ? 'Saving...' : account ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Social Media Accounts</h1>
          <p className="text-muted-foreground">
            Manage multiple accounts for content distribution and risk management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform} data-testid="select-platform-filter">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => validateAccountsMutation.mutate()}
            disabled={validateAccountsMutation.isPending}
            data-testid="button-validate-all"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${validateAccountsMutation.isPending ? 'animate-spin' : ''}`} />
            Validate All
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-account">
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
              </DialogHeader>
              <AccountForm 
                onSubmit={(data) => createAccountMutation.mutate(data)}
                isLoading={createAccountMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Health Summary Cards */}
      {healthSummary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold" data-testid="stat-total">{(healthSummary as any)?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-active">{(healthSummary as any)?.active || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="stat-suspended">{(healthSummary as any)?.suspended || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Rate Limited</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="stat-rate-limited">{(healthSummary as any)?.rateLimited || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">High Errors</p>
                  <p className="text-2xl font-bold text-yellow-600" data-testid="stat-high-errors">{(healthSummary as any)?.highError || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Recent Activity</p>
                  <p className="text-2xl font-bold text-purple-600" data-testid="stat-recent-activity">{(healthSummary as any)?.recentActivity || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accounts Grid */}
      <div className="grid gap-4">
        {(accounts as any[])?.map((account: any) => (
          <Card key={account.id} data-testid={`account-card-${account.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="outline">{account.platform}</Badge>
                      <span>@{account.username}</span>
                      <Badge variant={account.accountType === 'official' ? 'default' : 'secondary'}>
                        {account.accountType}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(account.status, account.errorCount || 0)}
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => testAccountMutation.mutate(account.id)}
                      disabled={testAccountMutation.isPending}
                      data-testid={`button-test-${account.id}`}
                    >
                      <TestTube className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingAccount(account)}
                      data-testid={`button-edit-${account.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteAccountMutation.mutate(account.id)}
                      disabled={deleteAccountMutation.isPending}
                      data-testid={`button-delete-${account.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <p className="font-medium">{account.postingPriority || 1}/10</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Daily Posts</p>
                  <p className="font-medium">{account.dailyPostCount || 0}/{account.maxDailyPosts || 5}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Posts</p>
                  <p className="font-medium">{account.totalPosts || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Used</p>
                  <p className="font-medium">
                    {account.lastUsed 
                      ? new Date(account.lastUsed).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
              {account.lastError && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <strong>Last Error:</strong> {account.lastError}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Account: {editingAccount?.name}</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <AccountForm 
              account={editingAccount}
              onSubmit={(data) => updateAccountMutation.mutate({ id: editingAccount.id, ...data })}
              isLoading={updateAccountMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {(!accounts || (accounts as any[])?.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No accounts configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first social media account to start automated content distribution
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-account">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}