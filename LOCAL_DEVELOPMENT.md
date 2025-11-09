# Local Development Guide

This guide explains how to run the Navi AI application locally using mock data, without requiring Supabase or other external services.

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the setup script:
```bash
npm run setup:local
```

This will:
- Create `.env.local` with mock data configuration
- Install dependencies if needed
- Display instructions for starting the server

### Option 2: Manual Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Environment File**
   Create a `.env.local` file in the root directory with:
   ```env
   NEXT_PUBLIC_USE_MOCK_DATA=true
   NEXT_PUBLIC_PUBLISH_BASE_DOMAIN=naviai.local
   ```

3. **Test the Mock Setup** (Optional)
   ```bash
   npm run test:mock-setup
   ```
   This verifies that the mock data is working correctly.

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Open [http://localhost:3000](http://localhost:3000)
   - The app will use mock data automatically

## Mock Data

The application includes pre-configured mock data:

- **Mock User ID**: `mock-user-123`
- **Mock Website**: Bella's Bakery (a sample bakery website)
- **Mock Domain**: `bellas-bakery.naviai.local`

### Sample Website Data

The mock website includes:
- Home page with hero section, features, text content, image gallery, and contact form
- Menu page with pricing information
- Sticky footer with phone CTA
- Complete theme with color palette and fonts

## How It Works

### Automatic Mock Mode

The application automatically switches to mock mode when:
1. `NEXT_PUBLIC_USE_MOCK_DATA=true` is set, OR
2. Supabase environment variables are not configured

### Mock Components

- **Mock Supabase Client** (`src/lib/mock-supabase.ts`): Provides in-memory database simulation
- **Mock Data Layer** (`libs/website-builder/src/mock-data-layer.ts`): Replaces database calls with in-memory storage
- **Mock Data** (`libs/website-builder/src/mock-data.ts`): Contains sample website data

## Testing API Endpoints

When running in mock mode, you can test API endpoints:

### Get Website Data
```bash
curl http://localhost:3000/api/website/me \
  -H "x-user-id: mock-user-123"
```

### Save Website
```bash
curl -X POST http://localhost:3000/api/website/save \
  -H "x-user-id: mock-user-123" \
  -H "Content-Type: application/json" \
  -d '{"website": {...}}'
```

### Publish Website
```bash
curl -X POST http://localhost:3000/api/website/publish \
  -H "x-user-id: mock-user-123"
```

## Customizing Mock Data

To customize the mock data:

1. Edit `libs/website-builder/src/mock-data.ts`
2. Modify the `mockWebsite` object with your desired data
3. Add more users to `MockWebsiteStore` if needed

## Switching to Production Mode

To use real Supabase:

1. Set up Supabase project
2. Create `.env.local` with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_USE_MOCK_DATA=false
   ```

## Limitations

When using mock mode:
- Data is stored in-memory and will be lost on server restart
- No authentication is required (use `x-user-id` header for API calls)
- OpenAI API calls are not mocked (set `OPENAI_API_KEY` if you need AI features)
- External services (Twilio, Resend) are not available

## Troubleshooting

### Issue: "Failed to fetch website"
- Make sure you're using the correct user ID: `mock-user-123`
- Check that `NEXT_PUBLIC_USE_MOCK_DATA=true` is set

### Issue: Environment variables not loading
- Make sure `.env.local` is in the root directory
- Restart the development server after changing environment variables

### Issue: Mock data not working
- Check the console for "🔧 Using mock Supabase client for local development" message
- Verify that Supabase environment variables are not set or `NEXT_PUBLIC_USE_MOCK_DATA=true`

