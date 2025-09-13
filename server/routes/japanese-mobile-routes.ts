import { Router } from 'express';
import { JapaneseMobileAppGenerator } from '../services/japanese-mobile-app-generator';
import { MobileJapanOptimizer } from '../services/mobile-japan-optimizer';
import { JapaneseComplianceAutomation } from '../services/japanese-compliance-automation';

const router = Router();
const mobileAppGenerator = new JapaneseMobileAppGenerator();
const mobileOptimizer = new MobileJapanOptimizer();
const complianceAutomation = new JapaneseComplianceAutomation();

// Get app specifications
router.get('/specs', async (req, res) => {
  try {
    const specs = await mobileAppGenerator.getAppSpecifications();
    res.json(specs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch app specifications' });
  }
});

// Create new app specification
router.post('/specs', async (req, res) => {
  try {
    const specData = req.body;
    const spec = await mobileAppGenerator.createAppSpecification(specData);
    res.json(spec);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create app specification' });
  }
});

// Get Japanese market insights
router.get('/market-insights', async (req, res) => {
  try {
    const insights = await mobileAppGenerator.getJapaneseMarketInsights();
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market insights' });
  }
});

// Generate comprehensive development plan
router.post('/generate-plan', async (req, res) => {
  try {
    const { specId, context } = req.body;
    const plan = await mobileAppGenerator.generateComprehensivePlan(specId, context);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate development plan' });
  }
});

// Get Japanese payment methods
router.get('/payment-methods', async (req, res) => {
  try {
    const paymentMethods = await mobileOptimizer.integrateJapaneseMobilePayments();
    res.json(paymentMethods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Generate localized UI components
router.post('/generate-ui', async (req, res) => {
  try {
    const { platform, components, localizationLevel } = req.body;
    const ui = await mobileAppGenerator.generateLocalizedUI(platform, components, localizationLevel);
    res.json(ui);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate localized UI' });
  }
});

// Compliance check for Japanese market
router.post('/compliance-check', async (req, res) => {
  try {
    const { appData, contentType } = req.body;
    const complianceResult = await complianceAutomation.checkAppCompliance(appData, contentType);
    res.json(complianceResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform compliance check' });
  }
});

// Generate monetization strategy
router.post('/monetization-strategy', async (req, res) => {
  try {
    const { appCategory, targetAudience, budget } = req.body;
    const strategy = await mobileAppGenerator.generateMonetizationStrategy(
      appCategory,
      targetAudience,
      budget
    );
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate monetization strategy' });
  }
});

// Create viral growth campaign
router.post('/viral-campaign', async (req, res) => {
  try {
    const { appId, campaignType, platforms } = req.body;
    const campaign = await mobileAppGenerator.createViralGrowthCampaign(
      appId,
      campaignType,
      platforms
    );
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create viral campaign' });
  }
});

// Generate app store optimization
router.post('/aso-optimization', async (req, res) => {
  try {
    const { appId, targetKeywords, competitors } = req.body;
    const asoStrategy = await mobileAppGenerator.generateASOStrategy(
      appId,
      targetKeywords,
      competitors
    );
    res.json(asoStrategy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate ASO strategy' });
  }
});

// Get AI role insights
router.get('/ai-roles/:roleType/insights', async (req, res) => {
  try {
    const { roleType } = req.params;
    const { appId, context } = req.query;
    const insights = await mobileAppGenerator.getAIRoleInsights(
      roleType,
      appId as string,
      context as string
    );
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AI role insights' });
  }
});

// Generate n8n workflows for Japanese automation
router.post('/n8n-workflows', async (req, res) => {
  try {
    const { appId, automationTypes } = req.body;
    const workflows = await mobileAppGenerator.generateN8nWorkflows(appId, automationTypes);
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate n8n workflows' });
  }
});

// Create site factory for app
router.post('/site-factory', async (req, res) => {
  try {
    const { appId, siteConfig } = req.body;
    const siteFactory = await mobileAppGenerator.createSiteFactory(appId, siteConfig);
    res.json(siteFactory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create site factory' });
  }
});

// Get real-time KPI dashboard data
router.get('/kpi-dashboard', async (req, res) => {
  try {
    const { appId, timeRange } = req.query;
    const kpiData = await mobileAppGenerator.getKPIDashboard(
      appId as string,
      timeRange as string
    );
    res.json(kpiData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KPI dashboard data' });
  }
});

export default router;