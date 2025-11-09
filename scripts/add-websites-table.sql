-- Add Websites Table for Module 2: Website Builder
-- Run this in Supabase SQL Editor to add the missing table

-- Websites Table
CREATE TABLE IF NOT EXISTS websites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  website_data JSONB NOT NULL, -- Complete Website object (pages, theme, etc.)
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  published_domain TEXT, -- Domain/subdomain when published (e.g., 'business-name.naviai.com')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id);
CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_published_domain ON websites(published_domain) WHERE published_domain IS NOT NULL;

-- Enable RLS
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Trigger for updated_at
CREATE TRIGGER update_websites_updated_at
  BEFORE UPDATE ON websites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

