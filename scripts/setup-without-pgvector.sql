-- Navi AI Database Schema (Without pgvector)
-- Use this version if pgvector is not available
-- This will create all tables except profile_embeddings functionality
-- 
-- IMPORTANT: Module 1's RAG system requires pgvector. 
-- To enable it:
-- 1. Go to Supabase Dashboard → Database → Extensions
-- 2. Search for "vector" or "pgvector"
-- 3. Enable it
-- 4. Then run the full supabase-schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profile Embeddings Table (DISABLED - requires pgvector)
-- Uncomment and modify after enabling pgvector:
/*
CREATE TABLE profile_embeddings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- Requires pgvector extension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- For now, create a simplified version without vector support
CREATE TABLE profile_embeddings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  -- embedding VECTOR(1536), -- Disabled until pgvector is enabled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: The match_profile_embeddings function will not work without pgvector
-- You'll need to enable pgvector and run the full schema for Module 1 RAG to work

