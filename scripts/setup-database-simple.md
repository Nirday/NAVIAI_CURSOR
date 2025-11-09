# Database Setup Instructions

## Your Supabase Project
- **Project URL**: https://wmhkfuxjipemqnoorcgy.supabase.co
- **Project Reference**: `wmhkfuxjipemqnoorcgy`

## How to Access SQL Editor

### Option 1: Direct Dashboard Link
1. Go to: https://supabase.com/dashboard
2. Make sure you're logged in
3. Find your project in the list (or search for `wmhkfuxjipemqnoorcgy`)
4. Click on your project
5. In the left sidebar, click **"SQL Editor"**
6. Click **"New query"**

### Option 2: Direct SQL Editor Link
Try this link (you may need to be logged in first):
https://supabase.com/dashboard/project/wmhkfuxjipemqnoorcgy/sql/new

### Option 3: Manual Navigation
1. Go to https://supabase.com/dashboard
2. Log in if needed
3. Click on your project
4. Navigate to: **SQL Editor** → **New query**

## Running the Schema

1. Open the SQL Editor (using any option above)
2. Copy the **entire contents** of `supabase-schema.sql` file
3. Paste into the SQL Editor
4. Click the **"Run"** button (or press Cmd+Enter / Ctrl+Enter)
5. Wait for it to complete (may take 1-2 minutes)

## Verification

After running, you should see:
- ✅ All tables created successfully
- ✅ Extensions enabled (uuid-ossp, pgvector)
- ✅ Indexes created
- ✅ RLS policies enabled

## Troubleshooting

If you get "project doesn't exist":
- Make sure you're logged into the correct Supabase account
- Check that the project reference `wmhkfuxjipemqnoorcgy` matches your project
- Try accessing via the main dashboard first: https://supabase.com/dashboard

