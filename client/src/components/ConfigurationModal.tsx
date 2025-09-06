import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiConfiguration } from "@/types";

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: ApiConfiguration;
  onConfigUpdate: () => void;
}

export default function ConfigurationModal({ 
  isOpen, 
  onClose, 
  currentConfig,
  onConfigUpdate 
}: ConfigurationModalProps) {
  const [formData, setFormData] = useState({
    geminiApiKey: "",
    googleCloudCredentials: "",
    googleCloudBucket: currentConfig?.googleCloudBucket || "",
    tiktokAccessToken: "",
    instagramAccessToken: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const configMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/configuration", data);
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "API configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/configuration"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onConfigUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Configuration failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>API Configuration</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="gemini-key" className="block text-sm font-medium text-foreground mb-2">
              Gemini API Key
            </Label>
            <Input
              id="gemini-key"
              type="password"
              placeholder="Enter your Gemini API key..."
              value={formData.geminiApiKey}
              onChange={(e) => handleInputChange("geminiApiKey", e.target.value)}
              className="w-full"
              data-testid="input-gemini-key"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Required for Japanese content script generation
            </p>
          </div>
          
          <div>
            <Label htmlFor="google-credentials" className="block text-sm font-medium text-foreground mb-2">
              Google Cloud Service Account JSON
            </Label>
            <Textarea
              id="google-credentials"
              placeholder="Paste your service account JSON here..."
              rows={4}
              value={formData.googleCloudCredentials}
              onChange={(e) => handleInputChange("googleCloudCredentials", e.target.value)}
              className="w-full"
              data-testid="input-google-credentials"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Required for TTS and Cloud Storage access
            </p>
          </div>
          
          <div>
            <Label htmlFor="bucket-name" className="block text-sm font-medium text-foreground mb-2">
              Google Cloud Storage Bucket
            </Label>
            <Input
              id="bucket-name"
              type="text"
              placeholder="mnp-videos-storage"
              value={formData.googleCloudBucket}
              onChange={(e) => handleInputChange("googleCloudBucket", e.target.value)}
              className="w-full"
              data-testid="input-bucket-name"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Bucket name for storing generated video content
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tiktok-token" className="block text-sm font-medium text-foreground mb-2">
                TikTok Access Token
              </Label>
              <Input
                id="tiktok-token"
                type="password"
                placeholder="Optional..."
                value={formData.tiktokAccessToken}
                onChange={(e) => handleInputChange("tiktokAccessToken", e.target.value)}
                className="w-full"
                data-testid="input-tiktok-token"
              />
              <p className="text-xs text-muted-foreground mt-1">
                For automated posting (70% allocation)
              </p>
            </div>
            
            <div>
              <Label htmlFor="instagram-token" className="block text-sm font-medium text-foreground mb-2">
                Instagram Access Token
              </Label>
              <Input
                id="instagram-token"
                type="password"
                placeholder="Optional..."
                value={formData.instagramAccessToken}
                onChange={(e) => handleInputChange("instagramAccessToken", e.target.value)}
                className="w-full"
                data-testid="input-instagram-token"
              />
              <p className="text-xs text-muted-foreground mt-1">
                For automated posting (30% allocation)
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={configMutation.isPending}
              data-testid="button-save"
            >
              {configMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
