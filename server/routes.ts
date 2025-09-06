import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GeminiService } from "./services/gemini";
import { WorkflowService } from "./services/workflow";
import { BanditAlgorithmService } from "./services/bandit";

export async function registerRoutes(app: Express): Promise<Server> {
  const geminiService = new GeminiService();
  const workflowService = new WorkflowService();
  const banditService = new BanditAlgorithmService();

  // Dashboard data endpoint
  app.get("/api/dashboard", async (_req, res) => {
    try {
      const [workflows, banditArms, content, logs, config] = await Promise.all([
        storage.getWorkflows(),
        storage.getBanditArms(),
        storage.getContent(10),
        storage.getAutomationLogs(20),
        storage.getApiConfiguration()
      ]);

      // Calculate metrics
      const totalRevenue = banditArms.reduce((sum, arm) => sum + arm.profit, 0);
      const totalCost = banditArms.reduce((sum, arm) => sum + arm.cost, 0);
      const roas = totalCost > 0 ? totalRevenue / totalCost : 0;
      const activeWorkflows = workflows.filter(w => w.status === 'running').length;

      const metrics = {
        totalRevenue: Math.round(totalRevenue),
        contentCount: content.length,
        roas: Math.round(roas * 10) / 10,
        activeWorkflows
      };

      res.json({
        metrics,
        workflows,
        banditArms,
        content,
        logs,
        isConfigured: config?.isConfigured || false
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Generate content script
  app.post("/api/content/generate-script", async (req, res) => {
    try {
      const { niche, platform, hookType } = req.body;
      
      if (!niche || !platform || !hookType) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const script = await geminiService.generateJapaneseContent(niche, platform, hookType);
      
      // Log the generation
      await storage.createAutomationLog({
        type: "content_generation",
        message: `Generated script for ${platform}: "${script.title}"`,
        status: "success",
        metadata: { niche, platform, hookType, estimatedEngagement: script.estimatedEngagement }
      });

      res.json(script);
    } catch (error) {
      await storage.createAutomationLog({
        type: "content_generation",
        message: `Failed to generate script: ${error}`,
        status: "error",
        metadata: { error: String(error) }
      });
      res.status(500).json({ error: "Failed to generate content script" });
    }
  });

  // Create new content
  app.post("/api/content/create", async (req, res) => {
    try {
      const { title, platform, armId, script } = req.body;
      
      // Simulate video creation process
      const content = await storage.createContent({
        title,
        platform,
        status: "processing",
        views: 0,
        revenue: 0,
        thumbnailUrl: null,
        videoUrl: null,
        armId
      });

      // Log content creation
      await storage.createAutomationLog({
        type: "content_creation",
        message: `Creating content: "${title}" for ${platform}`,
        status: "in_progress",
        metadata: { contentId: content.id, platform }
      });

      // Simulate processing delay
      setTimeout(async () => {
        await storage.updateContent(content.id, {
          status: "published",
          views: Math.floor(Math.random() * 20000) + 1000,
          revenue: Math.floor(Math.random() * 5000) + 500,
          videoUrl: `https://storage.googleapis.com/videos/${content.id}.mp4`
        });

        await storage.createAutomationLog({
          type: "content_creation",
          message: `Content published successfully: "${title}"`,
          status: "success",
          metadata: { contentId: content.id, platform }
        });
      }, 5000);

      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to create content" });
    }
  });

  // Workflow management
  app.get("/api/workflows", async (_req, res) => {
    try {
      const workflows = await storage.getWorkflows();
      res.json(workflows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.post("/api/workflows", async (req, res) => {
    try {
      const { name, template } = req.body;
      
      const workflow = await storage.createWorkflow({
        name,
        template,
        status: "idle",
        lastExecution: null,
        successRate: 0
      });

      res.json(workflow);
    } catch (error) {
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  app.post("/api/workflows/:id/execute", async (req, res) => {
    try {
      const { id } = req.params;
      const workflow = await storage.getWorkflow(id);
      
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      // Update status to running
      await storage.updateWorkflow(id, { status: "running", lastExecution: new Date() });

      // Execute workflow
      const result = await workflowService.executeWorkflow(workflow.template);

      // Update status based on result
      const newStatus = result.success ? "idle" : "error";
      await storage.updateWorkflow(id, { status: newStatus });

      // Log execution
      await storage.createAutomationLog({
        type: "workflow_execution",
        message: `Workflow "${workflow.name}" ${result.success ? 'completed successfully' : 'failed'}`,
        status: result.success ? "success" : "error",
        workflowId: id,
        metadata: { executionId: result.executionId, logs: result.logs }
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to execute workflow" });
    }
  });

  // Bandit algorithm management
  app.get("/api/bandit/arms", async (_req, res) => {
    try {
      const arms = await storage.getBanditArms();
      res.json(arms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bandit arms" });
    }
  });

  app.post("/api/bandit/optimize", async (req, res) => {
    try {
      const { profitUpdates } = req.body;
      
      const currentArms = await storage.getBanditArms();
      const updatedArms = banditService.updateArmsWithProfitData(currentArms, profitUpdates || []);
      
      // Calculate new allocations
      const allocations = banditService.calculateThompsonSampling(updatedArms);
      
      // Update arms with new allocations
      for (const allocation of allocations) {
        await storage.updateBanditArm(allocation.armId, {
          allocation: allocation.allocation
        });
      }

      // Log optimization
      await storage.createAutomationLog({
        type: "bandit_optimization",
        message: `Bandit algorithm updated allocations based on performance data`,
        status: "success",
        metadata: { allocations }
      });

      res.json({ allocations, updatedArms });
    } catch (error) {
      res.status(500).json({ error: "Failed to optimize bandit allocations" });
    }
  });

  app.post("/api/bandit/arms", async (req, res) => {
    try {
      const armData = req.body;
      const arm = await storage.createBanditArm(armData);
      res.json(arm);
    } catch (error) {
      res.status(500).json({ error: "Failed to create bandit arm" });
    }
  });

  // Configuration management
  app.get("/api/configuration", async (_req, res) => {
    try {
      const config = await storage.getApiConfiguration();
      
      // Return configuration without sensitive data
      const safeConfig = config ? {
        id: config.id,
        hasGeminiKey: !!config.geminiApiKey,
        hasGoogleCredentials: !!config.googleCloudCredentials,
        googleCloudBucket: config.googleCloudBucket,
        hasTiktokToken: !!config.tiktokAccessToken,
        hasInstagramToken: !!config.instagramAccessToken,
        isConfigured: config.isConfigured,
        updatedAt: config.updatedAt
      } : null;

      res.json(safeConfig);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  app.post("/api/configuration", async (req, res) => {
    try {
      const {
        geminiApiKey,
        googleCloudCredentials,
        googleCloudBucket,
        tiktokAccessToken,
        instagramAccessToken
      } = req.body;

      // Validate Gemini API key
      if (geminiApiKey) {
        try {
          const testService = new GeminiService();
          // Test API key with a simple request
          await testService.analyzePerformanceData([{ test: "validation" }]);
        } catch (error) {
          return res.status(400).json({ error: "Invalid Gemini API key" });
        }
      }

      // Validate Google Cloud credentials
      if (googleCloudCredentials) {
        try {
          JSON.parse(googleCloudCredentials);
        } catch (error) {
          return res.status(400).json({ error: "Invalid Google Cloud credentials JSON" });
        }
      }

      const isConfigured = !!(geminiApiKey && googleCloudCredentials && googleCloudBucket);

      const config = await storage.updateApiConfiguration({
        geminiApiKey,
        googleCloudCredentials: googleCloudCredentials ? JSON.parse(googleCloudCredentials) : null,
        googleCloudBucket,
        tiktokAccessToken,
        instagramAccessToken,
        isConfigured
      });

      await storage.createAutomationLog({
        type: "configuration",
        message: `API configuration updated. Services configured: ${isConfigured ? 'All required' : 'Partial'}`,
        status: "success",
        metadata: { 
          hasGemini: !!geminiApiKey,
          hasGoogleCloud: !!googleCloudCredentials,
          hasTikTok: !!tiktokAccessToken,
          hasInstagram: !!instagramAccessToken
        }
      });

      res.json({ success: true, isConfigured });
    } catch (error) {
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  // Workflow optimization endpoint
  app.post("/api/workflows/:id/optimize", async (req, res) => {
    try {
      const { id } = req.params;
      const workflow = await storage.getWorkflow(id);
      
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      // Get performance metrics
      const banditArms = await storage.getBanditArms();
      const performanceMetrics = banditArms.reduce((acc, arm) => {
        acc[arm.hookType] = arm.score;
        return acc;
      }, {} as Record<string, number>);

      const currentProfit = banditArms.reduce((sum, arm) => sum + arm.profit, 0);

      // Get optimization suggestions from Gemini
      const optimization = await geminiService.optimizeWorkflow(
        workflow.template,
        performanceMetrics,
        currentProfit
      );

      // Apply optimizations to workflow template
      const optimizedTemplate = workflowService.optimizeWorkflowParameters(
        workflow.template,
        optimization
      );

      // Update workflow with optimized template
      const updatedWorkflow = await storage.updateWorkflow(id, {
        template: optimizedTemplate
      });

      await storage.createAutomationLog({
        type: "workflow_optimization",
        message: `Workflow "${workflow.name}" optimized using Gemini AI`,
        status: "success",
        workflowId: id,
        metadata: { 
          optimizations: optimization.optimizations,
          expectedImprovement: optimization.expectedImprovement
        }
      });

      res.json({
        optimization,
        updatedWorkflow,
        optimizedTemplate
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to optimize workflow" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
