import { 
  type User, 
  type InsertUser, 
  type Workflow, 
  type BanditArm, 
  type Content, 
  type AutomationLog, 
  type ApiConfiguration,
  type N8nTemplate,
  type OptimizationEvent
} from "@shared/schema";
import { randomUUID } from "crypto";

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

  constructor() {
    this.users = new Map();
    this.workflows = new Map();
    this.banditArms = new Map();
    this.content = new Map();
    this.automationLogs = new Map();
    this.n8nTemplates = new Map();
    this.optimizationEvents = new Map();
    
    // Initialize default data
    this.initializeDefaultBanditArms();
    this.initializeDefaultN8nTemplates();
  }

  private initializeDefaultBanditArms() {
    const defaultArms = [
      {
        id: randomUUID(),
        name: "Kawaii Hook B",
        platform: "TikTok",
        hookType: "kawaii_hook_b",
        score: 73.2,
        allocation: 45,
        profit: 15340,
        cost: 8000,
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "NHK Hook A", 
        platform: "Instagram",
        hookType: "nhk_hook_a",
        score: 68.7,
        allocation: 25,
        profit: 8200,
        cost: 3200,
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Tech Hook C",
        platform: "TikTok",
        hookType: "tech_hook_c", 
        score: 54.1,
        allocation: 15,
        profit: 3890,
        cost: 2100,
        updatedAt: new Date(),
      }
    ];

    defaultArms.forEach(arm => this.banditArms.set(arm.id, arm));
  }

  private initializeDefaultN8nTemplates() {
    const defaultTemplate: N8nTemplate = {
      id: randomUUID(),
      name: "JP Content Pipeline v2.0",
      description: "Advanced Japanese content automation with Gemini optimization and returns-first allocation",
      template: {
        id: "jp_content_pipeline_v2",
        name: "JP Content Pipeline v2.0",
        nodes: [
          {
            id: "schedule_trigger",
            name: "Schedule Trigger",
            type: "n8n-nodes-base.cron",
            position: [0, 0],
            parameters: {
              rule: { interval: [{ field: "hours", value: 2 }] }
            }
          },
          {
            id: "gemini_script_generation",
            name: "Gemini Script Generation",
            type: "n8n-nodes-base.httpRequest",
            position: [200, 0],
            parameters: {
              url: "/api/content/generate-script",
              method: "POST",
              sendBody: true,
              bodyParameters: {
                niche: "investment_tips",
                platform: "TikTok",
                hookType: "kawaii_hook_b"
              }
            }
          },
          {
            id: "google_tts",
            name: "Google Cloud TTS",
            type: "n8n-nodes-base.googleCloudTts",
            position: [400, 0],
            parameters: {
              voice: "ja-JP-Wavenet-F",
              audioFormat: "mp3",
              speed: 1.0,
              pitch: 0
            }
          },
          {
            id: "video_assembly",
            name: "Video Assembly",
            type: "n8n-nodes-base.httpRequest",
            position: [600, 0],
            parameters: {
              url: "/api/content/assemble-video",
              method: "POST"
            }
          },
          {
            id: "bandit_optimization",
            name: "Bandit Optimization",
            type: "n8n-nodes-base.httpRequest",
            position: [800, 0],
            parameters: {
              url: "/api/bandit/optimize",
              method: "POST"
            }
          }
        ],
        connections: {
          "schedule_trigger": {
            "main": [[{ node: "gemini_script_generation", type: "main", index: 0 }]]
          },
          "gemini_script_generation": {
            "main": [[{ node: "google_tts", type: "main", index: 0 }]]
          },
          "google_tts": {
            "main": [[{ node: "video_assembly", type: "main", index: 0 }]]
          },
          "video_assembly": {
            "main": [[{ node: "bandit_optimization", type: "main", index: 0 }]]
          }
        },
        settings: {
          timezone: "Asia/Tokyo",
          executionTimeout: 3600
        }
      },
      version: 1,
      performanceScore: 85.2,
      isActive: true,
      optimizationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.n8nTemplates.set(defaultTemplate.id, defaultTemplate);
  }

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
}

export const storage = new MemStorage();
