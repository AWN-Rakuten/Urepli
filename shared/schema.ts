import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  template: jsonb("template").notNull(),
  status: text("status").notNull().default("idle"),
  lastExecution: timestamp("last_execution"),
  successRate: real("success_rate").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const banditArms = pgTable("bandit_arms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  hookType: text("hook_type").notNull(),
  score: real("score").default(0),
  allocation: real("allocation").default(0),
  profit: real("profit").default(0),
  cost: real("cost").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  platform: text("platform").notNull(),
  status: text("status").notNull().default("pending"),
  views: integer("views").default(0),
  revenue: real("revenue").default(0),
  thumbnailUrl: text("thumbnail_url"),
  videoUrl: text("video_url"),
  armId: varchar("arm_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const automationLogs = pgTable("automation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull(),
  workflowId: varchar("workflow_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiConfigurations = pgTable("api_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  geminiApiKey: text("gemini_api_key"),
  googleCloudCredentials: jsonb("google_cloud_credentials"),
  googleCloudBucket: text("google_cloud_bucket"),
  tiktokAccessToken: text("tiktok_access_token"),
  instagramAccessToken: text("instagram_access_token"),
  mochiApiKey: text("mochi_api_key"),
  lumaApiKey: text("luma_api_key"),
  isConfigured: boolean("is_configured").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const videoGenerations = pgTable("video_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // 'mochi' or 'luma'
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  cost: real("cost").default(0),
  duration: real("duration"), // seconds
  resolution: text("resolution"),
  contentId: varchar("content_id"), // link to content table
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const n8nTemplates = pgTable("n8n_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  template: jsonb("template").notNull(),
  version: integer("version").default(1),
  performanceScore: real("performance_score").default(0),
  isActive: boolean("is_active").default(true),
  optimizationHistory: jsonb("optimization_history").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const optimizationEvents = pgTable("optimization_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull(),
  performanceData: jsonb("performance_data").notNull(),
  geminiAnalysis: jsonb("gemini_analysis").notNull(),
  appliedChanges: jsonb("applied_changes").notNull(),
  performanceImprovement: real("performance_improvement"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
});

export const insertBanditArmSchema = createInsertSchema(banditArms).omit({
  id: true,
  updatedAt: true,
});

export const insertContentSchema = createInsertSchema(content).omit({
  id: true,
  createdAt: true,
});

export const insertAutomationLogSchema = createInsertSchema(automationLogs).omit({
  id: true,
  createdAt: true,
});

export const insertApiConfigurationSchema = createInsertSchema(apiConfigurations).omit({
  id: true,
  updatedAt: true,
});

export const insertN8nTemplateSchema = createInsertSchema(n8nTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOptimizationEventSchema = createInsertSchema(optimizationEvents).omit({
  id: true,
  createdAt: true,
});

export const socialMediaAccounts = pgTable("social_media_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Display name like "Main TikTok", "Backup Instagram"
  platform: text("platform").notNull(), // 'tiktok', 'instagram', 'youtube'
  username: text("username").notNull(),
  accountType: text("account_type").notNull().default("official"), // 'official', 'unofficial'
  
  // Official API credentials
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  businessAccountId: text("business_account_id"),
  advertiserAccountId: text("advertiser_account_id"),
  
  // Unofficial automation data (encrypted cookies/sessions)
  automationData: jsonb("automation_data"), // Cookies, session data, etc.
  
  // Account status and health
  status: text("status").notNull().default("active"), // 'active', 'suspended', 'error', 'rate_limited'
  lastUsed: timestamp("last_used"),
  lastError: text("last_error"),
  errorCount: integer("error_count").default(0),
  
  // Performance metrics
  dailyPostCount: integer("daily_post_count").default(0),
  totalPosts: integer("total_posts").default(0),
  lastPostDate: timestamp("last_post_date"),
  
  // Automation settings
  isActive: boolean("is_active").default(true),
  postingPriority: integer("posting_priority").default(1), // 1-10 priority for account rotation
  maxDailyPosts: integer("max_daily_posts").default(5),
  
  // Metadata
  metadata: jsonb("metadata"), // Additional platform-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accountRotationLogs = pgTable("account_rotation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  contentId: varchar("content_id"),
  platform: text("platform").notNull(),
  action: text("action").notNull(), // 'post_attempt', 'post_success', 'post_failure', 'rate_limit'
  result: text("result").notNull(), // 'success', 'failure', 'skipped'
  errorMessage: text("error_message"),
  rotationReason: text("rotation_reason"), // 'scheduled', 'rate_limited', 'error', 'priority'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVideoGenerationSchema = createInsertSchema(videoGenerations).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertSocialMediaAccountSchema = createInsertSchema(socialMediaAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccountRotationLogSchema = createInsertSchema(accountRotationLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type BanditArm = typeof banditArms.$inferSelect;
export type Content = typeof content.$inferSelect;
export type AutomationLog = typeof automationLogs.$inferSelect;
export type ApiConfiguration = typeof apiConfigurations.$inferSelect;
export type N8nTemplate = typeof n8nTemplates.$inferSelect;
export type OptimizationEvent = typeof optimizationEvents.$inferSelect;
export type VideoGeneration = typeof videoGenerations.$inferSelect;
export type SocialMediaAccount = typeof socialMediaAccounts.$inferSelect;
export type AccountRotationLog = typeof accountRotationLogs.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Affiliate tracking tables
export const affiliatePrograms = pgTable("affiliate_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company").notNull(),
  description: text("description"),
  commissionRate: text("commission_rate").notNull(),
  commissionType: text("commission_type").notNull(),
  category: text("category").notNull(),
  targetAudience: jsonb("target_audience"),
  platform: jsonb("platform"),
  trackingDomain: text("tracking_domain").notNull(),
  apiEndpoint: text("api_endpoint"),
  requiresApproval: boolean("requires_approval").default(false),
  paymentMinimum: integer("payment_minimum").default(0),
  paymentCurrency: text("payment_currency").default('JPY'),
  averageEPC: integer("average_epc").default(0),
  conversionRate: real("conversion_rate").default(0),
  cookieDuration: integer("cookie_duration").default(30),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const affiliateLinks = pgTable("affiliate_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").references(() => affiliatePrograms.id).notNull(),
  originalUrl: text("original_url").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
  shortUrl: text("short_url"),
  campaignName: text("campaign_name"),
  customParameters: jsonb("custom_parameters"),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  revenue: real("revenue").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const affiliateSales = pgTable("affiliate_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkId: varchar("link_id").references(() => affiliateLinks.id).notNull(),
  programId: varchar("program_id").references(() => affiliatePrograms.id).notNull(),
  saleAmount: real("sale_amount").notNull(),
  commission: real("commission").notNull(),
  currency: text("currency").default('JPY'),
  status: text("status").default('pending'),
  customerInfo: jsonb("customer_info"),
  saleDate: timestamp("sale_date").notNull(),
  confirmDate: timestamp("confirm_date"),
  source: text("source").notNull(),
  contentId: varchar("content_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const geminiSeeds = pgTable("gemini_seeds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  seedValue: text("seed_value").notNull(),
  temperature: real("temperature").default(0.7),
  maxTokens: integer("max_tokens").default(1000),
  topP: real("top_p").default(0.9),
  topK: integer("top_k").default(40),
  isActive: boolean("is_active").default(true),
  performanceScore: real("performance_score").default(70),
  useCount: integer("use_count").default(0),
  successRate: real("success_rate").default(0),
  avgResponseTime: real("avg_response_time").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsed: timestamp("last_used"),
  lastOptimized: timestamp("last_optimized"),
});

export const oauthStates = pgTable("oauth_states", {
  state: varchar("state").primaryKey(),
  platform: text("platform").notNull(),
  userId: varchar("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AffiliateProgram = typeof affiliatePrograms.$inferSelect;
export type InsertAffiliateProgram = typeof affiliatePrograms.$inferInsert;
export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type InsertAffiliateLink = typeof affiliateLinks.$inferInsert;
export type AffiliateSale = typeof affiliateSales.$inferSelect;
export type InsertAffiliateSale = typeof affiliateSales.$inferInsert;
export type GeminiSeed = typeof geminiSeeds.$inferSelect;
export type InsertGeminiSeed = typeof geminiSeeds.$inferInsert;
export type OAuthState = typeof oauthStates.$inferSelect;
export type InsertOAuthState = typeof oauthStates.$inferInsert;
