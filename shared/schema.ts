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

// Japanese Affiliate Network Tables
export const affiliateNetworks = pgTable("affiliate_networks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 'rakuten', 'yahoo', 'valuecommerce', 'amazon', 'a8net'
  api_keys: jsonb("api_keys"), // Store API credentials
  enabled: boolean("enabled").default(true),
  cvr_proxy: real("cvr_proxy").default(0.03), // Default conversion rate proxy
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  network_id: varchar("network_id").references(() => affiliateNetworks.id).notNull(),
  external_id: text("external_id").notNull(), // Network's product ID
  title: text("title").notNull(),
  price_jpy: integer("price_jpy").notNull(),
  commission_bps: integer("commission_bps"), // Commission in basis points
  affiliate_url: text("affiliate_url").notNull(),
  product_url: text("product_url").notNull(),
  image_url: text("image_url"),
  shop_name: text("shop_name"),
  category: text("category"),
  rating: real("rating"),
  review_count: integer("review_count"),
  source_payload: jsonb("source_payload"), // Raw API response
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const linkVariants = pgTable("link_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  post_id: varchar("post_id").notNull(), // Links to content table
  offer_id: varchar("offer_id").references(() => offers.id).notNull(),
  variant_key: text("variant_key").notNull(), // Unique key for this variant
  caption: text("caption"),
  thumb_url: text("thumb_url"),
  enabled: boolean("enabled").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const variantMetricsDaily = pgTable("variant_metrics_daily", {
  variant_id: varchar("variant_id").references(() => linkVariants.id).notNull(),
  date: timestamp("date").notNull(),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  revenue_jpy: real("revenue_jpy").default(0),
}, (table) => ({
  pk: {
    primaryKey: [table.variant_id, table.date]
  }
}));

export const eventsCalendar = pgTable("events_calendar", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(), // 'SPU', '5-0-day', 'SUPER_SALE', 'OKAIMONO'
  start_ts: timestamp("start_ts").notNull(),
  end_ts: timestamp("end_ts").notNull(),
  metadata: jsonb("metadata"), // Points multiplier, campaign details, etc.
  is_active: boolean("is_active").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

// Video + Blog Factory Tables
export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyword: text("keyword").notNull(),
  intent: text("intent").notNull(), // 'informational', 'commercial', 'navigational', 'transactional'
  clusterId: varchar("cluster_id").references(() => clusters.id),
  status: text("status").notNull().default("pending"), // 'pending', 'researching', 'ready', 'published'
  researchData: jsonb("research_data"), // JP keywords, competitors, outline
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clusters = pgTable("clusters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  niche: text("niche").notNull(),
  siteId: varchar("site_id").references(() => sites.id),
  targetRoas: real("target_roas").default(3.0),
  language: text("language").notNull().default("ja"),
  pillarTopicId: varchar("pillar_topic_id").references(() => topics.id),
  status: text("status").notNull().default("active"), // 'active', 'paused', 'completed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").references(() => sites.id).notNull(),
  topicId: varchar("topic_id").references(() => topics.id).notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  html: text("html").notNull(),
  markdown: text("markdown").notNull(),
  jsonld: jsonb("jsonld"), // Schema.org structured data
  images: jsonb("images").default([]), // Array of {url, alt, caption}
  publishedUrl: text("published_url"),
  status: text("status").notNull().default("draft"), // 'draft', 'published', 'failed'
  wordCount: integer("word_count").default(0),
  readingTime: integer("reading_time").default(0), // minutes
  seoScore: real("seo_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  publishedAt: timestamp("published_at"),
});

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id").references(() => topics.id).notNull(),
  script: text("script").notNull(),
  voiceId: text("voice_id").notNull().default("jp_female_a"),
  durationSeconds: real("duration_s"),
  mp4Url: text("mp4_url"),
  srtUrl: text("srt_url"),
  thumbnailUrls: jsonb("thumb_urls").default([]),
  platformIds: jsonb("platform_ids").default({}), // {youtube: 'video_id', tiktok: 'video_id'}
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'ready', 'published', 'failed'
  generationCost: real("generation_cost").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  publishedAt: timestamp("published_at"),
});

export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domain: text("domain").notNull().unique(),
  subdomain: text("subdomain"),
  host: text("host").notNull().default("vercel"), // 'vercel', 'cloudflare', 'wp'
  cms: text("cms").notNull().default("strapi"), // 'strapi', 'ghost', 'wp'
  apiKeys: jsonb("api_keys").default({}), // CMS credentials, hosting tokens
  repoUrl: text("repo_url"), // GitHub repository URL
  deployUrl: text("deploy_url"), // Live site URL
  status: text("status").notNull().default("active"), // 'active', 'suspended', 'deleted'
  niche: text("niche").notNull(),
  language: text("language").notNull().default("ja"),
  brandColors: jsonb("brand_colors").default({}),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const internalLinks = pgTable("internal_links", {
  fromArticleId: varchar("from_article_id").references(() => articles.id).notNull(),
  toArticleId: varchar("to_article_id").references(() => articles.id).notNull(),
  anchor: text("anchor").notNull(),
  position: integer("position"), // Character position in content
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: {
    primaryKey: [table.fromArticleId, table.toArticleId]
  }
}));

export const performancePageDaily = pgTable("performance_page_daily", {
  url: text("url").notNull(),
  date: timestamp("date").notNull(),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  avgPosition: real("avg_pos").default(0),
  dwellTime: real("dwell").default(0), // seconds
  rpm: real("rpm").default(0), // revenue per mille
  articleId: varchar("article_id").references(() => articles.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: {
    primaryKey: [table.url, table.date]
  }
}));

export const ttsVoices = pgTable("tts_voices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  provider: text("provider").notNull().default("voicevox"), // 'voicevox', 'piper', 'coqui'
  voiceId: text("voice_id").notNull(), // Provider-specific voice identifier
  gender: text("gender").notNull(), // 'male', 'female', 'neutral'
  language: text("language").notNull().default("ja"),
  speed: real("speed").default(1.0),
  energy: real("energy").default(1.0),
  abGroup: text("ab_group"), // For A/B testing voices
  performanceScore: real("performance_score").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for new tables
export type AffiliateNetwork = typeof affiliateNetworks.$inferSelect;
export type InsertAffiliateNetwork = typeof affiliateNetworks.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;
export type LinkVariant = typeof linkVariants.$inferSelect;
export type InsertLinkVariant = typeof linkVariants.$inferInsert;
export type VariantMetricsDaily = typeof variantMetricsDaily.$inferSelect;
export type InsertVariantMetricsDaily = typeof variantMetricsDaily.$inferInsert;
export type EventsCalendar = typeof eventsCalendar.$inferSelect;
export type InsertEventsCalendar = typeof eventsCalendar.$inferInsert;

// Video + Blog Factory Types
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = typeof topics.$inferInsert;
export type Cluster = typeof clusters.$inferSelect;
export type InsertCluster = typeof clusters.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;
export type Site = typeof sites.$inferSelect;
export type InsertSite = typeof sites.$inferInsert;
export type InternalLink = typeof internalLinks.$inferSelect;
export type InsertInternalLink = typeof internalLinks.$inferInsert;
export type PerformancePageDaily = typeof performancePageDaily.$inferSelect;
export type InsertPerformancePageDaily = typeof performancePageDaily.$inferInsert;
export type TTSVoice = typeof ttsVoices.$inferSelect;
export type InsertTTSVoice = typeof ttsVoices.$inferInsert;
