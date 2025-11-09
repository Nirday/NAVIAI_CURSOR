-- Enable pgvector Extension
-- Run this FIRST before running the main schema
-- 
-- In Supabase, you can enable pgvector through:
-- 1. Dashboard → Database → Extensions
-- 2. Search for "pgvector"
-- 3. Click "Enable"
--
-- OR run this SQL statement:

CREATE EXTENSION IF NOT EXISTS vector;

-- Note: In some Supabase projects, it's called "vector" not "pgvector"
-- If the above doesn't work, try:
-- CREATE EXTENSION IF NOT EXISTS "pgvector";

