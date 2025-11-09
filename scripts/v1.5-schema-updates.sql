-- V1.5 Database Schema Updates
-- Run this after the main supabase-schema.sql

-- ============================================
-- PHASE 1: CALL TRACKING
-- ============================================

-- Call Tracking Numbers Table
CREATE TABLE IF NOT EXISTS call_tracking_numbers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  twilio_phone_number TEXT NOT NULL,
  twilio_phone_number_sid TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for call_tracking_numbers
CREATE INDEX IF NOT EXISTS idx_call_tracking_numbers_user_id ON call_tracking_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_call_tracking_numbers_twilio_number ON call_tracking_numbers(twilio_phone_number);
CREATE INDEX IF NOT EXISTS idx_call_tracking_numbers_is_active ON call_tracking_numbers(is_active);

-- Modify activity_events to support phone_call event type
-- First, drop the existing constraint
ALTER TABLE activity_events 
  DROP CONSTRAINT IF EXISTS activity_events_event_type_check;

-- Add the new constraint with phone_call included
ALTER TABLE activity_events 
  ADD CONSTRAINT activity_events_event_type_check 
  CHECK (event_type IN (
    'lead_capture', 
    'note', 
    'email_sent', 
    'email_opened', 
    'link_clicked', 
    'sms_sent', 
    'sms_opened', 
    'billing_status_change', 
    'review_request', 
    'negative_feedback',
    'phone_call'  -- V1.5: New event type
  ));

-- Add details JSONB field to activity_events (if it doesn't exist)
-- Check if column exists first (PostgreSQL doesn't have IF NOT EXISTS for ALTER TABLE ADD COLUMN)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_events' AND column_name = 'details'
  ) THEN
    ALTER TABLE activity_events ADD COLUMN details JSONB DEFAULT NULL;
  END IF;
END $$;

-- RLS Policies for call_tracking_numbers
ALTER TABLE call_tracking_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call tracking numbers" ON call_tracking_numbers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage call tracking numbers" ON call_tracking_numbers
  FOR ALL USING (true); -- Service role only, for provisioning

-- Trigger for call_tracking_numbers updated_at
CREATE TRIGGER update_call_tracking_numbers_updated_at
  BEFORE UPDATE ON call_tracking_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 2: GBP OFFENSE
-- ============================================

-- GBP Questions Table
CREATE TABLE IF NOT EXISTS gbp_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES review_sources(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL, -- GBP API question ID
  question_text TEXT NOT NULL,
  asked_by TEXT, -- Customer name if available
  suggested_answer TEXT, -- AI-generated answer
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'published', 'dismissed')) DEFAULT 'pending',
  approved_answer TEXT, -- User's final answer
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_id, question_id)
);

-- Indexes for gbp_questions
CREATE INDEX IF NOT EXISTS idx_gbp_questions_user_id ON gbp_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_gbp_questions_source_id ON gbp_questions(source_id);
CREATE INDEX IF NOT EXISTS idx_gbp_questions_status ON gbp_questions(status);
CREATE INDEX IF NOT EXISTS idx_gbp_questions_created_at ON gbp_questions(created_at);

-- Add GBP-specific fields to review_sources (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'review_sources' AND column_name = 'gbp_location_id'
  ) THEN
    ALTER TABLE review_sources ADD COLUMN gbp_location_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'review_sources' AND column_name = 'gbp_account_id'
  ) THEN
    ALTER TABLE review_sources ADD COLUMN gbp_account_id TEXT;
  END IF;
END $$;

-- Modify social_posts to support google_business platform
ALTER TABLE social_posts 
  DROP CONSTRAINT IF EXISTS social_posts_platform_check;

ALTER TABLE social_posts 
  ADD CONSTRAINT social_posts_platform_check 
  CHECK (platform IN ('facebook', 'linkedin', 'instagram', 'twitter', 'google_business'));

-- RLS Policies for gbp_questions
ALTER TABLE gbp_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own GBP questions" ON gbp_questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own GBP questions" ON gbp_questions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage GBP questions" ON gbp_questions
  FOR ALL USING (true); -- Service role only, for background jobs

-- Trigger for gbp_questions updated_at
CREATE TRIGGER update_gbp_questions_updated_at
  BEFORE UPDATE ON gbp_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 3: MOBILE APP
-- ============================================

-- Device Tokens Table (for push notifications)
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- Indexes for device_tokens
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);

-- RLS Policies for device_tokens
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own device tokens" ON device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own device tokens" ON device_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Trigger for device_tokens updated_at
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 4: VOICE-FIRST (No new tables needed)
-- Voice transcriptions can be stored in existing tables or as files
-- ============================================

