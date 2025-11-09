-- Navi AI Database Schema
-- This file contains the SQL CREATE TABLE statements for the Supabase PostgreSQL database

-- Enable required extensions
-- Note: uuid-ossp is usually enabled by default in Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension
-- IMPORTANT: You must enable pgvector in Supabase Dashboard first:
-- 1. Go to: Database → Extensions
-- 2. Search for "vector" or "pgvector"
-- 3. Click "Enable"
-- Then run this (with schema specification):
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
-- This installs the extension in the 'extensions' schema
-- All vector types and functions will be prefixed with 'extensions.'

-- Business Profiles Table
CREATE TABLE business_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  location JSONB NOT NULL DEFAULT '{}',
  contact_info JSONB NOT NULL DEFAULT '{}',
  services JSONB NOT NULL DEFAULT '[]',
  hours JSONB NOT NULL DEFAULT '[]',
  brand_voice TEXT CHECK (brand_voice IN ('friendly', 'professional', 'witty', 'formal')),
  target_audience TEXT,
  custom_attributes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages Table
CREATE TABLE chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profile Embeddings Table (for RAG pipeline)
CREATE TABLE profile_embeddings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding extensions.vector(1536), -- OpenAI text-embedding-3-small produces 1536-dimensional vectors (prefixed with extensions schema)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suggestion Prompts Table
CREATE TABLE suggestion_prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('aha_moment', 'gap_analysis', 'goal_framing', 'seo_opportunity')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  is_actionable BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Settings Table
CREATE TABLE analytics_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plausible_shared_link TEXT,
  plausible_api_key TEXT, -- Encrypted/stored securely
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Websites Table (Module 2: Website Builder)
CREATE TABLE websites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  website_data JSONB NOT NULL, -- Complete Website object (pages, theme, etc.)
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  published_domain TEXT, -- Domain/subdomain when published (e.g., 'business-name.naviai.com')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts Table (Module 7: Contact Hub)
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tags TEXT[] DEFAULT ARRAY['new_lead']::TEXT[],
  is_unsubscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Activity Events Table (Module 7: Contact Hub)
CREATE TABLE activity_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('lead_capture', 'note', 'email_sent', 'email_opened', 'link_clicked', 'sms_sent', 'sms_opened', 'billing_status_change', 'review_request', 'negative_feedback')),
  content TEXT NOT NULL, -- Human-readable summary of the event
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blog Posts Table (Module 3: Content Engine)
CREATE TABLE blog_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  seo_metadata JSONB NOT NULL DEFAULT '{"metaTitle": "", "metaDescription": "", "focusKeyword": null}',
  focus_keyword TEXT,
  branded_graphic_url TEXT,
  repurposed_assets JSONB DEFAULT NULL, -- Array of RepurposedAsset objects
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'pending_approval', 'approved', 'changes_requested', 'published')) DEFAULT 'draft',
  approval_token TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Content Settings Table (Module 3: Content Engine)
CREATE TABLE content_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_business_goal_cta TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')) DEFAULT 'weekly',
  target_platforms TEXT[] NOT NULL DEFAULT ARRAY['linkedin', 'facebook', 'twitter', 'instagram']::TEXT[],
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Action Commands Table (Central Action Queue for inter-module communication)
CREATE TABLE action_commands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- SEO Audit Reports Table (Module 4: SEO Growth Engine)
CREATE TABLE seo_audit_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SEO Issues Table (Module 4: SEO Growth Engine)
CREATE TABLE seo_issues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_report_id UUID NOT NULL REFERENCES seo_audit_reports(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  page_url TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SEO Fix Logs Table (Module 4: SEO Growth Engine)
CREATE TABLE seo_fix_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES seo_issues(id) ON DELETE CASCADE,
  action_command_id UUID NOT NULL REFERENCES action_commands(id) ON DELETE CASCADE,
  fix_description TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SEO Opportunities Table (Module 4: SEO Growth Engine)
CREATE TABLE seo_opportunities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null for global/admin opportunities
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('on_page', 'technical', 'local', 'content', 'schema', 'other')),
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'approved', 'rejected')) DEFAULT 'pending_review',
  suggested_action TEXT NOT NULL,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- SEO Settings Table (Module 4: SEO Growth Engine)
CREATE TABLE seo_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[] CHECK (array_length(keywords, 1) <= 10),
  competitors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[] CHECK (array_length(competitors, 1) <= 3),
  location TEXT,
  latest_insight JSONB DEFAULT NULL, -- Latest competitive insight from AI strategist
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keyword Performance Table (Module 4: SEO Growth Engine)
CREATE TABLE keyword_performance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  location TEXT,
  user_rank INTEGER CHECK (user_rank IS NULL OR (user_rank >= 1 AND user_rank <= 100)),
  competitor_ranks JSONB NOT NULL DEFAULT '{}', -- {competitor_domain: rank}
  date DATE NOT NULL, -- Date of the snapshot
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, keyword, location, date)
);

-- Competitive Insights Table (Module 4: SEO Growth Engine)
CREATE TABLE competitive_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('content_gap', 'keyword_opportunity', 'technical_improvement', 'celebration')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Connections Table (Module 5: Social Media Growth Hub)
-- V1.5: Added 'google_search_console' platform for Google Bot Ping
CREATE TABLE social_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'instagram', 'twitter', 'google_search_console')),
  platform_account_id TEXT NOT NULL,
  platform_username TEXT NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted in production
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_account_id)
);

-- Social Posts Table (Module 5: Social Media Growth Hub)
CREATE TABLE social_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES social_connections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'instagram', 'twitter')),
  content TEXT NOT NULL,
  media_urls TEXT[],
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  platform_post_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'failed')) DEFAULT 'draft',
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post Analytics Table (Module 5: Social Media Growth Hub)
CREATE TABLE post_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'instagram', 'twitter')),
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  website_clicks INTEGER,
  impressions INTEGER,
  engagement_rate DECIMAL(5, 4), -- Up to 99.9999%
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id)
);

-- Social Conversations Table (Module 5: Social Media Growth Hub)
CREATE TABLE social_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES social_connections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'instagram', 'twitter')),
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('direct_message', 'comment_thread')),
  platform_conversation_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, platform_conversation_id, conversation_type)
);

-- Social Messages Table (Module 5: Social Media Growth Hub)
CREATE TABLE social_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES social_conversations(id) ON DELETE CASCADE,
  platform_message_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'instagram', 'twitter')),
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'customer')),
  content TEXT NOT NULL,
  media_urls TEXT[],
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(conversation_id, platform_message_id)
);

-- Social Ideas Table (Module 5: Social Media Growth Hub)
CREATE TABLE social_ideas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  idea_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_text TEXT NOT NULL,
  image_suggestion TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'used', 'dismissed')) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimal query performance

-- Business Profiles indexes
CREATE INDEX idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX idx_business_profiles_industry ON business_profiles(industry);
CREATE INDEX idx_business_profiles_created_at ON business_profiles(created_at);

-- Chat Messages indexes (composite index for efficient history retrieval)
CREATE INDEX idx_chat_messages_user_timestamp ON chat_messages(user_id, timestamp DESC);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);

-- Profile Embeddings indexes
CREATE INDEX idx_profile_embeddings_user_id ON profile_embeddings(user_id);
CREATE INDEX idx_profile_embeddings_created_at ON profile_embeddings(created_at);

-- Suggestion Prompts indexes
CREATE INDEX idx_suggestion_prompts_user_id ON suggestion_prompts(user_id);
CREATE INDEX idx_suggestion_prompts_category ON suggestion_prompts(category);
CREATE INDEX idx_suggestion_prompts_priority ON suggestion_prompts(priority);
CREATE INDEX idx_suggestion_prompts_created_at ON suggestion_prompts(created_at);

-- Analytics Settings indexes
CREATE INDEX idx_analytics_settings_user_id ON analytics_settings(user_id);

-- Websites indexes
CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_websites_status ON websites(status);
CREATE INDEX idx_websites_published_domain ON websites(published_domain) WHERE published_domain IS NOT NULL;

-- Contacts indexes
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_created_at ON contacts(created_at);

-- Activity Events indexes
CREATE INDEX idx_activity_events_user_id ON activity_events(user_id);
CREATE INDEX idx_activity_events_contact_id ON activity_events(contact_id);
CREATE INDEX idx_activity_events_event_type ON activity_events(event_type);
CREATE INDEX idx_activity_events_created_at ON activity_events(created_at);

-- Blog Posts indexes
CREATE INDEX idx_blog_posts_user_id ON blog_posts(user_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_scheduled_at ON blog_posts(scheduled_at);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX idx_blog_posts_created_at ON blog_posts(created_at);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);

-- Content Settings indexes
CREATE INDEX idx_content_settings_user_id ON content_settings(user_id);
CREATE INDEX idx_content_settings_is_enabled ON content_settings(is_enabled);

-- Action Commands indexes
CREATE INDEX idx_action_commands_user_id ON action_commands(user_id);
CREATE INDEX idx_action_commands_status ON action_commands(status);
CREATE INDEX idx_action_commands_command_type ON action_commands(command_type);
CREATE INDEX idx_action_commands_created_at ON action_commands(created_at);

-- SEO Audit Reports indexes
CREATE INDEX idx_seo_audit_reports_user_id ON seo_audit_reports(user_id);
CREATE INDEX idx_seo_audit_reports_created_at ON seo_audit_reports(created_at);

-- SEO Issues indexes
CREATE INDEX idx_seo_issues_user_id ON seo_issues(user_id);
CREATE INDEX idx_seo_issues_audit_report_id ON seo_issues(audit_report_id);
CREATE INDEX idx_seo_issues_severity ON seo_issues(severity);
CREATE INDEX idx_seo_issues_type ON seo_issues(type);

-- SEO Fix Logs indexes
CREATE INDEX idx_seo_fix_logs_user_id ON seo_fix_logs(user_id);
CREATE INDEX idx_seo_fix_logs_issue_id ON seo_fix_logs(issue_id);
CREATE INDEX idx_seo_fix_logs_applied_at ON seo_fix_logs(applied_at);

-- SEO Opportunities indexes
CREATE INDEX idx_seo_opportunities_user_id ON seo_opportunities(user_id);
CREATE INDEX idx_seo_opportunities_status ON seo_opportunities(status);
CREATE INDEX idx_seo_opportunities_category ON seo_opportunities(category);
CREATE INDEX idx_seo_opportunities_created_at ON seo_opportunities(created_at);

-- SEO Settings indexes
CREATE INDEX idx_seo_settings_user_id ON seo_settings(user_id);

-- Keyword Performance indexes
CREATE INDEX idx_keyword_performance_user_id ON keyword_performance(user_id);
CREATE INDEX idx_keyword_performance_keyword ON keyword_performance(keyword);
CREATE INDEX idx_keyword_performance_date ON keyword_performance(date);
CREATE INDEX idx_keyword_performance_user_keyword_date ON keyword_performance(user_id, keyword, date);

-- Competitive Insights indexes
CREATE INDEX idx_competitive_insights_user_id ON competitive_insights(user_id);

-- Social Connections indexes
CREATE INDEX idx_social_connections_user_id ON social_connections(user_id);
CREATE INDEX idx_social_connections_platform ON social_connections(platform);
CREATE INDEX idx_social_connections_is_active ON social_connections(is_active);

-- Social Posts indexes
CREATE INDEX idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX idx_social_posts_connection_id ON social_posts(connection_id);
CREATE INDEX idx_social_posts_platform ON social_posts(platform);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled_at ON social_posts(scheduled_at);
CREATE INDEX idx_social_posts_published_at ON social_posts(published_at);

-- Post Analytics indexes
CREATE INDEX idx_post_analytics_post_id ON post_analytics(post_id);
CREATE INDEX idx_post_analytics_platform ON post_analytics(platform);
CREATE INDEX idx_post_analytics_fetched_at ON post_analytics(fetched_at);

-- Social Conversations indexes
CREATE INDEX idx_social_conversations_user_id ON social_conversations(user_id);
CREATE INDEX idx_social_conversations_connection_id ON social_conversations(connection_id);
CREATE INDEX idx_social_conversations_platform ON social_conversations(platform);
CREATE INDEX idx_social_conversations_status ON social_conversations(status);
CREATE INDEX idx_social_conversations_last_message_at ON social_conversations(last_message_at);
CREATE INDEX idx_social_conversations_unread_count ON social_conversations(unread_count);

-- Social Messages indexes
CREATE INDEX idx_social_messages_conversation_id ON social_messages(conversation_id);
CREATE INDEX idx_social_messages_platform ON social_messages(platform);
CREATE INDEX idx_social_messages_sender_type ON social_messages(sender_type);
CREATE INDEX idx_social_messages_is_read ON social_messages(is_read);
CREATE INDEX idx_social_messages_created_at ON social_messages(created_at);

-- Social Ideas indexes
CREATE INDEX idx_social_ideas_user_id ON social_ideas(user_id);
CREATE INDEX idx_social_ideas_status ON social_ideas(status);
CREATE INDEX idx_social_ideas_created_at ON social_ideas(created_at);
CREATE INDEX idx_social_ideas_idea_id ON social_ideas(idea_id);
CREATE INDEX idx_competitive_insights_insight_type ON competitive_insights(insight_type);
CREATE INDEX idx_competitive_insights_created_at ON competitive_insights(created_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_fix_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_ideas ENABLE ROW LEVEL SECURITY;

-- Business Profiles RLS Policies
CREATE POLICY "Users can view their own business profile" ON business_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business profile" ON business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile" ON business_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business profile" ON business_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Chat Messages RLS Policies
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Profile Embeddings RLS Policies
CREATE POLICY "Users can view their own profile embeddings" ON profile_embeddings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile embeddings" ON profile_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile embeddings" ON profile_embeddings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile embeddings" ON profile_embeddings
  FOR DELETE USING (auth.uid() = user_id);

-- Suggestion Prompts RLS Policies
CREATE POLICY "Users can view their own suggestion prompts" ON suggestion_prompts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suggestion prompts" ON suggestion_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestion prompts" ON suggestion_prompts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suggestion prompts" ON suggestion_prompts
  FOR DELETE USING (auth.uid() = user_id);

-- Analytics Settings RLS Policies
CREATE POLICY "Users can view their own analytics settings" ON analytics_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics settings" ON analytics_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics settings" ON analytics_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analytics settings" ON analytics_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Websites RLS Policies
CREATE POLICY "Users can view their own websites" ON websites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own websites" ON websites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own websites" ON websites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own websites" ON websites
  FOR DELETE USING (auth.uid() = user_id);

-- Public access to published websites (for rendering)
CREATE POLICY "Public can view published websites" ON websites
  FOR SELECT USING (status = 'published');

-- Contacts RLS Policies
CREATE POLICY "Users can view their own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Activity Events RLS Policies
CREATE POLICY "Users can view their own activity events" ON activity_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity events" ON activity_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity events" ON activity_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity events" ON activity_events
  FOR DELETE USING (auth.uid() = user_id);

-- Blog Posts RLS Policies
CREATE POLICY "Users can view their own blog posts" ON blog_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blog posts" ON blog_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blog posts" ON blog_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blog posts" ON blog_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Content Settings RLS Policies
CREATE POLICY "Users can view their own content settings" ON content_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content settings" ON content_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content settings" ON content_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content settings" ON content_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Action Commands RLS Policies
CREATE POLICY "Users can view their own action commands" ON action_commands
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action commands" ON action_commands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update action commands" ON action_commands
  FOR UPDATE USING (true); -- Service role only, for background jobs

-- SEO Audit Reports RLS Policies
CREATE POLICY "Users can view their own SEO audit reports" ON seo_audit_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SEO audit reports" ON seo_audit_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SEO audit reports" ON seo_audit_reports
  FOR DELETE USING (auth.uid() = user_id);

-- SEO Issues RLS Policies
CREATE POLICY "Users can view their own SEO issues" ON seo_issues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SEO issues" ON seo_issues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SEO issues" ON seo_issues
  FOR UPDATE USING (auth.uid() = user_id);

-- SEO Fix Logs RLS Policies
CREATE POLICY "Users can view their own SEO fix logs" ON seo_fix_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SEO fix logs" ON seo_fix_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SEO Opportunities RLS Policies
CREATE POLICY "Users can view approved opportunities or their own" ON seo_opportunities
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own SEO opportunities" ON seo_opportunities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update SEO opportunities" ON seo_opportunities
  FOR UPDATE USING (true); -- For admin review

-- SEO Settings RLS Policies
CREATE POLICY "Users can view their own SEO settings" ON seo_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SEO settings" ON seo_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SEO settings" ON seo_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SEO settings" ON seo_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Keyword Performance RLS Policies
CREATE POLICY "Users can view their own keyword performance" ON keyword_performance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own keyword performance" ON keyword_performance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update keyword performance" ON keyword_performance
  FOR UPDATE USING (true); -- For background jobs

-- Competitive Insights RLS Policies
CREATE POLICY "Users can view their own competitive insights" ON competitive_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own competitive insights" ON competitive_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Social Connections RLS Policies
CREATE POLICY "Users can view their own social connections" ON social_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social connections" ON social_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social connections" ON social_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social connections" ON social_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Social Posts RLS Policies
CREATE POLICY "Users can view their own social posts" ON social_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social posts" ON social_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social posts" ON social_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social posts" ON social_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Post Analytics RLS Policies
CREATE POLICY "Users can view their own post analytics" ON post_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_analytics.post_id
      AND social_posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert post analytics" ON post_analytics
  FOR INSERT WITH CHECK (true); -- For background jobs

CREATE POLICY "Service role can update post analytics" ON post_analytics
  FOR UPDATE USING (true); -- For background jobs

-- Social Conversations RLS Policies
CREATE POLICY "Users can view their own social conversations" ON social_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social conversations" ON social_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social conversations" ON social_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert social conversations" ON social_conversations
  FOR INSERT WITH CHECK (true); -- For webhook processing

CREATE POLICY "Service role can update social conversations" ON social_conversations
  FOR UPDATE USING (true); -- For webhook processing

-- Social Messages RLS Policies
CREATE POLICY "Users can view their own social messages" ON social_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM social_conversations
      WHERE social_conversations.id = social_messages.conversation_id
      AND social_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own social messages" ON social_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_conversations
      WHERE social_conversations.id = social_messages.conversation_id
      AND social_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own social messages" ON social_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM social_conversations
      WHERE social_conversations.id = social_messages.conversation_id
      AND social_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert social messages" ON social_messages
  FOR INSERT WITH CHECK (true); -- For webhook processing

CREATE POLICY "Service role can update social messages" ON social_messages
  FOR UPDATE USING (true); -- For webhook processing

-- Social Ideas RLS Policies
CREATE POLICY "Users can view their own social ideas" ON social_ideas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social ideas" ON social_ideas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social ideas" ON social_ideas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social ideas" ON social_ideas
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert social ideas" ON social_ideas
  FOR INSERT WITH CHECK (true); -- For idea generation job

CREATE POLICY "Service role can update social ideas" ON social_ideas
  FOR UPDATE USING (true); -- For idea generation job

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on business_profiles
CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on analytics_settings
CREATE TRIGGER update_analytics_settings_updated_at
  BEFORE UPDATE ON analytics_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on websites
CREATE TRIGGER update_websites_updated_at
  BEFORE UPDATE ON websites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on contacts
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on blog_posts
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on content_settings
CREATE TRIGGER update_content_settings_updated_at
  BEFORE UPDATE ON content_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on seo_settings
CREATE TRIGGER update_seo_settings_updated_at
  BEFORE UPDATE ON seo_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on social_connections
CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on social_posts
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on social_conversations
CREATE TRIGGER update_social_conversations_updated_at
  BEFORE UPDATE ON social_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on social_ideas
CREATE TRIGGER update_social_ideas_updated_at
  BEFORE UPDATE ON social_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Communication Settings Table (Module 6: Communication Hub)
CREATE TABLE communication_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_cta TEXT NOT NULL,
  default_from_email TEXT,
  default_from_name TEXT,
  reply_to_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audiences Table (Module 6: Communication Hub)
CREATE TABLE audiences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  contact_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  filter_tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Broadcasts Table (Module 6: Communication Hub)
CREATE TABLE broadcasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  content JSONB NOT NULL, -- Array of BroadcastContentVersion objects
  ab_test_config JSONB, -- AbTestConfig object (null if no A/B test)
  type TEXT NOT NULL CHECK (type IN ('standard', 'review_request')) DEFAULT 'standard',
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'testing', 'sending', 'sent', 'failed')) DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER,
  click_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation Sequences Table (Module 6: Communication Hub)
CREATE TABLE automation_sequences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('new_lead_added')) DEFAULT 'new_lead_added',
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_executions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation Steps Table (Module 6: Communication Hub)
CREATE TABLE automation_steps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES automation_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('send_email', 'send_sms', 'wait')),
  subject TEXT,
  body TEXT,
  wait_days INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);

-- Automation Contact Progress Table (Module 6: Communication Hub)
CREATE TABLE automation_contact_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES automation_sequences(id) ON DELETE CASCADE,
  current_step_id UUID NOT NULL REFERENCES automation_steps(id) ON DELETE CASCADE,
  next_step_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contact_id, sequence_id)
);

-- Indexes for Communication Hub tables
CREATE INDEX idx_audiences_user_id ON audiences(user_id);
CREATE INDEX idx_broadcasts_user_id ON broadcasts(user_id);
CREATE INDEX idx_broadcasts_audience_id ON broadcasts(audience_id);
CREATE INDEX idx_broadcasts_status ON broadcasts(status);
CREATE INDEX idx_automation_sequences_user_id ON automation_sequences(user_id);
CREATE INDEX idx_automation_sequences_trigger_type ON automation_sequences(trigger_type);
CREATE INDEX idx_automation_steps_sequence_id ON automation_steps(sequence_id);
CREATE INDEX idx_automation_contact_progress_contact_id ON automation_contact_progress(contact_id);
CREATE INDEX idx_automation_contact_progress_sequence_id ON automation_contact_progress(sequence_id);
CREATE INDEX idx_automation_contact_progress_next_step_at ON automation_contact_progress(next_step_at);

-- RLS Policies for Communication Hub tables
ALTER TABLE communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_contact_progress ENABLE ROW LEVEL SECURITY;

-- Communication Settings policies
CREATE POLICY "Users can view their own communication settings"
  ON communication_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own communication settings"
  ON communication_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own communication settings"
  ON communication_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Audiences policies
CREATE POLICY "Users can view their own audiences"
  ON audiences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audiences"
  ON audiences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audiences"
  ON audiences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audiences"
  ON audiences FOR DELETE
  USING (auth.uid() = user_id);

-- Broadcasts policies
CREATE POLICY "Users can view their own broadcasts"
  ON broadcasts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own broadcasts"
  ON broadcasts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own broadcasts"
  ON broadcasts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own broadcasts"
  ON broadcasts FOR DELETE
  USING (auth.uid() = user_id);

-- Automation Sequences policies
CREATE POLICY "Users can view their own automation sequences"
  ON automation_sequences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation sequences"
  ON automation_sequences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation sequences"
  ON automation_sequences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation sequences"
  ON automation_sequences FOR DELETE
  USING (auth.uid() = user_id);

-- Automation Steps policies
CREATE POLICY "Users can view their own automation steps"
  ON automation_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM automation_sequences
      WHERE automation_sequences.id = automation_steps.sequence_id
      AND automation_sequences.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own automation steps"
  ON automation_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM automation_sequences
      WHERE automation_sequences.id = automation_steps.sequence_id
      AND automation_sequences.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own automation steps"
  ON automation_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM automation_sequences
      WHERE automation_sequences.id = automation_steps.sequence_id
      AND automation_sequences.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own automation steps"
  ON automation_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM automation_sequences
      WHERE automation_sequences.id = automation_steps.sequence_id
      AND automation_sequences.user_id = auth.uid()
    )
  );

-- Automation Contact Progress policies
CREATE POLICY "Users can view their own automation contact progress"
  ON automation_contact_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM automation_sequences
      WHERE automation_sequences.id = automation_contact_progress.sequence_id
      AND automation_sequences.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage automation contact progress"
  ON automation_contact_progress FOR ALL
  USING (true); -- Service role only, for background jobs

-- Triggers for updated_at columns
CREATE TRIGGER update_communication_settings_updated_at
  BEFORE UPDATE ON communication_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audiences_updated_at
  BEFORE UPDATE ON audiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broadcasts_updated_at
  BEFORE UPDATE ON broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_sequences_updated_at
  BEFORE UPDATE ON automation_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_contact_progress_updated_at
  BEFORE UPDATE ON automation_contact_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate message_id for chat_messages
CREATE OR REPLACE FUNCTION generate_message_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.message_id IS NULL THEN
    NEW.message_id = 'msg_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically generate message_id for chat_messages
CREATE TRIGGER generate_chat_message_id
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION generate_message_id();

-- Function for semantic similarity search on profile embeddings
-- Note: Vector functions and operators are prefixed with extensions schema
CREATE OR REPLACE FUNCTION match_profile_embeddings(
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    profile_embeddings.content,
    1 - (profile_embeddings.embedding <=> query_embedding)::float as similarity
  FROM profile_embeddings
  WHERE profile_embeddings.user_id = match_profile_embeddings.user_id
    AND 1 - (profile_embeddings.embedding <=> query_embedding)::float > match_threshold
  ORDER BY profile_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Review Sources Table (Module 8: Reputation Management Hub)
CREATE TABLE review_sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'yelp', 'facebook')),
  platform_account_id TEXT NOT NULL,
  platform_account_name TEXT NOT NULL,
  review_link TEXT,
  access_token TEXT, -- Encrypted token
  refresh_token TEXT, -- Encrypted token
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_account_id)
);

-- Reviews Table (Module 8: Reputation Management Hub)
CREATE TABLE reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES review_sources(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'yelp', 'facebook')),
  platform_review_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  review_url TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('needs_response', 'response_pending_approval', 'response_changes_requested', 'response_approved', 'response_sent', 'response_failed')) DEFAULT 'needs_response',
  suggested_response_content TEXT,
  approval_token UUID,
  approval_token_expires_at TIMESTAMP WITH TIME ZONE,
  is_good_for_showcasing BOOLEAN NOT NULL DEFAULT false,
  response_retry_count INTEGER NOT NULL DEFAULT 0,
  response_error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_id, platform_review_id)
);

-- Review Responses Table (Module 8: Reputation Management Hub)
CREATE TABLE review_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  platform_response_id TEXT, -- Platform-specific response ID (for audit trail)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reputation Settings Table (Module 8: Reputation Management Hub)
CREATE TABLE reputation_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  review_request_template TEXT NOT NULL,
  direct_review_links JSONB NOT NULL DEFAULT '[]', -- Array of {platform, url} objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reputation Themes Table (Module 8: Reputation Management Hub)
CREATE TABLE reputation_themes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('positive', 'negative')),
  theme TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for review_sources
CREATE INDEX idx_review_sources_user_id ON review_sources(user_id);
CREATE INDEX idx_review_sources_platform ON review_sources(platform);
CREATE INDEX idx_review_sources_is_active ON review_sources(is_active);

-- Indexes for reviews
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_source_id ON reviews(source_id);
CREATE INDEX idx_reviews_platform ON reviews(platform);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_reviewed_at ON reviews(reviewed_at);
CREATE INDEX idx_reviews_approval_token ON reviews(approval_token) WHERE approval_token IS NOT NULL;
CREATE INDEX idx_reviews_is_good_for_showcasing ON reviews(is_good_for_showcasing) WHERE is_good_for_showcasing = true;

-- Indexes for review_responses
CREATE INDEX idx_review_responses_review_id ON review_responses(review_id);

-- Indexes for reputation_settings
CREATE INDEX idx_reputation_settings_user_id ON reputation_settings(user_id);

-- Indexes for reputation_themes
CREATE INDEX idx_reputation_themes_user_id ON reputation_themes(user_id);
CREATE INDEX idx_reputation_themes_type ON reputation_themes(type);

-- Trigger for review_sources updated_at
CREATE TRIGGER update_review_sources_updated_at
  BEFORE UPDATE ON review_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for reviews updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for reputation_settings updated_at
CREATE TRIGGER update_reputation_settings_updated_at
  BEFORE UPDATE ON reputation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for review_sources
CREATE POLICY "Users can view their own review sources" ON review_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review sources" ON review_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review sources" ON review_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review sources" ON review_sources
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reviews
CREATE POLICY "Users can view their own reviews" ON reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for review_responses
CREATE POLICY "Users can view their own review responses" ON review_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_responses.review_id
      AND reviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own review responses" ON review_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_responses.review_id
      AND reviews.user_id = auth.uid()
    )
  );

-- RLS Policies for reputation_settings
CREATE POLICY "Users can view their own reputation settings" ON reputation_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reputation settings" ON reputation_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reputation settings" ON reputation_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reputation settings" ON reputation_settings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reputation_themes
CREATE POLICY "Users can view their own reputation themes" ON reputation_themes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reputation themes" ON reputation_themes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage reputation themes" ON reputation_themes
  FOR ALL USING (true); -- Service role only, for background jobs

-- Subscriptions Table (Module 9: Billing & Subscription Hub)
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL, -- Links to plan via ENTITLEMENTS config
  stripe_current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired')),
  trial_ends_at TIMESTAMP WITH TIME ZONE, -- Null if no trial
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- One-Time Payments Table (Module 9: Billing & Subscription Hub)
CREATE TABLE one_time_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_product_id TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Indexes for one_time_payments
CREATE INDEX idx_one_time_payments_user_id ON one_time_payments(user_id);
CREATE INDEX idx_one_time_payments_stripe_customer_id ON one_time_payments(stripe_customer_id);
CREATE INDEX idx_one_time_payments_status ON one_time_payments(status);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
  FOR ALL USING (true); -- Service role only, for webhook updates

-- RLS Policies for one_time_payments
CREATE POLICY "Users can view their own payments" ON one_time_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all payments" ON one_time_payments
  FOR ALL USING (true); -- Service role only, for webhook updates

-- User Profiles Table (Module 10: Admin Control Center)
-- Stores user role and profile information
CREATE TABLE user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'super_admin')) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature Flags Table (Module 10: Admin Control Center)
CREATE TABLE feature_flags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  flag_id TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Audit Logs Table (Module 10: Admin Control Center)
CREATE TABLE admin_audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Invites Table (Module 10: Admin Control Center)
CREATE TABLE admin_invites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_to_assign TEXT NOT NULL CHECK (role_to_assign IN ('admin', 'super_admin')) DEFAULT 'admin',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Job Run Logs Table (Module 10: Admin Control Center)
CREATE TABLE job_run_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  details JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform Settings Table (Module 10: Admin Control Center)
CREATE TABLE platform_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT NOT NULL,
  is_editable_by_admin BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Indexes for feature_flags
CREATE INDEX idx_feature_flags_flag_id ON feature_flags(flag_id);
CREATE INDEX idx_feature_flags_is_enabled ON feature_flags(is_enabled);

-- Indexes for admin_audit_logs
CREATE INDEX idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- Indexes for admin_invites
CREATE INDEX idx_admin_invites_token ON admin_invites(token);
CREATE INDEX idx_admin_invites_email ON admin_invites(email);
CREATE INDEX idx_admin_invites_status ON admin_invites(status);
CREATE INDEX idx_admin_invites_expires_at ON admin_invites(expires_at);

-- Indexes for job_run_logs
CREATE INDEX idx_job_run_logs_job_name ON job_run_logs(job_name);
CREATE INDEX idx_job_run_logs_status ON job_run_logs(status);
CREATE INDEX idx_job_run_logs_started_at ON job_run_logs(started_at DESC);

-- Indexes for platform_settings
CREATE INDEX idx_platform_settings_key ON platform_settings(key);

-- Enable RLS on new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Service role can manage all profiles
CREATE POLICY "Service role can manage all profiles" ON user_profiles
  FOR ALL USING (true);

-- RLS Policies for feature_flags
-- Admins can view all feature flags
CREATE POLICY "Admins can view feature flags" ON feature_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Service role can manage all feature flags
CREATE POLICY "Service role can manage all feature flags" ON feature_flags
  FOR ALL USING (true);

-- RLS Policies for admin_audit_logs
-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs" ON admin_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Service role can manage all audit logs
CREATE POLICY "Service role can manage all audit logs" ON admin_audit_logs
  FOR ALL USING (true);

-- RLS Policies for admin_invites
-- Super admins can view all invites
CREATE POLICY "Super admins can view invites" ON admin_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Service role can manage all invites
CREATE POLICY "Service role can manage all invites" ON admin_invites
  FOR ALL USING (true);

-- RLS Policies for job_run_logs
-- Admins can view all job logs
CREATE POLICY "Admins can view job logs" ON job_run_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Service role can manage all job logs
CREATE POLICY "Service role can manage all job logs" ON job_run_logs
  FOR ALL USING (true);

-- RLS Policies for platform_settings
-- Super admins can view all settings
CREATE POLICY "Super admins can view settings" ON platform_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Service role can manage all settings
CREATE POLICY "Service role can manage all settings" ON platform_settings
  FOR ALL USING (true);
