import { 
  type User, 
  type InsertUser, 
  type Workflow, 
  type BanditArm, 
  type Content, 
  type AutomationLog, 
  type ApiConfiguration,
  type N8nTemplate,
  type OptimizationEvent,
  type VideoGeneration,
  type SocialMediaAccount,
  type AccountRotationLog,
  insertVideoGenerationSchema,
  insertSocialMediaAccountSchema,
  insertAccountRotationLogSchema
} from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { BrowserSession } from "./services/browser-automation";
import type { OAuthState } from "./services/oauth-manager";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Workflows
  getWorkflows(): Promise<Workflow[]>;
  getWorkflow(id: string): Promise<Workflow | undefined>;
  createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt'>): Promise<Workflow>;
  updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined>;
  
  // Bandit Arms
  getBanditArms(): Promise<BanditArm[]>;
  getBanditArm(id: string): Promise<BanditArm | undefined>;
  createBanditArm(arm: Omit<BanditArm, 'id' | 'updatedAt'>): Promise<BanditArm>;
  updateBanditArm(id: string, updates: Partial<BanditArm>): Promise<BanditArm | undefined>;
  
  // Content
  getContent(limit?: number): Promise<Content[]>;
  getContentItem(id: string): Promise<Content | undefined>;
  createContent(content: Omit<Content, 'id' | 'createdAt'>): Promise<Content>;
  updateContent(id: string, updates: Partial<Content>): Promise<Content | undefined>;
  
  // Automation Logs
  getAutomationLogs(limit?: number): Promise<AutomationLog[]>;
  createAutomationLog(log: Omit<AutomationLog, 'id' | 'createdAt'>): Promise<AutomationLog>;
  
  // API Configuration
  getApiConfiguration(): Promise<ApiConfiguration | undefined>;
  updateApiConfiguration(config: Partial<ApiConfiguration>): Promise<ApiConfiguration>;
  
  // N8n Templates
  getN8nTemplates(): Promise<N8nTemplate[]>;
  getN8nTemplate(id: string): Promise<N8nTemplate | undefined>;
  createN8nTemplate(template: Omit<N8nTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<N8nTemplate>;
  updateN8nTemplate(id: string, updates: Partial<N8nTemplate>): Promise<N8nTemplate | undefined>;
  
  // Optimization Events
  getOptimizationEvents(templateId?: string, limit?: number): Promise<OptimizationEvent[]>;
  createOptimizationEvent(event: Omit<OptimizationEvent, 'id' | 'createdAt'>): Promise<OptimizationEvent>;
  
  // Video Generations
  getVideoGeneration(id: string): Promise<VideoGeneration | undefined>;
  getAllVideoGenerations(provider?: string): Promise<VideoGeneration[]>;
  createVideoGeneration(generation: z.infer<typeof insertVideoGenerationSchema>): Promise<VideoGeneration>;
  updateVideoGeneration(id: string, updates: Partial<VideoGeneration>): Promise<VideoGeneration>;
  
  // Social Media Accounts
  getSocialMediaAccounts(platform?: string): Promise<SocialMediaAccount[]>;
  getActiveSocialMediaAccounts(platform?: string): Promise<SocialMediaAccount[]>;
  getSocialMediaAccount(id: string): Promise<SocialMediaAccount | undefined>;
  createSocialMediaAccount(account: z.infer<typeof insertSocialMediaAccountSchema>): Promise<SocialMediaAccount>;
  updateSocialMediaAccount(id: string, updates: Partial<SocialMediaAccount>): Promise<SocialMediaAccount>;
  deleteSocialMediaAccount(id: string): Promise<boolean>;
  
  // Account Rotation Logs
  getAccountRotationLogs(accountId?: string, limit?: number): Promise<AccountRotationLog[]>;
  createAccountRotationLog(log: z.infer<typeof insertAccountRotationLogSchema>): Promise<AccountRotationLog>;
  
  // Browser Sessions
  getBrowserSessions(activeOnly?: boolean): Promise<BrowserSession[]>;
  getBrowserSession(id: string): Promise<BrowserSession | undefined>;
  createBrowserSession(session: BrowserSession): Promise<BrowserSession>;
  updateBrowserSession(id: string, updates: Partial<BrowserSession>): Promise<BrowserSession>;
  deleteBrowserSession(id: string): Promise<boolean>;
  
  // OAuth States
  createOAuthState(state: OAuthState): Promise<OAuthState>;
  getOAuthState(state: string): Promise<OAuthState | undefined>;
  deleteOAuthState(state: string): Promise<boolean>;
  
  // Posting Schedule and Counts
  getScheduledPosts(beforeTime: Date): Promise<any[]>;
  createPostingSchedule(schedule: any): Promise<any>;
  updatePostingSchedule(id: string, updates: any): Promise<any>;
  getPostCount(accountId: string, startTime: Date, endTime: Date): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private workflows: Map<string, Workflow>;
  private banditArms: Map<string, BanditArm>;
  private content: Map<string, Content>;
  private automationLogs: Map<string, AutomationLog>;
  private apiConfiguration: ApiConfiguration | undefined;
  private n8nTemplates: Map<string, N8nTemplate>;
  private optimizationEvents: Map<string, OptimizationEvent>;
  private videoGenerations: Map<string, VideoGeneration>;
  private socialMediaAccounts: Map<string, SocialMediaAccount>;
  private accountRotationLogs: Map<string, AccountRotationLog>;
  private browserSessions: Map<string, BrowserSession>;
  private oauthStates: Map<string, OAuthState>;
  private postingSchedules: Map<string, any>;

  constructor() {
    this.users = new Map();
    this.workflows = new Map();
    this.banditArms = new Map();
    this.content = new Map();
    this.automationLogs = new Map();
    this.n8nTemplates = new Map();
    this.optimizationEvents = new Map();
    this.videoGenerations = new Map();
    this.socialMediaAccounts = new Map();
    this.accountRotationLogs = new Map();
    this.browserSessions = new Map();
    this.oauthStates = new Map();
    this.postingSchedules = new Map();
    
    // No default data - everything comes from real operations
  }

  // Removed all default/mock data initializers

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getWorkflows(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    return this.workflows.get(id);
  }

  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt'>): Promise<Workflow> {
    const id = randomUUID();
    const newWorkflow: Workflow = { 
      ...workflow, 
      id, 
      createdAt: new Date() 
    };
    this.workflows.set(id, newWorkflow);
    return newWorkflow;
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;
    
    const updated = { ...workflow, ...updates };
    this.workflows.set(id, updated);
    return updated;
  }

  async getBanditArms(): Promise<BanditArm[]> {
    return Array.from(this.banditArms.values());
  }

  async getBanditArm(id: string): Promise<BanditArm | undefined> {
    return this.banditArms.get(id);
  }

  async createBanditArm(arm: Omit<BanditArm, 'id' | 'updatedAt'>): Promise<BanditArm> {
    const id = randomUUID();
    const newArm: BanditArm = { 
      ...arm, 
      id, 
      updatedAt: new Date() 
    };
    this.banditArms.set(id, newArm);
    return newArm;
  }

  async updateBanditArm(id: string, updates: Partial<BanditArm>): Promise<BanditArm | undefined> {
    const arm = this.banditArms.get(id);
    if (!arm) return undefined;
    
    const updated = { ...arm, ...updates, updatedAt: new Date() };
    this.banditArms.set(id, updated);
    return updated;
  }

  async getContent(limit = 50): Promise<Content[]> {
    const allContent = Array.from(this.content.values());
    return allContent
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async getContentItem(id: string): Promise<Content | undefined> {
    return this.content.get(id);
  }

  async createContent(content: Omit<Content, 'id' | 'createdAt'>): Promise<Content> {
    const id = randomUUID();
    const newContent: Content = { 
      ...content, 
      id, 
      createdAt: new Date() 
    };
    this.content.set(id, newContent);
    return newContent;
  }

  async updateContent(id: string, updates: Partial<Content>): Promise<Content | undefined> {
    const content = this.content.get(id);
    if (!content) return undefined;
    
    const updated = { ...content, ...updates };
    this.content.set(id, updated);
    return updated;
  }

  async getAutomationLogs(limit = 100): Promise<AutomationLog[]> {
    const allLogs = Array.from(this.automationLogs.values());
    return allLogs
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async createAutomationLog(log: Omit<AutomationLog, 'id' | 'createdAt'>): Promise<AutomationLog> {
    const id = randomUUID();
    const newLog: AutomationLog = { 
      ...log, 
      id, 
      createdAt: new Date() 
    };
    this.automationLogs.set(id, newLog);
    return newLog;
  }

  async getApiConfiguration(): Promise<ApiConfiguration | undefined> {
    return this.apiConfiguration;
  }

  async updateApiConfiguration(config: Partial<ApiConfiguration>): Promise<ApiConfiguration> {
    if (!this.apiConfiguration) {
      this.apiConfiguration = {
        id: randomUUID(),
        geminiApiKey: null,
        googleCloudCredentials: null,
        googleCloudBucket: null,
        tiktokAccessToken: null,
        instagramAccessToken: null,
        mochiApiKey: null,
        lumaApiKey: null,
        isConfigured: false,
        updatedAt: new Date(),
        ...config
      };
    } else {
      this.apiConfiguration = {
        ...this.apiConfiguration,
        ...config,
        updatedAt: new Date()
      };
    }
    return this.apiConfiguration;
  }

  // N8n Templates methods
  async getN8nTemplates(): Promise<N8nTemplate[]> {
    return Array.from(this.n8nTemplates.values());
  }

  async getN8nTemplate(id: string): Promise<N8nTemplate | undefined> {
    return this.n8nTemplates.get(id);
  }

  async createN8nTemplate(template: Omit<N8nTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<N8nTemplate> {
    const id = randomUUID();
    const newTemplate: N8nTemplate = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.n8nTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateN8nTemplate(id: string, updates: Partial<N8nTemplate>): Promise<N8nTemplate | undefined> {
    const template = this.n8nTemplates.get(id);
    if (!template) return undefined;

    const updated = { ...template, ...updates, updatedAt: new Date() };
    this.n8nTemplates.set(id, updated);
    return updated;
  }

  // Optimization Events methods
  async getOptimizationEvents(templateId?: string, limit = 50): Promise<OptimizationEvent[]> {
    const allEvents = Array.from(this.optimizationEvents.values());
    const filteredEvents = templateId 
      ? allEvents.filter(event => event.templateId === templateId)
      : allEvents;
    
    return filteredEvents
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async createOptimizationEvent(event: Omit<OptimizationEvent, 'id' | 'createdAt'>): Promise<OptimizationEvent> {
    const id = randomUUID();
    const newEvent: OptimizationEvent = {
      ...event,
      id,
      createdAt: new Date()
    };
    this.optimizationEvents.set(id, newEvent);
    return newEvent;
  }

  // Video Generation methods
  async getVideoGeneration(id: string): Promise<VideoGeneration | undefined> {
    return this.videoGenerations.get(id);
  }

  async getAllVideoGenerations(provider?: string): Promise<VideoGeneration[]> {
    const allGenerations = Array.from(this.videoGenerations.values());
    const filteredGenerations = provider 
      ? allGenerations.filter(gen => gen.provider === provider)
      : allGenerations;
    
    return filteredGenerations
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createVideoGeneration(generation: z.infer<typeof insertVideoGenerationSchema>): Promise<VideoGeneration> {
    const id = randomUUID();
    const newGeneration: VideoGeneration = {
      ...generation,
      id,
      status: generation.status || 'pending',
      cost: generation.cost || 0,
      metadata: generation.metadata || null,
      createdAt: new Date(),
      completedAt: null
    };
    this.videoGenerations.set(id, newGeneration);
    return newGeneration;
  }

  async updateVideoGeneration(id: string, updates: Partial<VideoGeneration>): Promise<VideoGeneration> {
    const generation = this.videoGenerations.get(id);
    if (!generation) {
      throw new Error(`Video generation not found: ${id}`);
    }
    
    const updated = { ...generation, ...updates };
    this.videoGenerations.set(id, updated);
    return updated;
  }

  // Social Media Accounts methods
  async getSocialMediaAccounts(platform?: string): Promise<SocialMediaAccount[]> {
    const allAccounts = Array.from(this.socialMediaAccounts.values());
    const filteredAccounts = platform 
      ? allAccounts.filter(account => account.platform === platform)
      : allAccounts;
    
    return filteredAccounts
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getActiveSocialMediaAccounts(platform?: string): Promise<SocialMediaAccount[]> {
    const allAccounts = await this.getSocialMediaAccounts(platform);
    return allAccounts.filter(account => 
      account.isActive && 
      account.status === 'active' &&
      (account.errorCount || 0) < 3
    );
  }

  async getSocialMediaAccount(id: string): Promise<SocialMediaAccount | undefined> {
    return this.socialMediaAccounts.get(id);
  }

  async createSocialMediaAccount(accountData: z.infer<typeof insertSocialMediaAccountSchema>): Promise<SocialMediaAccount> {
    const id = randomUUID();
    const newAccount: SocialMediaAccount = {
      ...accountData,
      id,
      accountType: accountData.accountType || 'official',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.socialMediaAccounts.set(id, newAccount);
    return newAccount;
  }

  async updateSocialMediaAccount(id: string, updates: Partial<SocialMediaAccount>): Promise<SocialMediaAccount> {
    const account = this.socialMediaAccounts.get(id);
    if (!account) {
      throw new Error(`Social media account not found: ${id}`);
    }
    
    const updated = { ...account, ...updates, updatedAt: new Date() };
    this.socialMediaAccounts.set(id, updated);
    return updated;
  }

  async deleteSocialMediaAccount(id: string): Promise<boolean> {
    return this.socialMediaAccounts.delete(id);
  }

  // Account Rotation Logs methods
  async getAccountRotationLogs(accountId?: string, limit = 100): Promise<AccountRotationLog[]> {
    const allLogs = Array.from(this.accountRotationLogs.values());
    const filteredLogs = accountId 
      ? allLogs.filter(log => log.accountId === accountId)
      : allLogs;
    
    return filteredLogs
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async createAccountRotationLog(logData: z.infer<typeof insertAccountRotationLogSchema>): Promise<AccountRotationLog> {
    const id = randomUUID();
    const newLog: AccountRotationLog = {
      ...logData,
      id,
      metadata: logData.metadata || null,
      createdAt: new Date()
    };
    this.accountRotationLogs.set(id, newLog);
    return newLog;
  }

  // Browser Sessions methods
  async getBrowserSessions(activeOnly = false): Promise<BrowserSession[]> {
    const allSessions = Array.from(this.browserSessions.values());
    return activeOnly ? allSessions.filter(session => session.isActive) : allSessions;
  }

  async getBrowserSession(id: string): Promise<BrowserSession | undefined> {
    return this.browserSessions.get(id);
  }

  async createBrowserSession(session: BrowserSession): Promise<BrowserSession> {
    this.browserSessions.set(session.id, session);
    return session;
  }

  async updateBrowserSession(id: string, updates: Partial<BrowserSession>): Promise<BrowserSession> {
    const session = this.browserSessions.get(id);
    if (!session) {
      throw new Error(`Browser session not found: ${id}`);
    }
    
    const updated = { ...session, ...updates };
    this.browserSessions.set(id, updated);
    return updated;
  }

  async deleteBrowserSession(id: string): Promise<boolean> {
    return this.browserSessions.delete(id);
  }

  // OAuth States methods
  async createOAuthState(state: OAuthState): Promise<OAuthState> {
    this.oauthStates.set(state.state, state);
    return state;
  }

  async getOAuthState(state: string): Promise<OAuthState | undefined> {
    return this.oauthStates.get(state);
  }

  async deleteOAuthState(state: string): Promise<boolean> {
    return this.oauthStates.delete(state);
  }

  // Posting Schedule methods
  async getScheduledPosts(beforeTime: Date): Promise<any[]> {
    const allSchedules = Array.from(this.postingSchedules.values());
    return allSchedules.filter(schedule => 
      schedule.status === 'scheduled' && 
      new Date(schedule.scheduledTime) <= beforeTime
    );
  }

  async createPostingSchedule(schedule: any): Promise<any> {
    this.postingSchedules.set(schedule.id, schedule);
    return schedule;
  }

  async updatePostingSchedule(id: string, updates: any): Promise<any> {
    const schedule = this.postingSchedules.get(id);
    if (!schedule) {
      throw new Error(`Posting schedule not found: ${id}`);
    }
    
    const updated = { ...schedule, ...updates };
    this.postingSchedules.set(id, updated);
    return updated;
  }

  async getPostCount(accountId: string, startTime: Date, endTime: Date): Promise<number> {
    const allSchedules = Array.from(this.postingSchedules.values());
    return allSchedules.filter(schedule => 
      schedule.accountId === accountId &&
      new Date(schedule.scheduledTime) >= startTime &&
      new Date(schedule.scheduledTime) <= endTime &&
      (schedule.status === 'posted' || schedule.status === 'scheduled')
    ).length;
  }
}

export const storage = new MemStorage();
