-- Website Editor V1.5 Schema Updates
-- Add lastGooglePingAt field to websites table

-- Add lastGooglePingAt column
ALTER TABLE websites 
  ADD COLUMN IF NOT EXISTS last_google_ping_at TIMESTAMP WITH TIME ZONE;

-- Add index for querying
CREATE INDEX IF NOT EXISTS idx_websites_last_google_ping_at 
  ON websites(last_google_ping_at) 
  WHERE last_google_ping_at IS NOT NULL;

