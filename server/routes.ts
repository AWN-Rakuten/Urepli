import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GeminiService } from "./services/gemini";
import { WorkflowService } from "./services/workflow";
import { BanditAlgorithmService } from "./services/bandit";
import { N8nTemplateService } from "./services/n8n-template";
import { ContentAutomationService } from "./services/content-automation-simple";
import { RSSIngestionService } from "./services/rss-ingestion";
import { TTSCacheService } from "./services/tts-cache";
import { OfferRotatorService } from "./services/offer-rotator";
import { ProfitBanditService } from "./services/profit-bandit";
import { ComplianceGuardService } from "./services/compliance-guard";
import { VideoOrchestrator } from "./services/video-orchestrator";
import { AutomationPipeline } from "./services/automation-pipeline";
import { AdSpendManager } from "./services/ad-spend-manager";
import { HumanApprovalWorkflow } from "./services/human-approval-workflow";

export async function registerRoutes(app: Express): Promise<Server> {
  const geminiService = new GeminiService();
  const workflowService = new WorkflowService();
  const banditService = new BanditAlgorithmService(storage);
  const n8nService = new N8nTemplateService();
  const contentAutomation = new ContentAutomationService(storage);
  const rssService = new RSSIngestionService(storage);
  const ttsCache = new TTSCacheService();
  const offerRotator = new OfferRotatorService(storage);
  const profitBandit = new ProfitBanditService(storage);
  const complianceGuard = new ComplianceGuardService(storage);
  const videoOrchestrator = new VideoOrchestrator(storage);
  const automationPipeline = new AutomationPipeline(storage);
  const adSpendManager = new AdSpendManager(storage);
  const approvalWorkflow = new HumanApprovalWorkflow(storage);

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

  // Real RSS-based content automation endpoints
  app.get("/api/rss/streams", async (_req, res) => {
    try {
      const streams = rssService.getAllStreamConfigs();
      res.json(streams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch streams" });
    }
  });

  app.get("/api/rss/content/:streamKey", async (req, res) => {
    try {
      const { streamKey } = req.params;
      const { limit = "5" } = req.query;
      const content = await rssService.fetchStreamContent(streamKey, parseInt(limit as string));
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stream content" });
    }
  });

  app.post("/api/content/generate-script", async (req, res) => {
    try {
      const { item, style, hasAffiliate } = req.body;
      
      const prompt = `記事タイトル: "${item.title}"
URL: ${item.link}
ストリーム: ${item.stream}
アフィリエイト有無: ${hasAffiliate}

上記に基づき、${style}スタイルで25-35秒のTikTok/Instagram用台本JSONを出力してください。

フォーマット:
{
  "hook": "10文字以内のフック",
  "bullets": ["要点1 (12文字以内)", "要点2 (12文字以内)", "要点3 (12文字以内)"],
  "twist": "注意点やツイスト (12文字以内)",
  "cta": "詳細はプロフィールへ",
  "disclosure": "${hasAffiliate ? '#PR #広告' : ''}",
  "source": "出典: ${new URL(item.link).hostname}"
}

日本語で、俯瞰→具体→注意点の流れで作成してください。`;

      const response = await geminiService.generateContent(prompt);
      
      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const script = JSON.parse(jsonMatch[0]);
      res.json(script);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate script" });
    }
  });

  app.post("/api/content/generate-tts", async (req, res) => {
    try {
      const { text, voice = "ja-JP-Wavenet-F" } = req.body;
      const audioPath = await geminiService.generateSpeech({
        text,
        voice,
        audioFormat: 'mp3',
        speed: 1.0,
        pitch: 0
      });
      res.json({ audioPath });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate TTS" });
    }
  });

  app.post("/api/content/auto-generate", async (req, res) => {
    try {
      await contentOrchestrator.runContentGeneration();
      res.json({ message: "Content generation cycle completed" });
    } catch (error) {
      res.status(500).json({ error: "Content generation failed" });
    }
  });

  app.get("/api/content/performance-report", async (req, res) => {
    try {
      const { days = "7" } = req.query;
      const report = await contentAutomation.getPerformanceReport(parseInt(days as string));
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate performance report" });
    }
  });

  app.post("/api/content/update-analytics", async (req, res) => {
    try {
      await contentAutomation.updateAnalytics();
      res.json({ message: "Analytics updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update analytics" });
    }
  });

  // Remove mock workflow execution - replace with real RSS content generation
  app.post("/api/workflows/:id/execute", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if this is a content generation workflow
      if (id === 'jp_content_pipeline') {
        // Trigger real content generation
        await contentAutomation.runContentGeneration();
        
        await storage.createAutomationLog({
          type: "workflow_execution",
          message: `Real content generation workflow executed`,
          status: "success",
          workflowId: id,
          metadata: { trigger: "manual", type: "real_content_generation" }
        });

        res.json({ 
          message: "Real content generation started",
          status: "processing",
          type: "real_automation"
        });
      } else {
        res.status(404).json({ error: "Workflow not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to execute workflow" });
    }
  });

  // Real TTS caching endpoints
  app.post("/api/tts/generate", async (req, res) => {
    try {
      const { text, voice = "ja-JP-Wavenet-F", audioFormat = "mp3", speed = 1.0, pitch = 0 } = req.body;
      const audioPath = await ttsCache.generateSpeech({ text, voice, audioFormat, speed, pitch });
      res.json({ audioPath, cached: true });
    } catch (error) {
      res.status(500).json({ error: "TTS generation failed" });
    }
  });

  app.get("/api/tts/stats", async (_req, res) => {
    try {
      const stats = ttsCache.getCacheStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get TTS stats" });
    }
  });

  app.post("/api/tts/precache", async (_req, res) => {
    try {
      await ttsCache.preCacheCommonPhrases();
      res.json({ message: "Common phrases pre-cached successfully" });
    } catch (error) {
      res.status(500).json({ error: "Pre-caching failed" });
    }
  });

  // Offer rotation and EPC optimization
  app.get("/api/offers/:streamKey", async (req, res) => {
    try {
      const { streamKey } = req.params;
      const quizAnswers = req.query as any;
      const offer = offerRotator.getTopOfferForStream(streamKey, quizAnswers);
      
      if (!offer) {
        return res.status(404).json({ error: "No offers available for stream" });
      }

      res.json(offer);
    } catch (error) {
      res.status(500).json({ error: "Failed to get offer" });
    }
  });

  app.post("/api/offers/:offerId/performance", async (req, res) => {
    try {
      const { offerId } = req.params;
      const { clicks, conversions, revenue, cost } = req.body;
      
      await offerRotator.updateOfferPerformance(offerId, clicks, conversions, revenue, cost);
      res.json({ message: "Offer performance updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update offer performance" });
    }
  });

  app.post("/api/affiliate/postback", async (req, res) => {
    try {
      await offerRotator.handleAffiliatePostback(req.body);
      res.json({ message: "Postback processed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to process postback" });
    }
  });

  app.get("/api/offers/reports/:streamKey", async (req, res) => {
    try {
      const { streamKey } = req.params;
      const report = offerRotator.getStreamPerformanceReport(streamKey);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to get performance report" });
    }
  });

  // Profit-based bandit optimization
  app.get("/api/bandit/profit/arms", async (_req, res) => {
    try {
      const optimalArms = profitBandit.selectOptimalArms(20);
      res.json(optimalArms);
    } catch (error) {
      res.status(500).json({ error: "Failed to get optimal arms" });
    }
  });

  app.post("/api/bandit/profit/update", async (req, res) => {
    try {
      const { armId, revenue, adSpend, clicks = 1, conversions = 0 } = req.body;
      await profitBandit.updateArmProfit(armId, revenue, adSpend, clicks, conversions);
      res.json({ message: "Arm profit updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update arm profit" });
    }
  });

  app.post("/api/bandit/profit/rebalance", async (_req, res) => {
    try {
      await profitBandit.rebalanceAllocations();
      res.json({ message: "Allocations rebalanced based on profit" });
    } catch (error) {
      res.status(500).json({ error: "Failed to rebalance allocations" });
    }
  });

  app.get("/api/bandit/profit/report", async (req, res) => {
    try {
      const { hours = "24" } = req.query;
      const report = profitBandit.getProfitReport(parseInt(hours as string));
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to get profit report" });
    }
  });

  app.post("/api/bandit/profit/prune", async (_req, res) => {
    try {
      await profitBandit.pruneNegativeArms();
      res.json({ message: "Negative arms pruned successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to prune arms" });
    }
  });

  // Compliance Guard
  app.post("/api/compliance/check", async (req, res) => {
    try {
      const content = req.body;
      const result = await complianceGuard.checkCompliance(content);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Compliance check failed" });
    }
  });

  app.post("/api/compliance/fix", async (req, res) => {
    try {
      const content = req.body;
      const fixedContent = await complianceGuard.autoFixContent(content);
      res.json(fixedContent);
    } catch (error) {
      res.status(500).json({ error: "Auto-fix failed" });
    }
  });

  app.post("/api/compliance/regenerate", async (req, res) => {
    try {
      const content = req.body;
      const regeneratedContent = await complianceGuard.regenerateNonCompliantContent(content);
      res.json(regeneratedContent);
    } catch (error) {
      res.status(500).json({ error: "Content regeneration failed" });
    }
  });

  app.get("/api/compliance/stats", async (_req, res) => {
    try {
      const stats = complianceGuard.getComplianceStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get compliance stats" });
    }
  });

  // AM bump trigger automation
  app.post("/api/affiliate/check-bump-eligibility", async (_req, res) => {
    try {
      const eligibleOffers = await offerRotator.checkAMBumpEligibility();
      res.json({ eligibleOffers, count: eligibleOffers.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to check bump eligibility" });
    }
  });

  // Real profit optimization cycle (30-minute windows)
  app.post("/api/profit/cycle", async (_req, res) => {
    try {
      // Add profit window
      await profitBandit.addProfitWindow();
      
      // Rebalance allocations
      await profitBandit.rebalanceAllocations();
      
      // Prune negative performers
      await profitBandit.pruneNegativeArms();
      
      res.json({ message: "Profit optimization cycle completed" });
    } catch (error) {
      res.status(500).json({ error: "Profit cycle failed" });
    }
  });

  // Video Generation endpoints
  app.get("/api/video/providers", async (_req, res) => {
    try {
      const providersInfo = videoOrchestrator.getProviderInfo();
      const costAnalysis = videoOrchestrator.getCostAnalysis();
      
      res.json({
        providers: providersInfo,
        costAnalysis
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch provider information" });
    }
  });

  app.post("/api/video/generate", async (req, res) => {
    try {
      const { prompt, provider, contentId, ...options } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const videoGeneration = await videoOrchestrator.generateVideo({
        prompt,
        provider: provider || 'auto',
        contentId,
        ...options
      });
      
      res.json(videoGeneration);
    } catch (error) {
      console.error('Video generation error:', error);
      res.status(500).json({ 
        error: "Failed to generate video",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/video/generations", async (req, res) => {
    try {
      const provider = req.query.provider as string;
      const generations = provider 
        ? await videoOrchestrator.getGenerationsByProvider(provider as any)
        : await videoOrchestrator.getAllGenerations();
      
      res.json(generations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch video generations" });
    }
  });

  app.get("/api/video/generations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const generation = await videoOrchestrator.getGenerationStatus(id);
      
      res.json(generation);
    } catch (error) {
      res.status(404).json({ 
        error: "Video generation not found",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/video/cost-analysis", async (_req, res) => {
    try {
      const analysis = videoOrchestrator.getCostAnalysis();
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cost analysis" });
    }
  });

  // Full Automation Pipeline endpoints
  app.post("/api/automation/trigger", async (_req, res) => {
    try {
      const taskIds = await automationPipeline.triggerFullAutomation();
      res.json({ 
        success: true, 
        message: `Automation triggered with ${taskIds.length} tasks`,
        taskIds 
      });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to trigger automation",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/automation/emergency-stop", async (req, res) => {
    try {
      const { reason } = req.body;
      await automationPipeline.emergencyStop(reason || "Manual emergency stop");
      res.json({ success: true, message: "Emergency stop activated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to activate emergency stop" });
    }
  });

  app.post("/api/automation/resume", async (_req, res) => {
    try {
      automationPipeline.resumeAutomation();
      res.json({ success: true, message: "Automation resumed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to resume automation" });
    }
  });

  app.get("/api/automation/metrics", async (_req, res) => {
    try {
      const metrics = automationPipeline.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation metrics" });
    }
  });

  app.get("/api/automation/tasks", async (_req, res) => {
    try {
      const tasks = automationPipeline.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation tasks" });
    }
  });

  // Ad Spend Management endpoints
  app.get("/api/ad-spend/budget-status", async (_req, res) => {
    try {
      const status = await adSpendManager.getBudgetStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budget status" });
    }
  });

  app.get("/api/ad-spend/pending-decisions", async (_req, res) => {
    try {
      const decisions = adSpendManager.getPendingDecisions();
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending decisions" });
    }
  });

  app.post("/api/ad-spend/approve/:decisionId", async (req, res) => {
    try {
      const { decisionId } = req.params;
      const { approvedBy } = req.body;
      
      await adSpendManager.approveSpendDecision(decisionId, approvedBy || 'user');
      res.json({ success: true, message: "Spend decision approved" });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to approve spend decision",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/ad-spend/reject/:decisionId", async (req, res) => {
    try {
      const { decisionId } = req.params;
      const { rejectedBy } = req.body;
      
      await adSpendManager.rejectSpendDecision(decisionId, rejectedBy || 'user');
      res.json({ success: true, message: "Spend decision rejected" });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to reject spend decision",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/ad-spend/config", async (req, res) => {
    try {
      const config = req.body;
      adSpendManager.updateConfig(config);
      res.json({ success: true, message: "Ad spend configuration updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  app.get("/api/ad-spend/config", async (_req, res) => {
    try {
      const config = adSpendManager.getConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  // Human Approval Workflow endpoints
  app.get("/api/approvals/pending", async (_req, res) => {
    try {
      const requests = approvalWorkflow.getPendingRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending approvals" });
    }
  });

  app.post("/api/approvals/approve/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const { approvedBy, comments } = req.body;
      
      await approvalWorkflow.approveRequest(requestId, approvedBy || 'user', comments);
      res.json({ success: true, message: "Request approved" });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to approve request",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/approvals/reject/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const { rejectedBy, comments } = req.body;
      
      await approvalWorkflow.rejectRequest(requestId, rejectedBy || 'user', comments);
      res.json({ success: true, message: "Request rejected" });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to reject request",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/approvals/enable-auto", async (_req, res) => {
    try {
      approvalWorkflow.enableAutoApproval();
      res.json({ success: true, message: "Auto-approval enabled" });
    } catch (error) {
      res.status(500).json({ error: "Failed to enable auto-approval" });
    }
  });

  app.post("/api/approvals/disable-auto", async (_req, res) => {
    try {
      approvalWorkflow.disableAutoApproval();
      res.json({ success: true, message: "Auto-approval disabled" });
    } catch (error) {
      res.status(500).json({ error: "Failed to disable auto-approval" });
    }
  });

  app.get("/api/approvals/stats", async (_req, res) => {
    try {
      const stats = approvalWorkflow.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approval stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
