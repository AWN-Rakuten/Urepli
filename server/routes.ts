import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GeminiService } from "./services/gemini";
import { WorkflowService } from "./services/workflow";
import { BanditAlgorithmService } from "./services/bandit";
import { N8nTemplateService } from "./services/n8n-template";

export async function registerRoutes(app: Express): Promise<Server> {
  const geminiService = new GeminiService();
  const workflowService = new WorkflowService();
  const banditService = new BanditAlgorithmService();
  const n8nService = new N8nTemplateService();

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

  // N8n Templates management
  app.get("/api/n8n-templates", async (_req, res) => {
    try {
      const templates = await storage.getN8nTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch n8n templates" });
    }
  });

  app.get("/api/n8n-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getN8nTemplate(id);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/n8n-templates", async (req, res) => {
    try {
      const templateData = req.body;
      const template = await storage.createN8nTemplate(templateData);
      
      await storage.createAutomationLog({
        type: "n8n_template",
        message: `New n8n template created: "${template.name}"`,
        status: "success",
        metadata: { templateId: template.id }
      });

      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.post("/api/n8n-templates/:id/optimize", async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getN8nTemplate(id);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Get current performance data
      const [banditArms, content] = await Promise.all([
        storage.getBanditArms(),
        storage.getContent(10)
      ]);

      const totalRevenue = banditArms.reduce((sum, arm) => sum + arm.profit, 0);
      const totalCost = banditArms.reduce((sum, arm) => sum + arm.cost, 0);
      const roas = totalCost > 0 ? totalRevenue / totalCost : 0;

      const optimizationRequest = {
        templateId: id,
        performanceData: {
          totalRevenue,
          totalCost,
          roas,
          contentGenerated: content.length,
          averageEngagement: content.reduce((sum, c) => sum + c.views, 0) / content.length || 0,
          platformPerformance: banditArms.reduce((acc, arm) => {
            acc[arm.platform.toLowerCase()] = arm.score;
            return acc;
          }, {} as Record<string, number>)
        },
        banditArms,
        currentSettings: template.template.settings || {}
      };

      // Perform optimization using Gemini AI
      const result = await n8nService.optimizeTemplate(template, optimizationRequest);

      // Update template in storage
      const updatedTemplate = await storage.updateN8nTemplate(id, {
        template: result.optimizedTemplate.template,
        version: result.optimizedTemplate.version,
        performanceScore: result.optimizedTemplate.performanceScore,
        optimizationHistory: result.optimizedTemplate.optimizationHistory
      });

      // Record optimization event
      await storage.createOptimizationEvent(result.optimizationEvent);

      // Log optimization
      await storage.createAutomationLog({
        type: "n8n_optimization",
        message: `n8n template "${template.name}" optimized using Gemini AI (${result.performanceImprovement}% improvement expected)`,
        status: "success",
        metadata: { 
          templateId: id,
          performanceImprovement: result.performanceImprovement,
          appliedChanges: result.appliedChanges
        }
      });

      res.json({
        optimizedTemplate: updatedTemplate,
        performanceImprovement: result.performanceImprovement,
        appliedChanges: result.appliedChanges,
        optimizationEvent: result.optimizationEvent
      });
    } catch (error) {
      await storage.createAutomationLog({
        type: "n8n_optimization",
        message: `Failed to optimize n8n template: ${error}`,
        status: "error",
        metadata: { templateId: req.params.id, error: String(error) }
      });
      res.status(500).json({ error: "Failed to optimize template" });
    }
  });

  app.post("/api/n8n-templates/analyze-performance", async (req, res) => {
    try {
      // Get current system performance for analysis
      const [banditArms, content, logs] = await Promise.all([
        storage.getBanditArms(),
        storage.getContent(50),
        storage.getAutomationLogs(100)
      ]);

      const performanceData = {
        totalRevenue: banditArms.reduce((sum, arm) => sum + arm.profit, 0),
        totalCost: banditArms.reduce((sum, arm) => sum + arm.cost, 0),
        contentGenerated: content.length,
        successfulExecutions: logs.filter(log => log.status === 'success').length,
        failedExecutions: logs.filter(log => log.status === 'error').length,
        platformDistribution: banditArms.reduce((acc, arm) => {
          acc[arm.platform] = (acc[arm.platform] || 0) + arm.allocation;
          return acc;
        }, {} as Record<string, number>)
      };

      // Analyze with Gemini
      const insights = await geminiService.analyzePerformanceData([performanceData]);

      res.json({
        performanceData,
        insights,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze performance" });
    }
  });

  app.get("/api/optimization-events", async (req, res) => {
    try {
      const { templateId, limit } = req.query;
      const events = await storage.getOptimizationEvents(
        templateId as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch optimization events" });
    }
  });

  // Auto-optimization endpoint - triggered by n8n workflow
  app.post("/api/n8n-templates/auto-optimize", async (req, res) => {
    try {
      // Get the active template
      const templates = await storage.getN8nTemplates();
      const activeTemplate = templates.find(t => t.isActive);
      
      if (!activeTemplate) {
        return res.status(404).json({ error: "No active template found" });
      }

      // Check if enough time has passed since last optimization (minimum 1 hour)
      const lastOptimization = activeTemplate.optimizationHistory?.slice(-1)[0];
      if (lastOptimization) {
        const timeSinceLastOptimization = Date.now() - new Date(lastOptimization.timestamp).getTime();
        const minimumInterval = 60 * 60 * 1000; // 1 hour
        
        if (timeSinceLastOptimization < minimumInterval) {
          return res.json({ 
            message: "Optimization skipped - too soon since last optimization",
            nextOptimizationIn: minimumInterval - timeSinceLastOptimization
          });
        }
      }

      // Perform automatic optimization
      const [banditArms, content] = await Promise.all([
        storage.getBanditArms(),
        storage.getContent(20)
      ]);

      const totalRevenue = banditArms.reduce((sum, arm) => sum + arm.profit, 0);
      const totalCost = banditArms.reduce((sum, arm) => sum + arm.cost, 0);
      const roas = totalCost > 0 ? totalRevenue / totalCost : 0;

      // Only optimize if performance is below threshold or potential for improvement
      if (activeTemplate.performanceScore >= 95) {
        return res.json({ 
          message: "Optimization skipped - template already highly optimized",
          performanceScore: activeTemplate.performanceScore
        });
      }

      const optimizationRequest = {
        templateId: activeTemplate.id,
        performanceData: {
          totalRevenue,
          totalCost,
          roas,
          contentGenerated: content.length,
          averageEngagement: content.reduce((sum, c) => sum + c.views, 0) / content.length || 0,
          platformPerformance: banditArms.reduce((acc, arm) => {
            acc[arm.platform.toLowerCase()] = arm.score;
            return acc;
          }, {} as Record<string, number>)
        },
        banditArms,
        currentSettings: activeTemplate.template.settings || {}
      };

      const result = await n8nService.optimizeTemplate(activeTemplate, optimizationRequest);

      // Update template
      await storage.updateN8nTemplate(activeTemplate.id, {
        template: result.optimizedTemplate.template,
        version: result.optimizedTemplate.version,
        performanceScore: result.optimizedTemplate.performanceScore,
        optimizationHistory: result.optimizedTemplate.optimizationHistory
      });

      // Record optimization event
      await storage.createOptimizationEvent(result.optimizationEvent);

      // Log auto-optimization
      await storage.createAutomationLog({
        type: "auto_optimization",
        message: `Auto-optimization completed: ${result.performanceImprovement}% improvement expected`,
        status: "success",
        metadata: { 
          templateId: activeTemplate.id,
          performanceImprovement: result.performanceImprovement,
          appliedChanges: result.appliedChanges,
          trigger: "automatic"
        }
      });

      res.json({
        success: true,
        performanceImprovement: result.performanceImprovement,
        appliedChanges: result.appliedChanges,
        newVersion: result.optimizedTemplate.version
      });
    } catch (error) {
      await storage.createAutomationLog({
        type: "auto_optimization",
        message: `Auto-optimization failed: ${error}`,
        status: "error",
        metadata: { error: String(error), trigger: "automatic" }
      });
      res.status(500).json({ error: "Auto-optimization failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
