import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Workflow, 
  Plus, 
  Upload, 
  Download, 
  Play, 
  Pause, 
  Settings, 
  Edit, 
  Trash2, 
  Copy,
  FileText,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface N8nTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'inactive' | 'draft';
  triggers: string[];
  actions: string[];
  yamlContent: string;
  lastRun?: string;
  nextRun?: string;
  successRate: number;
  createdAt: string;
  updatedAt: string;
}

const N8nTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<N8nTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [yamlFile, setYamlFile] = useState<File | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "content",
    triggers: [""],
    actions: [""],
    yamlContent: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<N8nTemplate[]>({
    queryKey: ["/api/n8n-templates"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return await apiRequest("/api/n8n-templates", "POST", templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/n8n-templates"] });
      setIsCreateDialogOpen(false);
      setNewTemplate({
        name: "",
        description: "",
        category: "content",
        triggers: [""],
        actions: [""],
        yamlContent: ""
      });
      toast({
        title: "Template Created",
        description: "N8N workflow template has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  // Upload YAML mutation
  const uploadYamlMutation = useMutation({
    mutationFn: async (yamlContent: string) => {
      return await apiRequest("/api/n8n-templates/upload", "POST", { yamlContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/n8n-templates"] });
      setIsUploadDialogOpen(false);
      setYamlFile(null);
      toast({
        title: "YAML Uploaded",
        description: "N8N workflow has been imported successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload YAML file",
        variant: "destructive",
      });
    },
  });

  // Toggle template status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/n8n-templates/${id}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/n8n-templates"] });
      toast({
        title: "Status Updated",
        description: "Template status has been updated",
      });
    },
  });

  // Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/n8n-templates/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/n8n-templates"] });
      toast({
        title: "Template Deleted",
        description: "N8N workflow template has been deleted",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.yaml') || file?.name.endsWith('.yml')) {
      setYamlFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid YAML file (.yaml or .yml)",
        variant: "destructive",
      });
    }
  };

  const uploadYamlFile = async () => {
    if (!yamlFile) return;

    const content = await yamlFile.text();
    uploadYamlMutation.mutate(content);
  };

  const downloadTemplate = (template: N8nTemplate) => {
    const blob = new Blob([template.yamlContent], { type: 'application/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4" />;
      case 'inactive': return <AlertCircle className="h-4 w-4" />;
      case 'draft': return <Edit className="h-4 w-4" />;
      default: return null;
    }
  };

  const categories = [
    { value: "content", label: "Content Generation" },
    { value: "social", label: "Social Media" },
    { value: "analytics", label: "Analytics" },
    { value: "automation", label: "General Automation" },
    { value: "integration", label: "API Integration" },
    { value: "notification", label: "Notifications" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
              <Workflow className="h-8 w-8 text-blue-500" />
              N8N Workflow Templates
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Create, manage, and deploy automation workflows for content generation and social media
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2" data-testid="button-upload-yaml">
                  <Upload className="h-4 w-4" />
                  Upload YAML
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload N8N Workflow</DialogTitle>
                  <DialogDescription>
                    Upload a YAML file containing an N8N workflow configuration
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="yaml-file">YAML File</Label>
                    <Input
                      id="yaml-file"
                      type="file"
                      accept=".yaml,.yml"
                      onChange={handleFileUpload}
                      data-testid="input-yaml-file"
                    />
                  </div>
                  {yamlFile && (
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        File: {yamlFile.name} ({(yamlFile.size / 1024).toFixed(2)} KB)
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={uploadYamlFile}
                      disabled={!yamlFile || uploadYamlMutation.isPending}
                      className="flex-1"
                      data-testid="button-upload-confirm"
                    >
                      {uploadYamlMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload
                    </Button>
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" data-testid="button-create-template">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create N8N Workflow Template</DialogTitle>
                  <DialogDescription>
                    Design a new automation workflow for your content pipeline
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., TikTok Content Automation"
                        data-testid="input-template-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-category">Category</Label>
                      <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger data-testid="select-template-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this workflow does..."
                      rows={3}
                      data-testid="textarea-template-description"
                    />
                  </div>

                  <div>
                    <Label>Triggers</Label>
                    <div className="space-y-2">
                      {newTemplate.triggers.map((trigger, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={trigger}
                            onChange={(e) => {
                              const newTriggers = [...newTemplate.triggers];
                              newTriggers[index] = e.target.value;
                              setNewTemplate(prev => ({ ...prev, triggers: newTriggers }));
                            }}
                            placeholder="e.g., Schedule: Every 2 hours"
                            data-testid={`input-trigger-${index}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newTriggers = newTemplate.triggers.filter((_, i) => i !== index);
                              setNewTemplate(prev => ({ ...prev, triggers: newTriggers }));
                            }}
                            data-testid={`button-remove-trigger-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNewTemplate(prev => ({ ...prev, triggers: [...prev.triggers, ""] }))}
                        data-testid="button-add-trigger"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Trigger
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Actions</Label>
                    <div className="space-y-2">
                      {newTemplate.actions.map((action, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={action}
                            onChange={(e) => {
                              const newActions = [...newTemplate.actions];
                              newActions[index] = e.target.value;
                              setNewTemplate(prev => ({ ...prev, actions: newActions }));
                            }}
                            placeholder="e.g., Generate content with Gemini AI"
                            data-testid={`input-action-${index}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newActions = newTemplate.actions.filter((_, i) => i !== index);
                              setNewTemplate(prev => ({ ...prev, actions: newActions }));
                            }}
                            data-testid={`button-remove-action-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNewTemplate(prev => ({ ...prev, actions: [...prev.actions, ""] }))}
                        data-testid="button-add-action"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Action
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="yaml-content">YAML Configuration (Optional)</Label>
                    <Textarea
                      id="yaml-content"
                      value={newTemplate.yamlContent}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, yamlContent: e.target.value }))}
                      placeholder="Paste your N8N workflow YAML here..."
                      rows={8}
                      className="font-mono text-sm"
                      data-testid="textarea-yaml-content"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => createTemplateMutation.mutate(newTemplate)}
                      disabled={!newTemplate.name || createTemplateMutation.isPending}
                      className="flex-1"
                      data-testid="button-create-confirm"
                    >
                      {createTemplateMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Create Template
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="running" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Active Workflows
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {templates.map((template: N8nTemplate) => (
                  <Card key={template.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="mt-1">{template.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(template.status)}>
                            {getStatusIcon(template.status)}
                            <span className="ml-1">{template.status}</span>
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-slate-600 dark:text-slate-300">Category</p>
                          <Badge variant="outline" className="mt-1">
                            {categories.find(c => c.value === template.category)?.label || template.category}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium text-slate-600 dark:text-slate-300">Success Rate</p>
                          <p className="text-lg font-bold text-green-600">{template.successRate}%</p>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium text-slate-600 dark:text-slate-300 text-sm mb-2">Triggers</p>
                        <div className="flex flex-wrap gap-1">
                          {template.triggers.slice(0, 2).map((trigger, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {trigger}
                            </Badge>
                          ))}
                          {template.triggers.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.triggers.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="font-medium text-slate-600 dark:text-slate-300 text-sm mb-2">Actions</p>
                        <div className="flex flex-wrap gap-1">
                          {template.actions.slice(0, 2).map((action, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                          {template.actions.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.actions.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      {template.nextRun && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Clock className="h-4 w-4" />
                          Next run: {new Date(template.nextRun).toLocaleString()}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatusMutation.mutate({ 
                            id: template.id, 
                            status: template.status === 'active' ? 'inactive' : 'active' 
                          })}
                          className="flex-1"
                          data-testid={`button-toggle-${template.id}`}
                        >
                          {template.status === 'active' ? (
                            <Pause className="h-4 w-4 mr-2" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          {template.status === 'active' ? 'Pause' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadTemplate(template)}
                          data-testid={`button-download-${template.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTemplate(template)}
                          data-testid={`button-edit-${template.id}`}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {templates.length === 0 && !isLoading && (
              <Card className="p-12 text-center">
                <Workflow className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  No Templates Found
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Create your first N8N workflow template to get started with automation
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-template">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Active Workflows Tab */}
          <TabsContent value="running" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {templates.filter((t: N8nTemplate) => t.status === 'active').map((template: N8nTemplate) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      {template.name}
                    </CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Last Run</p>
                        <p className="text-sm">
                          {template.lastRun ? new Date(template.lastRun).toLocaleString() : 'Never'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Success Rate</p>
                        <p className="text-lg font-bold text-green-600">{template.successRate}%</p>
                      </div>
                    </div>
                    {template.nextRun && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Clock className="h-4 w-4" />
                        Next run: {new Date(template.nextRun).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">{templates.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Workflows</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {templates.filter((t: N8nTemplate) => t.status === 'active').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Average Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-purple-600">
                    {templates.length > 0 
                      ? Math.round(templates.reduce((acc: number, t: N8nTemplate) => acc + t.successRate, 0) / templates.length)
                      : 0}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default N8nTemplates;