import type { Express } from 'express';
import { storage } from '../storage';
import { SocialAccountManager } from '../services/social-account-manager';
import { insertSocialMediaAccountSchema } from '@shared/schema';
import { z } from 'zod';

const accountManager = new SocialAccountManager(storage);

export function registerSocialAccountRoutes(app: Express) {
  
  // Get all social media accounts
  app.get('/api/social-accounts', async (req, res) => {
    try {
      const platform = req.query.platform as string;
      const accounts = await storage.getSocialMediaAccounts(platform);
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
      res.status(500).json({ error: 'Failed to fetch social accounts' });
    }
  });

  // Get active accounts only
  app.get('/api/social-accounts/active', async (req, res) => {
    try {
      const platform = req.query.platform as string;
      const accounts = await storage.getActiveSocialMediaAccounts(platform);
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching active social accounts:', error);
      res.status(500).json({ error: 'Failed to fetch active social accounts' });
    }
  });

  // Get single account by ID
  app.get('/api/social-accounts/:id', async (req, res) => {
    try {
      const account = await storage.getSocialMediaAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json(account);
    } catch (error) {
      console.error('Error fetching social account:', error);
      res.status(500).json({ error: 'Failed to fetch social account' });
    }
  });

  // Create new social media account
  app.post('/api/social-accounts', async (req, res) => {
    try {
      const validatedData = insertSocialMediaAccountSchema.parse(req.body);
      const newAccount = await storage.createSocialMediaAccount(validatedData);
      res.status(201).json(newAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid account data', details: error.errors });
      }
      console.error('Error creating social account:', error);
      res.status(500).json({ error: 'Failed to create social account' });
    }
  });

  // Update social media account
  app.patch('/api/social-accounts/:id', async (req, res) => {
    try {
      const updates = req.body;
      const updatedAccount = await storage.updateSocialMediaAccount(req.params.id, updates);
      res.json(updatedAccount);
    } catch (error) {
      console.error('Error updating social account:', error);
      res.status(500).json({ error: 'Failed to update social account' });
    }
  });

  // Delete social media account
  app.delete('/api/social-accounts/:id', async (req, res) => {
    try {
      const deleted = await storage.deleteSocialMediaAccount(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Error deleting social account:', error);
      res.status(500).json({ error: 'Failed to delete social account' });
    }
  });

  // Get account rotation logs
  app.get('/api/social-accounts/:id/logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getAccountRotationLogs(req.params.id, limit);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching rotation logs:', error);
      res.status(500).json({ error: 'Failed to fetch rotation logs' });
    }
  });

  // Get account health summary
  app.get('/api/social-accounts/health/summary', async (req, res) => {
    try {
      const platform = req.query.platform as string;
      const summary = await accountManager.getAccountHealthSummary(platform);
      res.json(summary);
    } catch (error) {
      console.error('Error fetching account health summary:', error);
      res.status(500).json({ error: 'Failed to fetch account health summary' });
    }
  });

  // Validate all account credentials
  app.post('/api/social-accounts/validate', async (req, res) => {
    try {
      const results = await accountManager.validateAllAccounts();
      res.json(results);
    } catch (error) {
      console.error('Error validating accounts:', error);
      res.status(500).json({ error: 'Failed to validate accounts' });
    }
  });

  // Reset daily counters (typically called by cron)
  app.post('/api/social-accounts/reset-daily-counters', async (req, res) => {
    try {
      await accountManager.resetDailyCounters();
      res.json({ message: 'Daily counters reset successfully' });
    } catch (error) {
      console.error('Error resetting daily counters:', error);
      res.status(500).json({ error: 'Failed to reset daily counters' });
    }
  });

  // Test account posting capability
  app.post('/api/social-accounts/:id/test', async (req, res) => {
    try {
      const account = await storage.getSocialMediaAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // This would integrate with actual posting test
      const testResult = {
        accountId: account.id,
        platform: account.platform,
        status: account.status,
        canPost: account.status === 'active' && account.isActive && account.errorCount < 3,
        lastUsed: account.lastUsed,
        dailyPostCount: account.dailyPostCount,
        maxDailyPosts: account.maxDailyPosts,
        remainingPosts: Math.max(0, account.maxDailyPosts - account.dailyPostCount)
      };

      res.json(testResult);
    } catch (error) {
      console.error('Error testing account:', error);
      res.status(500).json({ error: 'Failed to test account' });
    }
  });

  // Bulk import accounts
  app.post('/api/social-accounts/bulk-import', async (req, res) => {
    try {
      const { accounts } = req.body;
      
      if (!Array.isArray(accounts)) {
        return res.status(400).json({ error: 'Accounts must be an array' });
      }

      const results = [];
      for (const accountData of accounts) {
        try {
          const validatedData = insertSocialMediaAccountSchema.parse(accountData);
          const newAccount = await storage.createSocialMediaAccount(validatedData);
          results.push({ success: true, account: newAccount });
        } catch (error) {
          results.push({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            data: accountData
          });
        }
      }

      res.json({
        total: accounts.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      });
    } catch (error) {
      console.error('Error bulk importing accounts:', error);
      res.status(500).json({ error: 'Failed to bulk import accounts' });
    }
  });
}